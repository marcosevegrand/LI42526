# Matriz de Rastreabilidade SRS → Testes

Documento referenciado pelo Capítulo 4 do relatório
(Verificação, Validação e Avaliação da Qualidade). Cada requisito do
SRS está mapeado para pelo menos um teste automatizado.

## Convenções

- **Layer**: classifica o teste segundo o modelo em quatro camadas
  - **Unit** — `*.unit.test.ts`, funções isoladas sem Fastify/DB
  - **Integration** — `<module>.test.ts`, módulo isolado contra Postgres real
  - **System** — `*.system.test.ts`, vários módulos em sequência
  - **Acceptance** — `*.acceptance.test.ts`, user stories
  - **Quality** — `quality/*.test.ts`, atributos ISO/IEC 25010
- **Status**: `✓` se há teste, `—` se ainda não coberto

## Requisitos Funcionais

| ID    | Descrição (resumida)                                  | Layer(s)               | Ficheiros principais                                                | Status |
|-------|--------------------------------------------------------|------------------------|---------------------------------------------------------------------|--------|
| RF-01 | Registo de clientes (campos obrigatórios)              | Unit + Integration     | `contracts.unit.test.ts`, `customers/customers.test.ts`            | ✓ |
| RF-02 | Distinção particular/empresarial                       | Integration            | `customers/customers.test.ts`                                       | ✓ |
| RF-03 | Campos obrigatórios para empresariais                  | Unit + Integration     | `contracts.unit.test.ts`, `customers/customers.test.ts`            | ✓ |
| RF-04 | NIF único e formato 9 dígitos                          | Unit + Integration     | `contracts.unit.test.ts`, `customers/customers.test.ts`            | ✓ |
| RF-05 | Histórico do cliente                                   | Integration            | `customers/customers.test.ts`                                       | ✓ |
| RF-06 | Edição de contactos                                    | Integration            | `customers/customers.test.ts`                                       | ✓ |
| RF-07 | Registo de trotinete com nº de série único             | Integration            | `scooters/scooters.test.ts`                                         | ✓ |
| RF-08 | Histórico de reparações por nº de série                | Integration + Acceptance | `scooters/scooters.test.ts`, `mechanic.acceptance.test.ts`        | ✓ |
| RF-09 | Numeração sequencial de OS + estado inicial            | System + Integration   | `repair-lifecycle.system.test.ts`, `service-orders/service-orders.test.ts` | ✓ |
| RF-10 | Campos obrigatórios na criação (cliente/trotinete/problema) | Integration       | `service-orders/service-orders.test.ts`                             | ✓ |
| RF-11 | Estados da OS                                          | System + Integration   | `repair-lifecycle.system.test.ts`, `service-orders/service-orders.test.ts` | ✓ |
| RF-12 | Registo automático de transições (histórico)           | System                 | `repair-lifecycle.system.test.ts`                                   | ✓ |
| RF-13 | Estado "Entregue" exige manager                        | Integration + Quality  | `service-orders/service-orders.test.ts`, `security.test.ts`         | ✓ |
| RF-14 | Resumo de OS por estado                                | Integration + Acceptance | `service-orders/service-orders.test.ts`, `manager.acceptance.test.ts` | ✓ |
| RF-15 | Múltiplas intervenções por OS                          | Acceptance             | `mechanic.acceptance.test.ts`                                       | ✓ |
| RF-16 | Intervenção: descrição, mecânico, tempo, peças         | Integration            | `interventions/interventions.test.ts`                               | ✓ |
| RF-17 | Cronómetro com start/pause/stop                        | Integration + Acceptance | `interventions/interventions.test.ts`, `mechanic.acceptance.test.ts` | ✓ |
| RF-18 | Data conclusão/entrega + fatura associada              | System                 | `repair-lifecycle.system.test.ts`                                   | ✓ |
| RF-19 | Catálogo de peças                                      | Integration + Acceptance | `inventory/inventory.test.ts`, `mechanic.acceptance.test.ts`      | ✓ |
| RF-20 | Consumo de peças em intervenção (stock baixa)          | System + Integration   | `inventory-procurement.system.test.ts`, `interventions/interventions.test.ts` | ✓ |
| RF-21 | Movimentos de stock                                    | Integration            | `inventory/inventory.test.ts`                                       | ✓ |
| RF-22 | Alerta de stock mínimo                                 | System + Integration + Acceptance | `inventory-procurement.system.test.ts`, `inventory/inventory.test.ts`, `manager.acceptance.test.ts` | ✓ |
| RF-23 | Pré-encomenda a partir de low-stock                    | Integration            | `suppliers-procurement/suppliers-procurement.test.ts`               | ✓ (parcial — endpoint generate-from-low-stock) |
| RF-24 | Histórico de encomendas                                | Integration + System   | `suppliers-procurement/suppliers-procurement.test.ts`, `inventory-procurement.system.test.ts` | ✓ |
| RF-25 | Dados de fornecedor                                    | Integration            | `suppliers-procurement/suppliers-procurement.test.ts`               | ✓ |
| RF-26 | Cálculo automático (peças + mão de obra + IVA)         | System                 | `repair-lifecycle.system.test.ts`                                   | ✓ |
| RF-27 | Geração automática de fatura a partir de OS            | Integration + Acceptance | `billing/billing.test.ts`, `manager.acceptance.test.ts`           | ✓ |
| RF-28 | Discriminação na fatura                                | System                 | `repair-lifecycle.system.test.ts`                                   | ✓ |
| RF-29 | Numeração sequencial contínua                          | Integration            | `billing/billing.test.ts` (assert sobre serviceOrderNumber)         | ✓ |
| RF-30 | Parametrizar taxa horária e IVA                        | Integration + Acceptance | `configuration/configuration.test.ts`, `manager.acceptance.test.ts` | ✓ |
| RF-31 | Estado de pagamento por fatura                         | System + Integration   | `repair-lifecycle.system.test.ts`, `billing/billing.test.ts`        | ✓ |
| RF-32 | Faturas pendentes de empresariais (manager-only)       | Integration + Acceptance | `billing/billing.test.ts`, `manager.acceptance.test.ts`           | ✓ |
| RF-33 | Relatórios filtráveis por período                      | Integration + Acceptance | `reports/reports.test.ts`, `manager.acceptance.test.ts`           | ✓ |
| RF-34 | Login individual por utilizador                        | Unit + Integration + Quality | `session.unit.test.ts`, `auth/auth.test.ts`, `security.test.ts` | ✓ |
| RF-35 | RBAC manager/mechanic                                  | Unit + Quality + Integration | `session.unit.test.ts`, `security.test.ts`, diversos `*.test.ts` | ✓ |
| RF-36 | Confirmação de receção                                 | Integration            | `notifications/notifications.test.ts`                               | ✓ |
| RF-37 | Pedido de aprovação                                    | Integration            | `notifications/notifications.test.ts`                               | ✓ |
| RF-38 | Conclusão notificada                                   | Integration            | `notifications/notifications.test.ts`                               | ✓ |
| RF-39 | Aviso de atraso (>10 dias em aguarda peças)            | —                      | _Não automatizado nesta fase — depende de scheduler_                | — |
| RF-40 | Templates personalizáveis                              | Integration            | `notifications/notifications.test.ts`                               | ✓ |

## Requisitos Não Funcionais

| ID     | Categoria       | Layer / Atributo ISO 25010                       | Ficheiros                                              | Status |
|--------|-----------------|---------------------------------------------------|--------------------------------------------------------|--------|
| RNF-01 | Plataforma      | Functional Suitability — verificada por execução do bootstrap em todos os layers | `app.test.ts` smoke + qualquer `*.test.ts` | ✓ |
| RNF-02 | Usabilidade     | Functional Appropriateness — proxy via acceptance tests | `manager.acceptance.test.ts`, `mechanic.acceptance.test.ts` | ✓ (proxy) |
| RNF-03 | Segurança       | Security                                          | `security.test.ts`                                     | ✓ |
| RNF-04 | Fiabilidade     | Reliability — Fault tolerance (idempotência), Recoverability | `idempotency/http.unit.test.ts`                | ✓ |
| RNF-05 | Escalabilidade  | Performance Efficiency — Time behavior            | `performance.test.ts`                                   | ✓ (smoke SLO) |

## Mapeamento ISO/IEC 25010 → Camadas

| Característica ISO/IEC 25010 | Sub-atributo destacado            | Camadas que o cobrem                  |
|------------------------------|------------------------------------|----------------------------------------|
| Functional Suitability       | Completeness, Correctness          | Unit + Integration + System + Acceptance |
| Security                     | Authenticity, Authorization, Integrity, Accountability | `quality/security.test.ts` + RBAC em todos os módulos |
| Reliability                  | Fault tolerance (idempotência), Maturity (transições de estado) | Unit (idempotency) + Integration (state machine) |
| Performance Efficiency       | Time behavior                      | `quality/performance.test.ts`          |
| Maintainability              | Modularity, Testability            | Cobertura de código (`pnpm test:coverage`) |
| Compatibility                | Co-existence (Postgres + Fastify)  | Bootstrap testado em `app.test.ts`    |

## Como reproduzir

Pré-requisitos: PostgreSQL acessível em `DATABASE_URL`, schema Prisma aplicado.

```bash
# Suite completa (unit + integration + system + acceptance + quality)
pnpm --filter @gengis-khan/api test

# Cobertura de linha / branch / função
pnpm --filter @gengis-khan/api test:coverage
```

Para CI, o workflow `.github/workflows/ci.yml` deve provisionar uma instância
Postgres efémera (action `postgres` ou container service) antes de invocar `pnpm test`.
