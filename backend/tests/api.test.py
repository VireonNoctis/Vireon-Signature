#!/usr/bin/env python3
"""Black-box API and RocksDB persistence tests for the C++ service."""

from __future__ import annotations

import http.cookiejar
import json
import os
import pathlib
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request


BINARY = pathlib.Path(__file__).resolve().parents[1] / "build" / "signature-api"


def available_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class SignatureApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not BINARY.exists():
            raise RuntimeError("Build backend first with cmake --build backend/build")

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name)
        self.web = self.root / "web"
        self.web.mkdir()
        (self.web / "index.html").write_text("<main>Signature test</main>", encoding="utf-8")
        (self.web / "service-worker.js").write_text("self.skipWaiting()", encoding="utf-8")
        self.port = available_port()
        self.origin = f"http://127.0.0.1:{self.port}"
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        environment = os.environ.copy()
        environment.update({
            "PORT": str(self.port),
            "COOKIE_SECURE": "false",
            "DATA_DIR": str(self.root / "db"),
            "WEB_ROOT": str(self.web),
            "APP_ORIGIN": self.origin,
        })
        self.process = subprocess.Popen(
            [str(BINARY)], env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
        )
        self.wait_for_server()

    def tearDown(self) -> None:
        self.process.terminate()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait(timeout=5)
        self.temp.cleanup()

    def wait_for_server(self) -> None:
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                error = self.process.stderr.read().decode("utf-8", errors="replace")
                self.fail(f"Server exited during startup: {error}")
            try:
                with socket.create_connection(("127.0.0.1", self.port), timeout=0.2):
                    return
            except OSError:
                time.sleep(0.05)
        self.fail("Server did not start in time")

    def request(self, path: str, method: str = "GET", payload: dict | None = None,
                headers: dict | None = None) -> tuple[int, dict | str, dict]:
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        request_headers = {"Origin": self.origin, **(headers or {})}
        request = urllib.request.Request(
            self.origin + path, data=data, headers=request_headers, method=method
        )
        try:
            response = self.opener.open(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read().decode("utf-8")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = raw
        return response.status, body, {key.lower(): value for key, value in response.headers.items()}

    def test_health_and_static_shell(self) -> None:
        status, body, _ = self.request("/api/health")
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        status, html, headers = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn("Signature test", html)
        self.assertIn("text/html", headers.get("content-type", ""))

    def test_session_cookie_and_csrf_protected_team_storage(self) -> None:
        status, body, headers = self.request("/api/session")
        self.assertEqual(status, 200)
        self.assertTrue(body["ok"])
        cookies = {cookie.name: cookie for cookie in self.cookies}
        self.assertIn("vireon_workspace", cookies)
        self.assertIn("vireon_signature_csrf", cookies)
        self.assertIn("HttpOnly", cookies["vireon_workspace"]._rest)
        self.assertEqual(cookies["vireon_workspace"].path, "/")
        self.assertEqual(cookies["vireon_workspace"]._rest.get("SameSite"), "Lax")

        status, error, _ = self.request("/api/team", method="PUT", payload={"profiles": [], "presets": []})
        self.assertEqual(status, 403)
        self.assertIn("security token", error["error"].lower())

        csrf = cookies["vireon_signature_csrf"].value
        team = {
            "profiles": [{
                "id": "employee-1", "name": "Test User", "presetId": "",
                "config": {"name": "Test User", "email": "test@example.com", "role": "Engineer"}
            }],
            "presets": []
        }
        status, saved, _ = self.request(
            "/api/team", method="PUT", payload=team, headers={"X-CSRF-Token": csrf}
        )
        self.assertEqual(status, 200, saved)
        self.assertTrue(saved["ok"])
        status, restored, _ = self.request("/api/team")
        self.assertEqual(status, 200)
        self.assertEqual(restored["profiles"][0]["config"]["email"], "test@example.com")
        self.assertNotIn("unexpected", restored["profiles"][0]["config"])

    def test_rejects_cross_origin_writes(self) -> None:
        self.request("/api/session")
        csrf = next(cookie.value for cookie in self.cookies if cookie.name == "vireon_signature_csrf")
        status, error, _ = self.request(
            "/api/team", method="PUT", payload={"profiles": [], "presets": []},
            headers={"X-CSRF-Token": csrf, "Origin": "https://attacker.invalid"}
        )
        self.assertEqual(status, 403)
        self.assertIn("origin", error["error"].lower())

    def test_team_data_persists_after_server_restart(self) -> None:
        self.request("/api/session")
        csrf = next(cookie.value for cookie in self.cookies if cookie.name == "vireon_signature_csrf")
        team = {
            "profiles": [{
                "id": "persistent-employee", "name": "Persistent",
                "config": {"name": "Persistent", "company": "Vireon"}
            }],
            "presets": []
        }
        status, _, _ = self.request(
            "/api/team", method="PUT", payload=team, headers={"X-CSRF-Token": csrf}
        )
        self.assertEqual(status, 200)

        self.process.terminate()
        self.process.wait(timeout=5)
        environment = os.environ.copy()
        environment.update({
            "PORT": str(self.port), "COOKIE_SECURE": "false",
            "DATA_DIR": str(self.root / "db"), "WEB_ROOT": str(self.web),
            "APP_ORIGIN": self.origin
        })
        self.process = subprocess.Popen(
            [str(BINARY)], env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
        )
        self.wait_for_server()
        status, restored, _ = self.request("/api/team")
        self.assertEqual(status, 200)
        self.assertEqual(restored["profiles"][0]["id"], "persistent-employee")


if __name__ == "__main__":
    unittest.main(verbosity=2)
