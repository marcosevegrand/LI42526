# Local Development

## Service Boundaries

- Supabase CLI provides the local PostgreSQL instance.
- Prisma owns schema changes and migrations.
- Docker Compose runs application containers and Mailpit only.
- Production uses plain PostgreSQL 16, not Supabase-managed services.

## Preferred Host-Based Flow

1. Copy `.env.example` to `.env`.
2. Start Supabase locally.
3. Run `pnpm install`.
4. Run `pnpm dev`.

## Containerized App Flow

1. Start Supabase locally.
2. Copy `.env.example` to `.env`.
3. Run `docker compose up --build`.

## Database Authority

Use Prisma schema and Prisma migrations as the only schema-management path. Supabase local services are infrastructure only.
