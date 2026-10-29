# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- TASK-001: Local repository initialised (no commits yet).
- TASK-002: README and documentation pointer to `oms-be/docs`.
- TASK-018: Portal skeleton: Next.js 16 App Router, strict TypeScript 6.0, MUI 9 theme, next-intl (Spanish), RTK Query with an axios base query that understands the API's coded errors, OpenAPI type generation from a committed snapshot, Vitest + Testing Library, ESLint and Prettier. Landing page checks the API's `/health`.
- TASK-019: GitHub Actions workflow (`.github/workflows/ci.yml`) running Prettier, ESLint, typecheck, API-type freshness (`pnpm api:check`), Vitest and the production build on pull requests and pushes to `main`.
