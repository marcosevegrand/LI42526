# ADR 0001: Monorepo With Shared Contracts

## Status

Accepted.

## Decision

Use a pnpm and Turborepo monorepo with:

- Fastify and TypeScript for the backend.
- React, Vite, and TypeScript for the frontend.
- Prisma as the only migration authority.
- Zod contracts shared between frontend and backend.
- Supabase CLI for local PostgreSQL only.

## Consequences

- Shared request and response contracts live in one package.
- The repository keeps one language across both application layers.
- Production remains independent from Supabase platform services.
