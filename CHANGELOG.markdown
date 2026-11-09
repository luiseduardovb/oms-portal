# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- TASK-804: OpenAPI snapshot and types refreshed for public order tracking.
- TASK-803: OpenAPI snapshot and types refreshed for the storefront quote and checkout.
- TASK-802: OpenAPI snapshot and types refreshed for the public storefront API.
- TASK-801: "Contacto y redes" section in Setup (phone, WhatsApp, email, Instagram, Facebook, website) with checks before saving. OpenAPI snapshot and types refreshed.
- TASK-001: Local repository initialised (no commits yet).
- TASK-002: README and documentation pointer to `oms-be/docs`.
- TASK-018: Portal skeleton: Next.js 16 App Router, strict TypeScript 6.0, MUI 9 theme, next-intl (Spanish), RTK Query with an axios base query that understands the API's coded errors, OpenAPI type generation from a committed snapshot, Vitest + Testing Library, ESLint and Prettier. Landing page checks the API's `/health`.
- TASK-019: GitHub Actions workflow (`.github/workflows/ci.yml`) running Prettier, ESLint, typecheck, API-type freshness (`pnpm api:check`), Vitest and the production build on pull requests and pushes to `main`.
- TASK-109a: Session handling and app shell. Login screen, access token held in memory only, silent refresh through the httpOnly cookie (one shared refresh when several calls expire together), automatic retry after `auth.token_expired`, client-side route guard, merchant switcher, user menu with logout, permission-aware navigation, Spanish messages for every auth, server and team error code. OpenAPI snapshot and types refreshed.
- TASK-109b: Team screens (`/team`): members table with role change, suspend/reactivate and remove (with confirmation), invitation dialog with copy-link and WhatsApp sharing, pending invitations with revoke, "Equipo" sidebar item shown by team permission. Public accept-invitation page (`/accept-invitation?token=`) driven by the new invitation preview endpoint. OpenAPI snapshot and types refreshed.
- TASK-203a: Configuración screens (`/setup`): Tienda (business name, owner-only store address with confirmation, country, time zone and read-only tax), Pagos and Pedidos, with Spanish messages for the `setup.*` and `outlet.*` error codes; API snapshot and types refreshed for store setup and outlets.
- TASK-203b: Sucursales screens: outlets list with archived toggle and restore, new outlet from its name, outlet page with Datos, Horario (several intervals per day, midnight crossings, overlap checks, copy to other days), Excepciones and Alertas tabs, and a team dialog to limit a member to chosen outlets.
- TASK-407b: Pedidos screen (`/orders`), laid out like Zyda: tabs with live counts (Todos, Pendientes, Aceptados, Listos, Despachados, Completados, and Cancelados under Más), outlet selector, search by number, code, customer name or (with permission) phone, date filter (open orders always show), and rows that open in place with items, totals, address, contact (copy number, WhatsApp, hidden without the phone permission) and the status timeline. Actions: Aceptar, Marcar listo, Despachar (optional driver), Completar and Cancelar with a reason. Live updates over the event stream with a one-use ticket, reconnect with the last event id, and polling fallback; optional alert sound for new orders, remembered per device. OpenAPI snapshot and types refreshed; Spanish messages for the `orders.*` and `events.*` error codes.
