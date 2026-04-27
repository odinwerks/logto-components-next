# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-01-27

### Added
- Full demo app at `/demo` with 11 documentation tabs
- Protected Actions API for RBAC-gated server actions
- `<Protected />` client component for UI-level permission gating
- `OrgSwitcher` component for organization selection
- Session management with device metadata and IP geolocation
- Avatar upload via drag-and-drop with S3-compatible storage
- MFA management with TOTP enrollment and backup codes
- Theme system with file-based dark/light CSS variables
- i18n support with ENV-configured locales
- UserButton, UserBadge, and UserCard display components
- AuthWatcher component for auto-refresh on auth state changes
- Tab configuration via LOAD_TABS environment variable

### Changed
- Improved error handling with detection of stale cookie contexts
- Enhanced security with server-side token introspection

### Fixed
- Top-level await bug in custom-actions module
- Race conditions in Protected component permission loading
- WebP magic byte boundary validation
- Missing return statements in error handlers

## [0.1.0] - 2024-12-15

### Added
- Basic dashboard with user profile management
- Logto authentication integration
- User preferences persistence
- Cookie recovery mechanism

[Unreleased]: https://github.com/odinwerks/logto-components-next/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/odinwerks/logto-components-next/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/odinwerks/logto-components-next/releases/tag/v0.1.0
