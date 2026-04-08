# Architecture Overview

The repository is organized as a pnpm and Turborepo monorepo.

- `apps/api` contains the Fastify modular monolith.
- `apps/web` contains the React SPA.
- `packages/contracts` contains shared Zod contracts.
- `supabase` contains local-only database configuration.

The backend follows a strict `route -> service -> repository` flow. The frontend follows a feature-first organization with app-shell code isolated under `src/app`.
