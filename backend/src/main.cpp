#include <boost/asio.hpp>
#include <boost/asio/post.hpp>
#include <boost/asio/thread_pool.hpp>
#include <boost/beast.hpp>
#include <nlohmann/json.hpp>
#include <rocksdb/db.h>
#include <openssl/crypto.h>
#include <openssl/rand.h>
#include <openssl/sha.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <cstdlib>
#include <stdexcept>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <memory>
#include <set>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

namespace asio = boost::asio;
namespace beast = boost::beast;
namespace http = beast::http;
using tcp = asio::ip::tcp;
using json = nlohmann::json;

namespace {

struct Settings {
  unsigned short port = 8080;
  bool secure_cookies = true;
  std::filesystem::path data_dir = "./data";
  std::filesystem::path web_root = "./dist";
  std::string app_origin;
};

std::string env(const char* name, const std::string& fallback = "") {
  const char* value = std::getenv(name);
  return value && *value ? value : fallback;
}

Settings load_settings() {
  Settings settings;
  const auto port_value = env("PORT", "8080");
  try {
    const auto parsed = std::stoul(port_value);
    if (parsed < 1 || parsed > 65535) throw std::out_of_range("port");
    settings.port = static_cast<unsigned short>(parsed);
  } catch (...) {
    throw std::runtime_error("PORT must be an integer between 1 and 65535");
  }

  const auto secure = env("COOKIE_SECURE", "true");
  settings.secure_cookies = secure != "false" && secure != "0";
  settings.data_dir = env("DATA_DIR", "./data");
  settings.web_root = env("WEB_ROOT", "./dist");
  settings.app_origin = env("APP_ORIGIN");
  return settings;
}

std::string random_hex(std::size_t byte_count = 32) {
  std::vector<unsigned char> bytes(byte_count);
  if (RAND_bytes(bytes.data(), static_cast<int>(bytes.size())) != 1) {
    throw std::runtime_error("Secure random generation failed");
  }
  static constexpr char digits[] = "0123456789abcdef";
  std::string output;
  output.reserve(bytes.size() * 2);
  for (const auto byte : bytes) {
    output.push_back(digits[byte >> 4]);
    output.push_back(digits[byte & 0x0f]);
  }
  return output;
}

std::string sha256_hex(const std::string& input) {
  std::array<unsigned char, SHA256_DIGEST_LENGTH> digest{};
  SHA256(reinterpret_cast<const unsigned char*>(input.data()), input.size(), digest.data());
  static constexpr char digits[] = "0123456789abcdef";
  std::string output;
  output.reserve(digest.size() * 2);
  for (const auto byte : digest) {
    output.push_back(digits[byte >> 4]);
    output.push_back(digits[byte & 0x0f]);
  }
  return output;
}

bool is_hex_token(const std::string& value) {
  return value.size() == 64 && std::all_of(value.begin(), value.end(), [](unsigned char character) {
    return std::isxdigit(character) != 0;
  });
}

bool constant_time_equal(const std::string& left, const std::string& right) {
  return left.size() == right.size() &&
         CRYPTO_memcmp(left.data(), right.data(), left.size()) == 0;
}

std::string trim(std::string value) {
  const auto first = value.find_first_not_of(" \t\r\n");
  if (first == std::string::npos) return {};
  const auto last = value.find_last_not_of(" \t\r\n");
  return value.substr(first, last - first + 1);
}

std::string cookie_value(const http::request<http::string_body>& request, const std::string& name) {
  const auto header = request.find(http::field::cookie);
  if (header == request.end()) return {};
  std::istringstream stream(std::string(header->value().data(), header->value().size()));
  std::string part;
  const std::string prefix = name + "=";
  while (std::getline(stream, part, ';')) {
    part = trim(part);
    if (part.rfind(prefix, 0) == 0) return part.substr(prefix.size());
  }
  return {};
}

std::string origin_for_request(const http::request<http::string_body>& request,
                               const Settings& settings) {
  if (!settings.app_origin.empty()) {
    std::string origin = settings.app_origin;
    while (!origin.empty() && origin.back() == '/') origin.pop_back();
    return origin;
  }
  const auto host_header = request.find(http::field::host);
  if (host_header == request.end()) return {};
  auto scheme = env("FORWARDED_PROTO", settings.secure_cookies ? "https" : "http");
  const auto forwarded = request.find("X-Forwarded-Proto");
  if (forwarded != request.end()) scheme = std::string(forwarded->value().data(), forwarded->value().size());
  if (scheme != "http" && scheme != "https") return {};
  return scheme + "://" + std::string(host_header->value().data(), host_header->value().size());
}

bool same_origin(const http::request<http::string_body>& request, const Settings& settings) {
  const auto origin_header = request.find(http::field::origin);
  if (origin_header == request.end()) return false;
  std::string origin = std::string(origin_header->value().data(), origin_header->value().size());
  while (!origin.empty() && origin.back() == '/') origin.pop_back();
  const auto expected = origin_for_request(request, settings);
  return !expected.empty() && constant_time_equal(origin, expected);
}

std::string csrf_cookie(const Settings& settings, const std::string& token) {
  return "vireon_signature_csrf=" + token +
         "; Path=/; Max-Age=2592000; SameSite=Lax" +
         (settings.secure_cookies ? "; Secure" : "");
}

std::string session_cookie(const Settings& settings, const std::string& token) {
  return "vireon_workspace=" + token +
         "; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax" +
         (settings.secure_cookies ? "; Secure" : "");
}

json default_config() {
  return {
    {"name", ""}, {"role", ""}, {"company", ""}, {"email", ""}, {"phone", ""},
    {"website", ""}, {"location", ""}, {"tagline", ""}, {"logoUrl", ""},
    {"portraitUrl", ""}, {"linkedinUrl", ""}, {"instagramUrl", ""}, {"xUrl", ""},
    {"ctaLabel", ""}, {"ctaUrl", ""}, {"styleId", "liquid-glass"},
    {"customAccent", "#d9d9d9"}, {"customBackground", "#111111"},
    {"customForeground", "#f4f4f4"}, {"customMuted", "#a5a5a5"},
    {"customBorder", "#4b4b4b"}, {"layout", "portrait"},
    {"fontFamily", "Arial"}, {"fontScale", 100}, {"signatureSpacing", "balanced"}, {"signatureMotion", "draw"},
    {"showCompany", true}, {"showPhone", true}, {"showLocation", true}, {"showSocials", true}
  };
}

bool valid_color(const std::string& value) {
  if (value.size() != 7 || value.front() != '#') return false;
  return std::all_of(value.begin() + 1, value.end(), [](unsigned char character) {
    return std::isxdigit(character) != 0;
  });
}

json sanitize_config(const json& source) {
  if (!source.is_object()) throw std::runtime_error("Each signature config must be an object.");
  auto config = default_config();

  const std::set<std::string> string_keys = {
    "name", "role", "company", "email", "phone", "website", "location", "tagline",
    "logoUrl", "portraitUrl", "linkedinUrl", "instagramUrl", "xUrl", "ctaLabel", "ctaUrl",
    "styleId", "customAccent", "customBackground", "customForeground", "customMuted",
    "customBorder", "layout", "fontFamily", "signatureSpacing", "signatureMotion"
  };
  for (const auto& key : string_keys) {
    const auto item = source.find(key);
    if (item == source.end() || !item->is_string()) continue;
    auto value = item->get<std::string>();
    const std::size_t limit = key == "tagline" ? 120 :
      (key == "name" || key == "role" || key == "company" ? 80 : 180);
    if (value.size() > limit) value.resize(limit);
    if (key.rfind("custom", 0) == 0 && !valid_color(value)) continue;
    config[key] = value;
  }

  const auto scale = source.find("fontScale");
  if (scale != source.end() && scale->is_number_integer()) {
    config["fontScale"] = std::max(80, std::min(125, scale->get<int>()));
  }
  const std::set<std::string> fonts = {
    "Arial", "Helvetica", "Verdana", "Georgia", "Tahoma", "Trebuchet MS", "Courier New"
  };
  if (!fonts.count(config["fontFamily"].get<std::string>())) config["fontFamily"] = "Arial";
  const auto spacing = config["signatureSpacing"].get<std::string>();
  if (spacing != "compact" && spacing != "balanced" && spacing != "spacious") config["signatureSpacing"] = "balanced";
  const auto motion = config["signatureMotion"].get<std::string>();
  if (motion != "draw" && motion != "lift" && motion != "fade" && motion != "none") config["signatureMotion"] = "draw";

  const std::set<std::string> styles = {
    "liquid-glass", "sakura-glass", "obsidian", "frost", "aurora", "chrome",
    "editorial", "midnight", "monochrome", "holographic", "custom"
  };
  if (!styles.count(config["styleId"].get<std::string>())) config["styleId"] = "liquid-glass";
  const auto layout = config["layout"].get<std::string>();
  if (layout != "portrait" && layout != "brand" && layout != "minimal") config["layout"] = "portrait";

  for (const auto& key : {"showCompany", "showPhone", "showLocation", "showSocials"}) {
    const auto item = source.find(key);
    if (item != source.end() && item->is_boolean()) config[key] = *item;
  }
  return config;
}

std::string safe_id(const json& value, const std::string& prefix) {
  if (value.is_string()) {
    const auto id = value.get<std::string>();
    if (!id.empty() && id.size() <= 80 &&
        std::all_of(id.begin(), id.end(), [](unsigned char character) {
          return std::isalnum(character) || character == '-' || character == '_' || character == '.';
        })) return id;
  }
  return prefix + "-" + random_hex(8);
}

std::string safe_name(const json& value, const std::string& fallback) {
  if (!value.is_string()) return fallback;
  auto name = trim(value.get<std::string>());
  if (name.size() > 80) name.resize(80);
  return name.empty() ? fallback : name;
}

json sanitize_team(const json& payload) {
  if (!payload.is_object()) throw std::runtime_error("Team data must be a JSON object.");
  const auto profiles_source = payload.value("profiles", json::array());
  const auto presets_source = payload.value("presets", json::array());
  if (!profiles_source.is_array() || !presets_source.is_array()) {
    throw std::runtime_error("Profiles and presets must be arrays.");
  }
  if (profiles_source.size() > 500 || presets_source.size() > 50) {
    throw std::runtime_error("A workspace supports up to 500 employees and 50 brand presets.");
  }

  json output = {{"profiles", json::array()}, {"presets", json::array()}};
  std::set<std::string> profile_ids;
  for (const auto& item : profiles_source) {
    if (!item.is_object()) throw std::runtime_error("An employee profile is invalid.");
    const auto config_source = item.value("config", item);
    auto config = sanitize_config(config_source);
    const auto id = safe_id(item.value("id", json()), "employee");
    if (!profile_ids.insert(id).second) throw std::runtime_error("Employee profile IDs must be unique.");
    const auto name = safe_name(item.value("name", json(config["name"])), "Untitled employee");
    if (config["name"].get<std::string>().empty()) config["name"] = name;
    const auto preset_id = item.value("presetId", json(""));
    output["profiles"].push_back({
      {"id", id}, {"name", name},
      {"presetId", preset_id.is_string() ? preset_id.get<std::string>().substr(0, 80) : ""},
      {"config", config}
    });
  }

  std::set<std::string> preset_ids;
  for (const auto& item : presets_source) {
    if (!item.is_object()) throw std::runtime_error("A brand preset is invalid.");
    const auto id = safe_id(item.value("id", json()), "brand");
    if (!preset_ids.insert(id).second) throw std::runtime_error("Brand preset IDs must be unique.");
    const auto name = safe_name(item.value("name", json()), "Brand preset");
    output["presets"].push_back({
      {"id", id}, {"name", name}, {"config", sanitize_config(item.value("config", json::object()))}
    });
  }
  return output;
}

std::string mime_type(const std::filesystem::path& path) {
  const auto extension = path.extension().string();
  if (extension == ".html") return "text/html; charset=utf-8";
  if (extension == ".js" || extension == ".mjs") return "text/javascript; charset=utf-8";
  if (extension == ".css") return "text/css; charset=utf-8";
  if (extension == ".svg") return "image/svg+xml";
  if (extension == ".webmanifest") return "application/manifest+json";
  if (extension == ".ttf") return "font/ttf";
  if (extension == ".png") return "image/png";
  if (extension == ".jpg" || extension == ".jpeg") return "image/jpeg";
  if (extension == ".ico") return "image/x-icon";
  if (extension == ".json") return "application/json";
  if (extension == ".txt") return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

http::response<http::string_body> make_response(
  const http::request<http::string_body>& request,
  http::status status,
  const std::string& body,
  const std::string& content_type = "application/json; charset=utf-8") {
  http::response<http::string_body> response{status, request.version()};
  response.set(http::field::server, "Vireon Signature");
  response.set(http::field::content_type, content_type);
  response.set(http::field::cache_control, "no-store");
  response.set("X-Content-Type-Options", "nosniff");
  response.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.set("X-Frame-Options", "SAMEORIGIN");
  response.set("Content-Security-Policy",
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self'; connect-src 'self'; font-src 'self' https://cdn.jsdelivr.net data:; "
    "frame-src 'self' about:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
  response.keep_alive(false);
  response.body() = body;
  response.prepare_payload();
  return response;
}

http::response<http::string_body> json_error(
  const http::request<http::string_body>& request, http::status status, const std::string& message) {
  return make_response(request, status, json{{"error", message}}.dump());
}

bool path_is_within(const std::filesystem::path& root, const std::filesystem::path& file) {
  const auto relative = file.lexically_relative(root);
  if (relative.empty()) return file == root;
  return *relative.begin() != "..";
}

http::response<http::string_body> serve_static(
  const http::request<http::string_body>& request, const std::filesystem::path& root) {
  auto target = std::string(request.target().data(), request.target().size());
  const auto query = target.find('?');
  if (query != std::string::npos) target.resize(query);
  if (target.empty() || target.front() != '/' ||
      target.find('\\') != std::string::npos || target.find('%') != std::string::npos ||
      target.find('\0') != std::string::npos) {
    return json_error(request, http::status::bad_request, "Invalid path.");
  }

  auto relative = target == "/" ? std::filesystem::path("index.html") : std::filesystem::path(target.substr(1));
  std::error_code error;
  auto file = std::filesystem::weakly_canonical(root / relative, error);
  if (error || !path_is_within(root, file)) return json_error(request, http::status::forbidden, "Invalid path.");
  if (std::filesystem::is_directory(file, error)) file /= "index.html";
  file = std::filesystem::weakly_canonical(file, error);
  if (error || !path_is_within(root, file)) return json_error(request, http::status::forbidden, "Invalid path.");

  if (!std::filesystem::exists(file, error) || error || !std::filesystem::is_regular_file(file, error)) {
    const auto accept = request.find(http::field::accept);
    if (request.method() == http::verb::get && accept != request.end() &&
        std::string(accept->value().data(), accept->value().size()).find("text/html") != std::string::npos) {
      file = root / "index.html";
    } else {
      return json_error(request, http::status::not_found, "The requested file was not found.");
    }
  }

  std::ifstream stream(file, std::ios::binary);
  if (!stream) return json_error(request, http::status::not_found, "The requested file was not found.");
  std::ostringstream content;
  content << stream.rdbuf();
  auto response = make_response(request, http::status::ok, content.str(), mime_type(file));
  if (file.filename() == "index.html" || file.filename() == "service-worker.js" ||
      file.extension() == ".webmanifest") {
    response.set(http::field::cache_control, "no-cache");
  } else {
    response.set(http::field::cache_control, "public, max-age=3600");
  }
  if (request.method() == http::verb::head) response.body().clear();
  response.prepare_payload();
  return response;
}

http::response<http::string_body> handle_request(
  const http::request<http::string_body>& request,
  rocksdb::DB* database,
  const Settings& settings,
  const std::filesystem::path& web_root) {
  const auto target = std::string(request.target().data(), request.target().size());
  const auto query = target.find('?');
  const auto path = target.substr(0, query);

  if (path == "/api/health" && request.method() == http::verb::get) {
    return make_response(request, http::status::ok, R"({"ok":true,"service":"vireon-signature"})");
  }

  if (path == "/api/session" && request.method() == http::verb::get) {
    auto session = cookie_value(request, "vireon_workspace");
    auto csrf = cookie_value(request, "vireon_signature_csrf");
    auto response = make_response(request, http::status::ok, R"({"ok":true})");
    if (!is_hex_token(session)) {
      session = random_hex();
      response.insert(http::field::set_cookie, session_cookie(settings, session));
    }
    if (!is_hex_token(csrf)) {
      csrf = random_hex();
      response.insert(http::field::set_cookie, csrf_cookie(settings, csrf));
    }
    return response;
  }

  if (path == "/api/team" && request.method() == http::verb::get) {
    const auto session = cookie_value(request, "vireon_workspace");
    if (!is_hex_token(session)) return json_error(request, http::status::unauthorized, "Workspace session missing.");
    std::string value;
    const auto status = database->Get(rocksdb::ReadOptions(), "team:" + sha256_hex(session), &value);
    if (status.IsNotFound()) {
      return make_response(request, http::status::ok, R"({"profiles":[],"presets":[]})");
    }
    if (!status.ok()) return json_error(request, http::status::internal_server_error, "Workspace could not be read.");
    return make_response(request, http::status::ok, value);
  }

  if (path == "/api/team" && request.method() == http::verb::put) {
    const auto session = cookie_value(request, "vireon_workspace");
    const auto csrf_cookie_value = cookie_value(request, "vireon_signature_csrf");
    const auto csrf_header = request.find("X-CSRF-Token");
    if (!is_hex_token(session)) return json_error(request, http::status::unauthorized, "Workspace session missing.");
    if (!is_hex_token(csrf_cookie_value) || csrf_header == request.end() ||
        !constant_time_equal(csrf_cookie_value, std::string(csrf_header->value().data(), csrf_header->value().size()))) {
      return json_error(request, http::status::forbidden, "The security token is missing or invalid.");
    }
    if (!same_origin(request, settings)) {
      return json_error(request, http::status::forbidden, "The request origin is not allowed.");
    }
    if (request.body().size() > 1024 * 1024) {
      return json_error(request, http::status::payload_too_large, "Team data exceeds the 1 MB limit.");
    }
    try {
      const auto input = json::parse(request.body());
      const auto team = sanitize_team(input);
      const auto status = database->Put(rocksdb::WriteOptions(), "team:" + sha256_hex(session), team.dump());
      if (!status.ok()) return json_error(request, http::status::internal_server_error, "Workspace could not be saved.");
      return make_response(request, http::status::ok, R"({"ok":true})");
    } catch (const nlohmann::json::exception&) {
      return json_error(request, http::status::bad_request, "The team data is not valid JSON.");
    } catch (const std::exception& error) {
      return json_error(request, http::status::bad_request, error.what());
    }
  }

  if (path.rfind("/api/", 0) == 0) {
    return json_error(request, http::status::not_found, "API endpoint not found.");
  }
  if (request.method() != http::verb::get && request.method() != http::verb::head) {
    return json_error(request, http::status::method_not_allowed, "Method not allowed.");
  }
  return serve_static(request, web_root);
}

void serve_connection(tcp::socket socket, rocksdb::DB* database,
                      const Settings& settings, const std::filesystem::path& web_root) {
  beast::error_code error;
  beast::flat_buffer buffer;
  while (!error) {
    http::request_parser<http::string_body> parser;
    parser.body_limit(1024 * 1024);
    http::read(socket, buffer, parser, error);
    if (error == http::error::end_of_stream || error == asio::error::eof) break;
    if (error) break;
    auto request = parser.release();
    auto response = handle_request(request, database, settings, web_root);
    const bool keep_alive = response.keep_alive();
    http::write(socket, response, error);
    if (error || !keep_alive) break;
  }
  socket.shutdown(tcp::socket::shutdown_send, error);
}

} // namespace

int main() {
  try {
    const auto settings = load_settings();
    std::filesystem::create_directories(settings.data_dir);
    const auto root = std::filesystem::canonical(settings.web_root);
    rocksdb::DB* raw_database = nullptr;
    rocksdb::Options options;
    options.create_if_missing = true;
    options.IncreaseParallelism();
    options.OptimizeLevelStyleCompaction();
    const auto database_status = rocksdb::DB::Open(options, settings.data_dir.string() + "/signature.rocksdb", &raw_database);
    if (!database_status.ok()) throw std::runtime_error("Could not open RocksDB: " + database_status.ToString());
    std::unique_ptr<rocksdb::DB> database(raw_database);

    asio::io_context context{1};
    asio::thread_pool workers{8};
    tcp::acceptor acceptor{context, tcp::endpoint{tcp::v4(), settings.port}};
    std::cout << "Vireon Signature API listening on port " << settings.port << std::endl;
    for (;;) {
      beast::error_code error;
      tcp::socket socket{context};
      acceptor.accept(socket, error);
      if (error) {
        std::cerr << "Connection accept failed." << std::endl;
        continue;
      }
      asio::post(workers, [socket = std::move(socket), database_ptr = database.get(), &settings, &root]() mutable {
        serve_connection(std::move(socket), database_ptr, settings, root);
      });
    }
  } catch (const std::exception& error) {
    std::cerr << "Startup failed: " << error.what() << std::endl;
    return 1;
  }
  return 0;
}
