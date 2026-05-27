# Guia de Operação e Manutenção

**Projeto:** Sistema de Gestão Oficinas Gengis Khan
**Versão:** 0.1.0
**Stack:** Node.js 20 · pnpm 10 · Fastify · PostgreSQL 16 · Prisma · React + Vite
**Destinatário:** Administrador / responsável de operação e manutenção da aplicação

Este documento descreve, de forma operacional, **como instalar, arrancar,
parar, popular, testar, monitorizar, atualizar e diagnosticar** o sistema
em ambientes de desenvolvimento e produção. Está organizado para que
qualquer operador com conhecimentos básicos de linha de comandos seja
capaz de manter a aplicação sem precisar de consultar o código-fonte.

---

## 1. Visão Geral

O sistema é um **monorepo** organizado com `pnpm` e `Turborepo`, composto por
três peças principais:

| Componente               | Caminho           | Tecnologia        | Porto (dev) |
|--------------------------|--------------------|--------------------|--------------|
| Frontend (SPA web)       | `apps/web`         | React + Vite       | `5173`       |
| Backend (API REST)       | `apps/api`         | Fastify + Prisma   | `3000`       |
| Contratos (Zod)          | `packages/contracts` | TypeScript       | n/a          |
| Base de dados            | container Docker   | PostgreSQL 16      | `54322`      |

O frontend conversa com o backend via HTTP (`/api/v1/...`). O backend
persiste em PostgreSQL e gere autenticação via cookie de sessão JWT.

---

## 2. Pré-requisitos

Software que deve estar instalado **na máquina** onde a aplicação corre:

| Dependência       | Versão mínima | Como verificar                |
|--------------------|----------------|--------------------------------|
| Node.js            | 20.x           | `node --version`              |
| pnpm               | 10.x           | `pnpm --version`              |
| Docker Desktop     | 4.x            | `docker --version`            |
| Git                | qualquer       | `git --version`               |

**Instalação (Windows):**
- Node.js: <https://nodejs.org/> (LTS 20)
- pnpm: `npm install -g pnpm@10`
- Docker Desktop: <https://www.docker.com/products/docker-desktop/>

---

## 3. Instalação Inicial

Operação executada **uma única vez** numa máquina nova.

```powershell
# 1. Clonar o repositório
git clone <url-do-repo>
cd LI42526

# 2. Instalar dependências de todos os workspaces
pnpm install

# 3. Arrancar a base de dados (cria container se não existir)
docker run -d `
  --name gengiskhan-db `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=postgres `
  -p 54322:5432 `
  postgres:16

# 4. Aplicar o esquema da base de dados
pnpm --filter @gengis-khan/api exec prisma db push

# 5. Popular com dados iniciais (utilizadores, peças, etc.)
pnpm --filter @gengis-khan/api exec tsx prisma/seed.ts

# 6. (Opcional) Carregar dados realistas de demonstração
pnpm --filter @gengis-khan/api exec tsx prisma/seed-rich.ts
```

A instalação está concluída quando:
- `docker ps` mostra o container `gengiskhan-db` com estado `Up`
- O comando do passo 4 imprime `Your database is now in sync with your Prisma schema`

---

## 4. Configuração (Variáveis de Ambiente)

Os ficheiros `.env` ficam em três locais:

| Ficheiro            | Para quê                                       |
|----------------------|------------------------------------------------|
| `./.env`             | Variáveis partilhadas (DB, portos, JWT)       |
| `apps/api/.env`      | Específicas da API (sobrepõem o `.env` raiz)  |
| `apps/web/.env`      | Específicas do frontend (URL da API)          |

### Variáveis essenciais

| Variável              | Exemplo                                                  | O que faz                                            |
|-----------------------|----------------------------------------------------------|-------------------------------------------------------|
| `DATABASE_URL`        | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Ligação Prisma à base de dados                        |
| `DIRECT_DATABASE_URL` | (igual à anterior)                                       | Ligação direta para migrações                          |
| `JWT_SECRET`          | string ≥ 16 caracteres                                   | Assina cookies de sessão. **Trocar em produção.**     |
| `COOKIE_DOMAIN`       | `localhost`                                              | Domínio onde o cookie é válido                        |
| `API_PORT`            | `3000`                                                   | Porto onde a API escuta                                |
| `MAIL_FROM`           | `no-reply@exemplo.pt`                                    | Remetente das notificações por email                  |
| `SMTP_HOST`           | (vazio em dev) ou `smtp.sendgrid.net`                    | Servidor SMTP. Vazio = modo dev (não envia, regista)  |
| `SMTP_PORT`           | `1025` (MailHog) ou `587` (provider)                     |                                                       |
| `SMTP_USER`           | (depende do provider)                                    |                                                       |
| `SMTP_PASSWORD`       | (depende do provider)                                    |                                                       |
| `VITE_API_URL`        | `http://localhost:3000/api/v1`                           | URL que o frontend usa para o backend                 |

### Notificações por email

- **Modo dev** (sem SMTP): `SMTP_HOST` comentado/vazio → o `nodemailer` usa
  `jsonTransport`. Notificações ficam gravadas em DB com
  `deliveryStatus = "sent"` mas **não são enviadas**.
- **Modo MailHog** (capturar localmente): `docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog`,
  set `SMTP_HOST=127.0.0.1`. Inbox em <http://localhost:8025>.
- **Modo produção**: apontar `SMTP_HOST/PORT/USER/PASSWORD` para Sendgrid,
  Mailgun, AWS SES, etc.

---

## 5. Arrancar a Aplicação

### Modo desenvolvimento (hot reload)

**Opção A — Script único (Windows PowerShell):**
```powershell
.\start.ps1
```
Arranca o container Postgres e os dois serviços em paralelo.

**Opção B — Manual:**
```powershell
docker start gengiskhan-db          # arranca DB
pnpm dev                            # arranca API + frontend
```

URLs:
- Frontend: <http://localhost:5173>
- API: <http://localhost:3000>
- Health-check: <http://localhost:3000/health>

### Modo produção (build estático)

```powershell
# 1. Compilar tudo
pnpm build

# 2. Servir a API
pnpm --filter @gengis-khan/api start

# 3. Servir o frontend (qualquer servidor estático)
pnpm --filter @gengis-khan/web preview
```

Em produção real, o `apps/web/dist` deve ser servido por Nginx/Caddy e a
API por um process manager (PM2, systemd, container).

---

## 6. Parar a Aplicação

```powershell
# Parar dev servers: Ctrl+C na janela do pnpm dev

# Parar o container da DB
docker stop gengiskhan-db

# Parar tudo de uma vez (Windows)
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
docker stop gengiskhan-db
```

---

## 7. Utilizadores Iniciais (após seed)

Senha de todos: **`changeme123`** — **alterar antes de qualquer uso real.**

| Email                       | Papel    |
|------------------------------|----------|
| `manager@gengiskhan.pt`      | manager  |
| `carlos@gengiskhan.pt`       | mechanic |
| `pedro@gengiskhan.pt`        | mechanic |
| `ana@gengiskhan.pt`          | mechanic |

---

## 8. Operações Frequentes

### Repor a base de dados (zerar tudo)
```powershell
docker exec gengiskhan-db psql -U postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm --filter @gengis-khan/api exec prisma db push
pnpm --filter @gengis-khan/api exec tsx prisma/seed.ts
```

### Aplicar alterações ao esquema
1. Editar `apps/api/prisma/schema.prisma`
2. Executar:
   ```powershell
   pnpm --filter @gengis-khan/api exec prisma db push
   ```
3. Reiniciar a API.

### Atualizar dependências
```powershell
pnpm update --recursive          # atualiza para versões compatíveis
pnpm outdated                    # vê o que está desatualizado
```

### Alterar a taxa horária ou IVA
Via UI: **Definições → Configuração Financeira** (apenas manager).
Via API: `PATCH /api/v1/config/financial-parameters` com `{ hourlyLaborRate, vatRate }`.

### Alterar templates de notificação
Via API: `PATCH /api/v1/notification-templates/:id`. A UI ainda não expõe
esta funcionalidade; pode ser feita manualmente em DB ou via curl.

---

## 9. Backups

### Backup manual (dump completo)
```powershell
docker exec gengiskhan-db pg_dump -U postgres -d postgres -F c -f /tmp/backup.dump
docker cp gengiskhan-db:/tmp/backup.dump .\backup-$(Get-Date -Format yyyyMMdd).dump
```

### Restaurar de um backup
```powershell
docker cp .\backup-20260101.dump gengiskhan-db:/tmp/restore.dump
docker exec gengiskhan-db pg_restore -U postgres -d postgres -c /tmp/restore.dump
```

### Recomendação
- Em produção, configurar `pg_dump` numa tarefa cron diária.
- Manter pelo menos 7 backups rotativos.
- Replicar para storage externo (S3, B2, etc.).

---

## 10. Testes Automatizados

O suite tem **157 testes** organizados em 4 camadas + qualidade ISO 25010.
Detalhe em [`docs/test-strategy.md`](test-strategy.md).

```powershell
# Pré-requisito: DB de teste separada na porta 54399
docker run -d --name gengiskhan-test-db `
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test `
  -p 54399:5432 postgres:16

$env:DATABASE_URL='postgresql://test:test@localhost:54399/test'
$env:DIRECT_DATABASE_URL=$env:DATABASE_URL
pnpm --filter @gengis-khan/api exec prisma db push

# Correr a suite
pnpm --filter @gengis-khan/api test            # tudo (157 tests, ~30s)
pnpm --filter @gengis-khan/api test:unit       # só unitários (sem DB)
pnpm --filter @gengis-khan/api test:integration
pnpm --filter @gengis-khan/api test:system
pnpm --filter @gengis-khan/api test:acceptance
pnpm --filter @gengis-khan/api test:quality
pnpm --filter @gengis-khan/api test:coverage   # com relatório
```

Métricas alvo (atualmente alcançadas):
- Cobertura de linhas ≥ 70% (atual: 85.8%)
- Cobertura de branches ≥ 60% (atual: 79.3%)
- Cobertura de funções ≥ 75% (atual: 82.6%)

---

## 11. Logs e Monitorização

### Logs da API
A API usa **pino** (JSON estruturado) por defeito. Em dev, sai para
`stdout`. Cada linha é JSON com:
```json
{
  "level": 30,
  "time": 1778000000000,
  "pid": 1234,
  "msg": "incoming request",
  "reqId": "req-1",
  "req": { "method": "GET", "url": "/api/v1/customers" }
}
```

Para humanos, em dev:
```powershell
pnpm dev 2>&1 | pnpm exec pino-pretty
```

Em produção, enviar para um agregador (Loki, Datadog, CloudWatch).

### Erros do utilizador
Cada resposta de erro inclui um `traceId` (correlaciona com `reqId` nos logs):
```json
{ "error": "invalid_status_transition", "message": "...", "traceId": "req-42" }
```

---

## 12. Atualização da Aplicação

```powershell
# 1. Parar tudo
docker stop gengiskhan-db
# Ctrl+C nos dev servers

# 2. Pull do código novo
git pull

# 3. Atualizar dependências (caso package.json tenha mudado)
pnpm install

# 4. Aplicar migrações da DB (caso o schema tenha mudado)
docker start gengiskhan-db
pnpm --filter @gengis-khan/api exec prisma db push

# 5. Voltar a arrancar
.\start.ps1
```

**Antes** de atualizar produção, **sempre**:
1. Fazer backup da DB (secção 9)
2. Correr `pnpm test` para garantir que o build novo passa o regression suite
3. Verificar release notes/changelog

---

## 13. Troubleshooting (problemas comuns)

| Sintoma                                                  | Causa provável                                      | Solução                                                                       |
|----------------------------------------------------------|------------------------------------------------------|--------------------------------------------------------------------------------|
| `failed to connect to docker API`                        | Docker Desktop fechado                              | Abrir Docker Desktop e esperar ~30s                                            |
| `EADDRINUSE: 0.0.0.0:3000`                              | API já a correr noutro processo                     | `Get-Process node \| Stop-Process -Force` e voltar a arrancar                  |
| `Bind for 0.0.0.0:54322 failed: port is already allocated` | Outro container Postgres a usar o porto             | `docker ps` → parar o intruso ou mudar `DATABASE_URL` para outra porta         |
| Frontend abre mas API não responde                       | API down ou `VITE_API_URL` errado                    | Verificar `http://localhost:3000/health`; conferir `apps/web/.env`             |
| Login falha com "credenciais inválidas"                  | Seed não corrido ou DB nova                          | `pnpm --filter @gengis-khan/api exec tsx prisma/seed.ts`                       |
| Notificações sempre `failed`                             | `SMTP_HOST` aponta para servidor inexistente         | Comentar `SMTP_HOST` (modo dev) ou apontar para SMTP real                      |
| PDF da fatura não abre                                   | API antiga sem `pdfkit` real                         | Garantir que o backend foi reiniciado após o último `git pull`                |
| `Prisma Client did not initialize yet`                   | Schema novo sem `prisma generate`                    | `pnpm --filter @gengis-khan/api exec prisma generate`                          |
| Sessão expira repetidamente                              | `JWT_SECRET` mudou ou cookie do browser desatualizado | Limpar cookies do site e voltar a entrar                                       |
| Erros `unique constraint failed` ao seedar               | DB já tem os dados                                   | Seed é idempotente em maior parte; para reset completo ver secção 8           |

---

## 14. Estrutura do Projeto

```
LI42526/
├── apps/
│   ├── api/                    Backend Fastify
│   │   ├── src/
│   │   │   ├── modules/        Cada módulo de negócio (auth, customers, etc.)
│   │   │   ├── shared/         Helpers (auth, db, email, http, etc.)
│   │   │   ├── bootstrap/      Registo de plugins e módulos
│   │   │   ├── test/           Helpers de teste partilhados
│   │   │   ├── acceptance/     Testes de aceitação (user stories)
│   │   │   ├── system/         Testes end-to-end multi-módulo
│   │   │   └── quality/        Testes ISO 25010 (security, performance)
│   │   └── prisma/             Schema e seeds da DB
│   └── web/                    Frontend React + Vite
│       └── src/
│           ├── modules/        Páginas (dashboard, customers, etc.)
│           ├── components/     UI partilhada
│           ├── lib/            HTTP client, auth, utils
│           └── store/          Estado global (session)
├── packages/
│   ├── contracts/              Schemas Zod partilhados entre API e Web
│   ├── tooling-typescript/     Config TS partilhada
│   └── tooling-eslint/         Config ESLint partilhada
├── docs/                       Esta pasta — documentação operacional
├── assets/report/              Relatório académico LaTeX
└── start.ps1                   Script de arranque rápido (Windows)
```

---

## 15. Procedimentos de Emergência

### A aplicação não arranca
1. `docker ps` — DB está a correr?
2. `pnpm install` — todas as dependências estão presentes?
3. `pnpm typecheck` — há erros de compilação?
4. Verificar variáveis de ambiente (`.env`, `apps/api/.env`).
5. Consultar logs do passo anterior; o pino imprime stack traces completas.

### A DB ficou corrupta
1. Parar a aplicação imediatamente.
2. Restaurar o último backup conhecido (secção 9).
3. Se não houver backup: criar DB nova e correr `seed.ts` (perde dados).

### A API responde lento
1. `docker stats gengiskhan-db` — CPU/memória do container.
2. Verificar logs por queries lentas (Prisma logger).
3. Considerar `EXPLAIN ANALYZE` nas queries mais frequentes.
4. Aumentar `pool` Postgres ou índices no Prisma schema.

### Comprometimento de credenciais
1. **Rotar `JWT_SECRET`** imediatamente (invalida todas as sessões).
2. Forçar todos os utilizadores a re-autenticar.
3. Investigar logs de acesso (`reqId` + `sessionUser`).
4. Reset de passwords (atualizar `passwordHash` em DB ou re-seed).

---

## 16. Contactos

| Função                          | Pessoa                  |
|----------------------------------|--------------------------|
| Equipa de desenvolvimento        | Francisco Martins, Nuno Rebelo, Marco Sèvegrand, Lucas Robertson, Marco Ferreira |
| Supervisão académica             | Docente UC LI4           |

Para problemas operacionais, abrir issue no repositório com:
- Descrição do sintoma
- Passos para reproduzir
- Logs relevantes (com `traceId` se aplicável)
- Estado de `docker ps`, `pnpm --version`, `node --version`

---

## 17. Referências Cruzadas

- [`docs/test-strategy.md`](test-strategy.md) — estratégia de testes detalhada
- [`docs/srs-traceability.md`](srs-traceability.md) — matriz requisitos → testes
- [`docs/architecture/overview.md`](architecture/overview.md) — arquitetura do sistema
- [`docs/setup/local-development.md`](setup/local-development.md) — guia de setup detalhado
- [`docs/api/openapi.yaml`](api/openapi.yaml) — contrato OpenAPI da API
- `apps/api/prisma/schema.prisma` — schema da base de dados
