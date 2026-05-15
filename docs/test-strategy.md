# Estratégia de Testes

Documento de suporte ao Capítulo 4 — Verificação, Validação e Avaliação
da Qualidade. Resume a arquitetura de testes adotada para a API
Fastify + TypeScript do projeto Gengis Khan.

## Decisões fundacionais

| Decisão                       | Escolha                                  | Motivação                                                          |
|--------------------------------|-------------------------------------------|---------------------------------------------------------------------|
| Test runner                    | `node:test` (nativo)                      | Sem dependências extra, suportado nativamente em Node 20.           |
| Tipo-check em runtime          | `tsx --test`                              | Permite testar TypeScript sem build, mantendo paridade com `dev`.   |
| Cliente HTTP nos testes        | `app.inject()` (Fastify)                  | Não abre porto, mais rápido que `supertest` ou `fetch` real.        |
| Persistência                   | PostgreSQL real (sem mocks Prisma)         | Cobre comportamento real do schema, migrações, constraints.        |
| Auth nos testes                | JWT gerado com `jsonwebtoken.sign()`      | Reproduz o cookie de sessão sem percorrer o fluxo de login.        |
| Idempotência                   | Headers `Idempotency-Key` por POST sensível | Espelha o que o cliente real envia.                                |

## Modelo em quatro camadas

```
                ┌──────────────────────────────────┐
                │  Acceptance (US-G01..G08, M01..M08)│  alto valor / baixo volume
                ├──────────────────────────────────┤
                │  System (repair-lifecycle, ...) │
                ├──────────────────────────────────┤
                │  Integration (módulo a módulo)  │
                ├──────────────────────────────────┤
                │  Unit (helpers, schemas Zod)    │  baixo custo / alto volume
                └──────────────────────────────────┘
                  ┌──── Quality (ISO 25010) ────┐
                  │  security, performance       │
                  └──────────────────────────────┘
```

### Camada Unit
- **Ficheiros**: `apps/api/src/**/*.unit.test.ts`
- **Sem** Fastify boot nem DB.
- Cobre lógica isolada: `appError`, `requireRole`, `claimIdempotencyKey`,
  fingerprint, e validações Zod do `@gengis-khan/contracts`.

### Camada Integration
- **Ficheiros**: `apps/api/src/modules/<module>/<module>.test.ts`
- Boot Fastify + DB real. Cada `describe` faz `cleanDatabase()` +
  `seedMinimal()` no `beforeEach`. Apenas o contrato HTTP é exercido —
  nunca repositórios diretamente.

### Camada System
- **Ficheiros**: `apps/api/src/system/*.system.test.ts`
- Encadeia vários módulos numa sequência de chamadas HTTP (receção →
  diagnóstico → reparação → fatura → entrega). Valida estados
  intermédios e efeitos colaterais (stock baixa, histórico cresce).

### Camada Acceptance
- **Ficheiros**: `apps/api/src/acceptance/*.acceptance.test.ts`
- Cada `it()` mapeia a uma user story do SRS (US-G01..G08, US-M01..M08).
  Otimizado para legibilidade pelo product owner.

### Quality (ISO/IEC 25010)
- **Ficheiros**: `apps/api/src/quality/*.test.ts`
- **Security** (`security.test.ts`): tokens forjados/expirados,
  payloads adulterados, RBAC, traceId em erros.
- **Performance** (`performance.test.ts`): SLO informal por endpoint
  (read < 1s, summary < 2s, health < 500ms). Não substitui load tests
  dedicados; serve de canário em CI.

## Geração assistida por LLM

Em coerência com o enunciado de LI4, o suite foi gerado com apoio de
LLM (Claude Opus) seguindo um prompt estruturado que:

1. Fixou o test runner e localização para evitar fragmentação.
2. Referenciou o ficheiro `app.test.ts` como modelo de estilo.
3. Importou esquemas Zod de `packages/contracts` (em vez de gerar
   esquemas paralelos).
4. Exigiu rastreabilidade explícita (`// REQ-XX` em cada `it()`).
5. Enumerou regras de domínio críticas (transições de estado, stock,
   faturação) com os códigos de erro esperados.
6. Listou anti-padrões a evitar (mocks Prisma, Vitest/Jest, fabricar
   requisitos).

Cada teste gerado foi revisto, executado contra a API real e ajustado
sempre que o output divergia do contrato observado — a validação
crítica humana é parte do método, não opcional.

## Métricas de qualidade

| Métrica                            | Como medir                                       | Threshold sugerido |
|------------------------------------|---------------------------------------------------|--------------------|
| Cobertura de linhas                | `pnpm --filter @gengis-khan/api test:coverage`    | ≥ 70%              |
| Cobertura de branches              | idem                                              | ≥ 60%              |
| Cobertura de funções               | idem                                              | ≥ 75%              |
| Requisitos do SRS com teste        | `docs/srs-traceability.md`                       | 100% — falhas auditáveis |
| SLO de tempo de resposta (leitura) | `quality/performance.test.ts`                     | < 1s p95 local     |

## Limitações conhecidas

- **Dependência de Postgres real**: o suite não corre sem DB. CI tem
  que provisionar uma instância (container action recomendado).
- **Aviso RF-39** (10 dias em aguarda peças): depende do scheduler;
  ainda não há teste de tempo. Trabalho futuro.
- **Performance ‐ load tests**: os SLO atuais são canários, não load.
  Para carga realística, recomendar k6 ou artillery em fase posterior.

## Como contribuir com novos testes

1. Identificar o requisito (RF-XX ou RNF-XX) que se quer cobrir.
2. Escolher a camada apropriada (preferir Unit/Integration sobre
   System quando possível).
3. Seguir o template de `app.test.ts` para imports e ciclo de vida.
4. Adicionar `// REQ-XX` no comentário acima do `it()`.
5. Atualizar `docs/srs-traceability.md` na linha correspondente.
