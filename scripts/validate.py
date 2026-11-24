#!/usr/bin/env python3
"""Validate project configuration and pinned GitHub Actions."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_FILES = (
    "package.json",
    ".devcontainer/devcontainer.json",
    ".vscode/extensions.json",
    ".vscode/settings.json",
)
WORKFLOW_DIR = Path(".github/workflows")
SOURCE_DIR = Path("src")
ACTION_REFERENCE = re.compile(r"^[0-9a-fA-F]{40}$")


def validate_json_files() -> list[str]:
    errors: list[str] = []
    for relative_path in CONFIG_FILES:
        path = ROOT / relative_path
        if not path.exists():
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"{relative_path}: invalid JSON ({exc})")
    return errors


def validate_action_pins() -> list[str]:
    errors: list[str] = []
    workflow_root = ROOT / WORKFLOW_DIR
    if not workflow_root.exists():
        return errors
    for path in sorted((*workflow_root.rglob("*.yml"), *workflow_root.rglob("*.yaml"))):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: cannot read workflow ({exc})")
            continue
        for line_number, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped.startswith("uses:"):
                continue
            reference = stripped.split(":", 1)[1].split("#", 1)[0].strip().strip("'\"")
            if reference.startswith(("./", "docker://")):
                continue
            if "@" not in reference:
                errors.append(f"{path.relative_to(ROOT)}:{line_number}: Action reference is not pinned: {reference}")
                continue
            revision = reference.rsplit("@", 1)[1]
            if not ACTION_REFERENCE.fullmatch(revision):
                errors.append(f"{path.relative_to(ROOT)}:{line_number}: Action must use a full 40-character SHA: {reference}")
    return errors


def validate_product_contracts() -> list[str]:
    errors: list[str] = []
    required = (
        "backend/src/main.cpp",
        "backend/CMakeLists.txt",
        "backend/tests/api.test.py",
        "src/features/signature-studio/domain/teamData.js",
        "src/features/signature-studio/hooks/useTeamWorkspace.js",
        "src/features/signature-studio/hooks/usePwaInstall.js",
        "public/service-worker.js",
        "public/site.webmanifest",
        "playwright.config.js",
        "tests/email-client/compatibility.spec.js",
    )
    for relative_path in required:
        if not (ROOT / relative_path).is_file():
            errors.append(f"{relative_path}: required project file is missing")

    legacy_draft = ROOT / "src/features/signature-studio/hooks/useSignatureDraft.js"
    if legacy_draft.exists():
        errors.append("useSignatureDraft.js: remove the localStorage-only draft store")

    for path in (ROOT / SOURCE_DIR).rglob("*"):
        if path.suffix not in {".js", ".jsx", ".css"}:
            continue
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: cannot read source ({exc})")
            continue
        if "localStorage" in source:
            errors.append(f"{path.relative_to(ROOT)}: application source must use the workspace API, not localStorage")

    tokens = ROOT / "src/styles/tokens.css"
    if tokens.exists():
        source = tokens.read_text(encoding="utf-8")
        if ".ttf" not in source or "fonts.googleapis.com" in source:
            errors.append("tokens.css: load the Geist TTF assets without Google Fonts")

    manifest = ROOT / "public/site.webmanifest"
    if manifest.exists():
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            if data.get("display") != "standalone" or not data.get("start_url") or not data.get("icons"):
                errors.append("site.webmanifest: standalone installation metadata is incomplete")
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            errors.append(f"site.webmanifest: invalid manifest ({exc})")

    package = ROOT / "package.json"
    if package.exists():
        try:
            scripts = json.loads(package.read_text(encoding="utf-8")).get("scripts", {})
            for name in ("test:backend", "test:email"):
                if name not in scripts:
                    errors.append(f"package.json: missing {name} validation script")
        except (OSError, UnicodeError, json.JSONDecodeError):
            pass

    return errors


def main() -> int:
    errors = validate_json_files() + validate_action_pins() + validate_product_contracts()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print("Project configuration checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
