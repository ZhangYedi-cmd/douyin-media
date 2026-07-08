# Changelog

## v1.6.0 - 2026-04-19
- **Core Enhancements**:
  - **Intelligent TTS (Narrated Subtitles)**: Unified `add_narrated_subtitles` API for one-click script-to-video workflow.
  - **Auto-healing System**: Modernized draft generator to support `draft_info.json` (v5.9+) and automatic repair of corrupted projects.
- **MacOS Compatibility**:
  - Full path resolution for Apple Silicon and Intel Macs.
  - Integrated `avfoundation` for high-performance screen recording on macOS.
- **Ecosystem Tools**:
  - `build_cloud_music_library.py`: Automated scanning of local drafts to index used cloud assets.
  - `web_recorder.py`: Pro-grade recording engine for web-based VFX assets.
- **Bug Fixes & API Polish**:
  - Fixed `pyJianYingDraft` export issues for `Transition`, `Filter`, and `Mask`.
  - Refactored `VfxOpsMixin` to use correct segment-level API calls.
  - Improved error handling for cloud music fallbacks.

## v1.5.0 - 2026-03-04
- Security hardening:
  - sanitized draft project names and blocked path traversal/out-of-root delete.
  - restored TLS verification for SAMI TTS by default.
  - added cloud download URL/header/size guards.
- API/CLI standardization:
  - unified machine-readable `--json` output for key scripts.
  - added strict mode for validator (`--strict`).
  - centralized runtime config (`scripts/utils/config.py`).
- Quality engineering:
  - expanded unit tests for security guards.
  - added repo hygiene and data schema checks.
  - added CI lint/format/test/schema pipeline.
- Repo organization:
  - removed tracked runtime artifacts and cache binaries.
  - added compatibility wrappers and common logger utility.
