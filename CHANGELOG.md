# Changelog

Notable changes to this project are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Standalone Vue 3 + TypeScript Signature Studio application.
- Animated WebGL2 atmosphere and Pretext Canvas headline.
- Table-based email signature renderer with HTML, rich clipboard and plain-text exports.
- Browser-local draft persistence and validated draft restoration.
- Domain regression tests, repository validation, CI and GitHub Pages deployment.

### Changed

- Extracted the signature feature from the Vireon Noctis portfolio into its own repository.
- Grouped feature UI, composables, domain logic and styles under `src/features/signature-studio/`.
- Replaced portfolio-specific dependencies and global styles with a focused Vue entry and shared tokens.

### Fixed

- Prevent malformed local draft data from restoring unknown fields or invalid layout, theme and colour values.
- Persist the reset draft consistently instead of allowing a previous draft to reappear.
