# oms-portal

Merchant portal (frontend) for the OMS platform. Companion of `oms-be`.

**Status:** scaffolding (Stage 7, M0). A Spanish landing page that checks the API's `/health`. No product screens yet.

Stack (approved): Next.js 16 (App Router) · React 19 · strict TypeScript 6.0 · Material UI 9 (one theme module) · RTK Query + axios · OpenAPI-generated types · react-hook-form + zod · next-intl (Spanish-only MVP) · pnpm 12 · Node 24 · Vitest + Testing Library · ESLint 10 + Prettier.

Project documentation lives in the backend repo (`oms-be/docs/`) as the single source of truth. See [docs/README.markdown](docs/README.markdown).

## Run locally

Needs Node 24 (`.nvmrc`) and pnpm 12 (`corepack enable` picks the pinned version).

```
pnpm install
cp .env.example .env.local      # OMS_API_URL points at oms-be (default http://127.0.0.1:8000)
pnpm dev                        # http://localhost:3000
```

Start the API from `oms-be` (`pdm run python -m app`) to see the status turn green.

```
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm test          # Vitest
pnpm build         # production build
pnpm format        # Prettier
```

## How it is organised

```
src/app/          pages (App Router)
src/api/          API access: axios + RTK Query, error envelope, generated types
src/store/        Redux store and provider
src/theme/        the single MUI theme
src/i18n/         next-intl request config (Spanish only)
src/components/   shared components and providers
messages/es.json  Spanish text, including one message per API error code
openapi/          snapshot of the backend's OpenAPI document
tests/            Vitest tests
```

## Talking to the API

The browser only calls this server at `/api/...`; `next.config.ts` forwards those requests to `OMS_API_URL`. That avoids CORS and keeps the API address out of the browser. API errors arrive as `{"detail":{"code","message","ctx"}}`; the UI shows the Spanish text for `code` (see `useErrorMessage`) and never the raw `message`. When the backend adds an error code, add its text to `messages/es.json` (a test lists the known codes).

## Generated API types

`src/api/generated/schema.d.ts` is generated from `openapi/openapi.json`, a committed snapshot of the backend's OpenAPI document. After the API changes:

```
# with the API running (OMS_SHOW_API_DOCS=true)
pnpm api:fetch      # refresh openapi/openapi.json
pnpm api:types      # regenerate src/api/generated/schema.d.ts
pnpm api:check      # fail if the committed types differ from the snapshot (CI runs this)
```

Review both diffs in the same commit.

## Dependency install scripts

pnpm 12 does not run dependency install scripts unless allowed. `pnpm-workspace.yaml` (`allowBuilds`) lists the three packages that ask to (`@parcel/watcher`, `@swc/core`, `unrs-resolver`) and denies all of them; none is needed because they ship prebuilt binaries. Review any new entry before approving it.
