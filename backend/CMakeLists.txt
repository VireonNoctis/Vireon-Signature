cmake_minimum_required(VERSION 3.20)
project(vireon_signature_api LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_path(BOOST_INCLUDE_DIR boost/asio.hpp REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_path(ROCKSDB_INCLUDE_DIR rocksdb/db.h REQUIRED)
find_library(ROCKSDB_LIBRARY NAMES rocksdb REQUIRED)

add_executable(signature-api src/main.cpp)
target_include_directories(signature-api PRIVATE
  \${BOOST_INCLUDE_DIR}
  \${ROCKSDB_INCLUDE_DIR}
)
target_compile_definitions(signature-api PRIVATE
  BOOST_ERROR_CODE_HEADER_ONLY
  BOOST_SYSTEM_NO_DEPRECATED
)
target_link_libraries(signature-api PRIVATE
  OpenSSL::Crypto
  Threads::Threads
  nlohmann_json::nlohmann_json
  \${ROCKSDB_LIBRARY}
)
target_compile_options(signature-api PRIVATE -Wall -Wextra -Wpedantic -Wconversion -Wshadow)
