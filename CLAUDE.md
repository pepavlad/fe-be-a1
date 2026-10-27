# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev          # dev server, watch mode
npm run build              # nest build (deletes dist/ first)
npm run lint               # eslint --fix over src, apps, libs, test
npm run format             # prettier --write src + test
npm test                   # unit tests (jest, rootDir=src, *.spec.ts)
npx jest path/to/file.spec.ts          # single unit test file
npx jest -t "test name"                # single test by name
npm run test:e2e           # e2e (test/jest-e2e.json, *.e2e-spec.ts)

docker compose up -d       # local Postgres (reads .env)

npm run migration:generate # diff entities -> src/database/migrations/Migration*
npm run migration:run | migration:revert | migration:show
```

## Architecture

NestJS 11 on **Fastify** (not Express). `src/main.ts` wires the adapter, `@fastify/compress`, `@fastify/cookie` (secret from `COOKIE_SECRET`), global `ValidationPipe({ whitelist: true })`, hardcoded CORS origins, and `initializeTransactionalContext()` from `typeorm-transactional`. Use Fastify plugins/types there, not Express ones.

- `src/core/*` — infrastructure modules (config, database, health, throttler, root `app/AppModule`).
- `src/modules/*` — feature modules. A new feature module must be added to the `imports` of `AppModule` manually (`AuthModule` exists but is currently not imported).
- `src/database/` — TypeORM CLI `data-source.ts` and `migrations/`.

### Config

`ConfigService` (`src/core/config/`) extends Nest's and is typed by the `Config` interface. Adding an env var requires touching **both** `config.types.ts` and the Joi schema in `config.validation.ts`; app fails at startup on invalid env. `get()` is typed to return `string` regardless of the `Config` field type, so wrap numbers in `Number(...)` and booleans in `String(...) === 'true'`, as existing code does.

### Database

- Two separate DataSources with duplicated settings: `core/database/database.module.ts` (runtime, from `ConfigService`) and `database/data-source.ts` (CLI, from `process.env` via dotenv). Change connection options in both.
- Entities: any `*.entity.ts` under `src/` is picked up by glob. Migrations must be named `*.migration.ts` in `src/database/migrations/` to be picked up by glob.
- `@Transactional()` works because `DatabaseModule` registers the DataSource via `addTransactionalDataSource`.
- `POSTGRES_SYNCHRONIZE` defaults false; use migrations. `POSTGRES_MIGRATIONS_RUN=true` runs pending migrations on app boot.

### Env

Required: `PORT`, `NODE_ENV` (`development|production`), `COOKIE_SECRET`, `POSTGRES_{HOST,PORT,USER,PASSWORD,DB}`. Optional: `HEALTH_CHECK_ENABLED`, `THROTTLE_GLOBAL_TTL/LIMIT`, `POSTGRES_{SYNCHRONIZE,LOGGING,MIGRATIONS_RUN}`. `.env` is gitignored; copy `.env.example` to `.env` to start.

## Conventions and gotchas

- Import via `@/` alias (`@/core/config/config.service`); it is the only alias in `tsconfig.json`. README mentions `@config/...` — that alias does not exist.
- Jest config in `package.json` has no `moduleNameMapper` for `@/`, but source files (e.g. `health.controller.ts`) import via `@/...` and are pulled in by specs. Likely breaks unit tests (not verified — deps not installed when this was written); add `"moduleNameMapper": {"^@/(.*)$": "<rootDir>/$1"}` if so.
- Run `npm install` first; `node_modules` is not committed.
- Per-module docs live in `README.MD` files next to the code (`core/config`, `core/health`).
