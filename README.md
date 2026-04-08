# LI42526

Monorepo for the `Sistema de Gestao para as Oficinas Gengis Khan` project.

## Workspace Layout

- `apps/api`: Fastify modular monolith backend.
- `apps/web`: React SPA frontend built with Vite.
- `packages/contracts`: Shared Zod schemas, enums, and API contracts.
- `packages/tooling-typescript`: Shared TypeScript configuration.
- `packages/tooling-eslint`: Shared ESLint flat-config helpers.
- `docs`: Architecture notes, ADRs, setup docs, and OpenAPI artifacts.
- `supabase`: Local-only developer database stack managed with Supabase CLI.

## Local Development

This repository supports two local flows:

1. Run Supabase locally for PostgreSQL, then start `api` and `web` on the host with pnpm.
2. Run Supabase locally for PostgreSQL, then start `api` and `web` in containers with Docker Compose.

Supabase is local-development infrastructure only. Production targets plain PostgreSQL 16.

## Initial Commands

```bash
pnpm install
pnpm dev
```

See `docs/setup/local-development.md` for the expected environment variables and service boundaries.
