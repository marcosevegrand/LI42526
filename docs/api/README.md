# Guia de Referência da API

Este documento complementa [openapi.yaml](./openapi.yaml) com um guia legível da API. Mantém o mesmo agrupamento por domínio da especificação OpenAPI e usa os contratos partilhados em `packages/contracts`, juntamente com os validadores de `route` em `apps/api`, para tornar concretos os exemplos de pedido e resposta.

Os exemplos abaixo são ilustrativos, mas os nomes dos campos, os campos obrigatórios, os enums e os formatos respeitam as regras atuais de validação do `backend`.

## Convenções Globais

| Aspeto | Valor |
| --- | --- |
| Servidor | `http://localhost:3000` |
| `Health endpoint` | `/health` |
| Prefixo da API | `/api/v1` |
| Autenticação | `Session cookie` com o nome `session` |
| `Content type` principal | `application/json` |
| `Download` binário | `application/pdf` para `invoice PDFs` |
| Formato de data | `YYYY-MM-DD` |
| Formato de `datetime` | `ISO 8601 string` |
| Formato monetário | `String` com duas casas decimais, por exemplo `"120.00"` |
| Formato de NIF | Exatamente 9 dígitos |

A maioria dos `business endpoints` exige um `session cookie` autenticado. O ficheiro OpenAPI assinala isso com `cookieAuth`.

### Error Envelope

Os erros de validação, autenticação e conflito seguem o mesmo `envelope`:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Payload inválido",
    "statusCode": 400
  }
}
```

Os `status codes` mais comuns usados pela API são os seguintes:

- `200` para respostas `JSON` com sucesso.
- `204` para `logout`, sem corpo de resposta.
- `400` para `payloads`, `query parameters` ou `path parameters` inválidos.
- `401` quando falta autenticação.
- `403` quando o utilizador atual está autenticado, mas não tem permissão para executar a ação.
- `404` quando o recurso pedido não existe.
- `409` para conflitos de negócio, como transições inválidas do `timer`, recursos duplicados ou operações de `stock` inválidas.

### Idempotency

Algumas operações de escrita aceitam ou exigem o `header` `Idempotency-Key` para evitar submissões duplicadas.

- Obrigatório na implementação atual:
  - `POST /api/v1/purchase-orders/generate-from-low-stock`
  - `POST /api/v1/invoices`
  - `POST /api/v1/invoices/{id}/payments`
  - `POST /api/v1/interventions/{id}/parts`
- Suportado pela implementação atual:
  - `PATCH /api/v1/purchase-orders/{purchaseOrderId}/receive`
  - `POST /api/v1/notifications`

## 1. Health

| Method | Path | Finalidade | Response |
| --- | --- | --- | --- |
| `GET` | `/health` | Verificação leve de disponibilidade do serviço | `HealthResponse` |

Exemplo de resposta:

```json
{
  "status": "ok",
  "service": "api"
}
```

## 2. Autenticação

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Autenticar um utilizador e definir o `session cookie` | `LoginRequest` | `LoginResponse` |
| `GET` | `/api/v1/auth/me` | Devolver o utilizador autenticado | nenhum | `SessionUser` |
| `POST` | `/api/v1/auth/logout` | Limpar o `session cookie` atual | nenhum | sem corpo |

Exemplo de pedido de `login`:

```json
{
  "email": "gestora@gengiskhan.pt",
  "password": "segredo"
}
```

Exemplo de resposta de `login`:

```json
{
  "user": {
    "id": "usr_manager_01",
    "fullName": "Ana Gestora",
    "email": "gestora@gengiskhan.pt",
    "role": "manager"
  }
}
```

Exemplo de resposta da sessão atual em `GET /api/v1/auth/me`:

```json
{
  "id": "usr_mech_02",
  "fullName": "Bruno Mecânico",
  "email": "mecanico@gengiskhan.pt",
  "role": "mechanic"
}
```

## 3. Clientes

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/customers` | Listar clientes | nenhum | `Array` de `Customer` |
| `POST` | `/api/v1/customers` | Criar um cliente | `Customer` | `Customer` |
| `GET` | `/api/v1/customers/{nif}` | Obter um cliente pelo NIF | nenhum | `Customer` |
| `PATCH` | `/api/v1/customers/{nif}` | Atualizar parcialmente um cliente | Campos parciais de cliente | `Customer` |
| `GET` | `/api/v1/customers/{nif}/history` | Devolver a linha temporal do histórico do cliente | nenhum | `Array` cronológico de histórico |

`GET /api/v1/customers` suporta os seguintes `query parameters` na implementação atual:

- `page`: inteiro positivo, por omissão `1`.
- `limit`: inteiro entre `1` e `100`, por omissão `20`.
- `nif`: NIF exato com 9 dígitos.
- `fullName`: filtro textual.
- `email`: filtro por `email` válido.
- `customerType`: `personal` ou `business`.
- `isArchived`: valor booleano.

Os `business customers` têm regras adicionais de validação: `legalName`, `creditLimit` e `paymentTerms` são obrigatórios quando `customerType` é `business`.

Exemplo de `payload` para `business customer`:

```json
{
  "nif": "509876543",
  "customerType": "business",
  "fullName": "Helena Costa",
  "legalName": "Costa Entregas Lda",
  "email": "financeiro@costaentregas.pt",
  "phone": "+351912345678",
  "address": "Rua das Oficinas 25, Porto",
  "creditLimit": "2500.00",
  "paymentTerms": "30 dias",
  "isArchived": false
}
```

Exemplo de resposta típica para um cliente armazenado:

```json
{
  "nif": "509876543",
  "customerType": "business",
  "fullName": "Helena Costa",
  "legalName": "Costa Entregas Lda",
  "email": "financeiro@costaentregas.pt",
  "phone": "+351912345678",
  "address": "Rua das Oficinas 25, Porto",
  "creditLimit": "2500.00",
  "paymentTerms": "30 dias",
  "isArchived": false,
  "createdAt": "2026-04-17T09:15:00.000Z",
  "updatedAt": "2026-04-17T09:15:00.000Z"
}
```

O `history endpoint` devolve uma linha temporal de eventos relacionados com o cliente. A especificação OpenAPI atual ainda não fixa o `schema` de cada item, por isso os consumidores devem tratá-lo como uma coleção cronológica de `audit`.

## 4. Scooters

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/scooters` | Listar scooters | nenhum | `Array` de `Scooter` |
| `POST` | `/api/v1/scooters` | Criar o registo de uma scooter | `Scooter` | `Scooter` |
| `GET` | `/api/v1/scooters/{serialNumber}` | Obter uma scooter | nenhum | `Scooter` |
| `PATCH` | `/api/v1/scooters/{serialNumber}` | Atualizar parcialmente uma scooter | Campos parciais de scooter, exceto `serialNumber` | `Scooter` |
| `GET` | `/api/v1/scooters/{serialNumber}/repairs` | Listar o histórico de reparações de uma scooter | nenhum | Histórico cronológico de reparações |

`GET /api/v1/scooters` suporta estes filtros na implementação atual:

- `serialNumber`
- `customerNif`
- `isArchived`
- `limit` com máximo de `100` e valor por omissão de `50`

Exemplo de `payload` de scooter:

```json
{
  "serialNumber": "XIA-M365-0001",
  "brand": "Xiaomi",
  "model": "Mi Electric Scooter 3",
  "conditionNotes": "Pneu traseiro gasto e tampa da bateria riscada.",
  "customerNif": "509876543",
  "isArchived": false
}
```

Tal como acontece com o histórico de clientes, o `repairs endpoint` devolve uma coleção de histórico definida pela implementação e ainda não totalmente descrita na `baseline` OpenAPI.

## 5. Ordens de Serviço

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/service-orders` | Listar ordens de serviço | nenhum | `Array` de `service-order DTOs` |
| `POST` | `/api/v1/service-orders` | Criar uma ordem de serviço | `ServiceOrderCreateRequest` | `service-order DTO` |
| `GET` | `/api/v1/service-orders/summary` | Obter contagens para um intervalo de datas | nenhum | Objeto de resumo |
| `GET` | `/api/v1/service-orders/{id}` | Obter uma ordem de serviço | nenhum | `service-order DTO` |
| `PATCH` | `/api/v1/service-orders/{id}` | Atualizar campos base editáveis | `reportedProblem` e/ou `estimatedCompletionDate` | `service-order DTO` |
| `PATCH` | `/api/v1/service-orders/{id}/status` | Transitar a ordem para o estado seguinte | `toStatus`, com `note` opcional | `service-order DTO` |
| `PATCH` | `/api/v1/service-orders/{id}/diagnosis` | Guardar os dados técnicos de `diagnosis` | `Diagnosis payload` | `service-order DTO` |
| `PATCH` | `/api/v1/service-orders/{id}/budget` | Guardar o `budget` estimado | `Budget payload` | `service-order DTO` |
| `POST` | `/api/v1/service-orders/{id}/budget/approval` | Registar aprovação ou rejeição | `approved`, com `note` opcional | `service-order DTO` |
| `GET` | `/api/v1/service-orders/{id}/history` | Ler o histórico de estado e de `audit` | nenhum | `Array` de histórico |

`GET /api/v1/service-orders` suporta estes filtros na implementação atual:

- `status`: um de `received`, `in-diagnosis`, `awaiting-customer-approval`, `awaiting-parts`, `in-repair`, `completed`, `delivered`
- `customerNif`
- `scooterSerialNumber`
- `limit` com máximo de `100` e valor por omissão de `50`

`GET /api/v1/service-orders/summary` exige `from` e `to` como `query parameters` no formato `YYYY-MM-DD`.

Exemplo de pedido de criação:

```json
{
  "customerNif": "509876543",
  "scooterSerialNumber": "XIA-M365-0001",
  "reportedProblem": "A bateria descarrega após 3 km e o motor faz ruído.",
  "estimatedCompletionDate": "2026-04-22"
}
```

Exemplo de `diagnosis payload`:

```json
{
  "technicalFindings": "Pack da bateria degradado e rolamento da roda traseira danificado.",
  "recommendedActions": "Substituir o pack da bateria e o rolamento da roda traseira.",
  "estimatedLaborHours": "2.50",
  "notes": "O cliente deve aprovar o orçamento antes de encomendar a bateria."
}
```

Exemplo de `budget payload`:

```json
{
  "estimatedLaborAmount": "87.50",
  "estimatedPartsAmount": "210.00",
  "estimatedVatAmount": "68.43",
  "estimatedTotal": "365.93",
  "notes": "Inclui bateria OEM e kit de rolamento."
}
```

Exemplo de `payload` para transição de estado:

```json
{
  "toStatus": "awaiting-customer-approval",
  "note": "Diagnóstico concluído e a aguardar aprovação."
}
```

Exemplo de `payload` para aprovação de `budget`:

```json
{
  "approved": true,
  "note": "Aprovado por chamada telefónica em 2026-04-18."
}
```

Exemplo de resposta típica de ordem de serviço:

```json
{
  "id": "so_01J9F3P4X1",
  "serviceOrderNumber": 1042,
  "customerNif": "509876543",
  "scooterSerialNumber": "XIA-M365-0001",
  "reportedProblem": "A bateria descarrega após 3 km e o motor faz ruído.",
  "status": "awaiting-customer-approval",
  "estimatedCompletionDate": "2026-04-22",
  "diagnosis": {
    "technicalFindings": "Pack da bateria degradado e rolamento da roda traseira danificado.",
    "recommendedActions": "Substituir o pack da bateria e o rolamento da roda traseira.",
    "estimatedLaborHours": "2.50",
    "notes": "O cliente deve aprovar o orçamento antes de encomendar a bateria."
  },
  "budget": {
    "estimatedLaborAmount": "87.50",
    "estimatedPartsAmount": "210.00",
    "estimatedVatAmount": "68.43",
    "estimatedTotal": "365.93",
    "notes": "Inclui bateria OEM e kit de rolamento."
  },
  "budgetApproved": true,
  "budgetApprovalNote": "Aprovado por chamada telefónica em 2026-04-18.",
  "createdAt": "2026-04-17T10:30:00.000Z",
  "updatedAt": "2026-04-18T14:05:00.000Z"
}
```

As transições válidas de estado, impostas pela `service layer`, são as seguintes:

- `received -> in-diagnosis`
- `in-diagnosis -> awaiting-customer-approval | awaiting-parts | in-repair`
- `awaiting-customer-approval -> in-repair | awaiting-parts`
- `awaiting-parts -> in-repair`
- `in-repair -> completed | awaiting-parts`
- `completed -> delivered`

Exemplo de resposta de `summary`:

```json
{
  "period": {
    "from": "2026-04-01",
    "to": "2026-04-30"
  },
  "total": 18,
  "byStatus": [
    {
      "status": "received",
      "count": 4
    },
    {
      "status": "in-repair",
      "count": 7
    },
    {
      "status": "completed",
      "count": 5
    },
    {
      "status": "delivered",
      "count": 2
    }
  ]
}
```

Exemplo de item de histórico:

```json
{
  "id": "hist_01J9F40VZW",
  "action": "status_changed",
  "note": "Diagnóstico concluído e a aguardar aprovação.",
  "fromStatus": "in-diagnosis",
  "toStatus": "awaiting-customer-approval",
  "changedByUserId": "usr_mech_02",
  "createdAt": "2026-04-18T14:05:00.000Z"
}
```

## 6. Intervenções

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/service-orders/{serviceOrderId}/interventions` | Listar intervenções de uma ordem de serviço | nenhum | `Array` de `intervention DTOs` |
| `POST` | `/api/v1/service-orders/{serviceOrderId}/interventions` | Criar uma nova intervenção | `Intervention` | `Intervention` |
| `GET` | `/api/v1/interventions/{id}` | Obter uma intervenção | nenhum | `Intervention` |
| `PATCH` | `/api/v1/interventions/{id}` | Atualizar campos base da intervenção | Campos parciais da intervenção | `Intervention` |
| `POST` | `/api/v1/interventions/{id}/timer/start` | Iniciar ou retomar o `timer` | nenhum | `Intervention` |
| `POST` | `/api/v1/interventions/{id}/timer/pause` | Pausar o `timer` | nenhum | `Intervention` |
| `POST` | `/api/v1/interventions/{id}/timer/stop` | Parar o `timer` | nenhum | `Intervention` |
| `GET` | `/api/v1/interventions/{id}/parts` | Listar peças associadas à intervenção | nenhum | `Array` de associações de peças |
| `POST` | `/api/v1/interventions/{id}/parts` | Associar uma peça à intervenção | `Part-association payload` | Associação de peça |

Os estados possíveis do `timer` estão limitados a `idle`, `running`, `paused` e `stopped`.

Exemplo de `payload` de intervenção:

```json
{
  "description": "Substituir o rolamento da roda traseira e testar a transmissão.",
  "mechanicUserId": "usr_mech_02",
  "notes": "Começar pela desmontagem da roda.",
  "elapsedSeconds": 0,
  "timerState": "idle"
}
```

Exemplo de resposta típica de intervenção após iniciar o `timer`:

```json
{
  "id": "int_01J9F4D6Y2",
  "description": "Substituir o rolamento da roda traseira e testar a transmissão.",
  "mechanicUserId": "usr_mech_02",
  "notes": "Começar pela desmontagem da roda.",
  "elapsedSeconds": 0,
  "timerState": "running",
  "timerStartedAt": "2026-04-18T14:15:00.000Z"
}
```

Exemplo de `payload` para associação de peça à intervenção:

```json
{
  "partReference": "BRG-6202-2RS",
  "quantity": 1,
  "note": "Substituição do rolamento da roda traseira"
}
```

Exemplo de resposta de associação de peça:

```json
{
  "partReference": "BRG-6202-2RS",
  "quantity": 1,
  "note": "Substituição do rolamento da roda traseira"
}
```

Os `timer endpoints` são operações de estilo comando e não têm `request body`. Devolvem sempre o registo completo da intervenção atualizado, para que o `client` possa refrescar o estado da `UI` de imediato.

## 7. Inventário

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/parts` | Listar peças de inventário | nenhum | `Array` de peças |
| `POST` | `/api/v1/parts` | Criar uma peça | `Part` | `Part` |
| `GET` | `/api/v1/parts/low-stock` | Listar peças abaixo ou no mínimo de `stock` | nenhum | `Array` de peças |
| `GET` | `/api/v1/parts/{partReference}` | Obter uma peça | nenhum | `Part` |
| `PATCH` | `/api/v1/parts/{partReference}` | Atualizar uma peça | Campos parciais da peça, exceto `partReference` | `Part` |
| `POST` | `/api/v1/parts/{partReference}/stock-adjustments` | Aplicar uma correção manual de `stock` | `Stock-adjustment payload` | `Part` |
| `GET` | `/api/v1/stock-movements` | Ler o histórico de movimentos de `stock` | nenhum | `Array` de entradas de movimento de `stock` |

`GET /api/v1/parts` suporta estes filtros na implementação atual:

- `page`
- `limit`
- `partReference`
- `description`
- `supplierId`
- `lowStock`

`GET /api/v1/parts/low-stock` suporta `limit`, com valor por omissão de `50` e máximo de `100`.

`GET /api/v1/stock-movements` suporta:

- `partReference`
- `from`
- `to`
- `limit`, por omissão `100`, máximo `200`

Exemplo de `payload` de peça:

```json
{
  "partReference": "BAT-36V-7800",
  "description": "Bateria 36V 7800mAh",
  "supplierId": "sup_01J9F5HT4A",
  "costPrice": "145.00",
  "salePrice": "199.00",
  "currentStock": 3,
  "minimumStock": 4,
  "isArchived": false
}
```

Exemplo de `stock-adjustment payload`:

```json
{
  "quantityDelta": 2,
  "note": "Correção manual após contagem na prateleira"
}
```

Exemplo de item de movimento de `stock`:

```json
{
  "id": "mov_01J9F5RNEQ",
  "partReference": "BAT-36V-7800",
  "movementType": "adjustment",
  "origin": "manual_adjustment",
  "quantityDelta": 2,
  "balanceAfter": 5,
  "note": "Correção manual após contagem na prateleira",
  "createdAt": "2026-04-18T15:30:00.000Z"
}
```

Se um ajuste de `stock` fizer com que o valor fique negativo, a API rejeita a operação com o erro `409 invalid_stock_adjustment`.

## 8. Fornecedores e Compras

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/suppliers` | Listar fornecedores | nenhum | `Array` de fornecedores |
| `POST` | `/api/v1/suppliers` | Criar um fornecedor | `Supplier` | `Supplier` |
| `GET` | `/api/v1/suppliers/{supplierId}` | Obter um fornecedor | nenhum | `Supplier` |
| `PATCH` | `/api/v1/suppliers/{supplierId}` | Atualizar um fornecedor | Campos parciais do fornecedor | `Supplier` |
| `GET` | `/api/v1/purchase-orders` | Listar `purchase orders` | nenhum | `Array` de `purchase orders` |
| `POST` | `/api/v1/purchase-orders` | Criar uma `purchase order` | `PurchaseOrder` | `PurchaseOrder` |
| `POST` | `/api/v1/purchase-orders/generate-from-low-stock` | Gerar `purchase orders` a partir de peças com baixo `stock` | nenhum | `Array` de `purchase orders` |
| `GET` | `/api/v1/purchase-orders/{purchaseOrderId}` | Obter uma `purchase order` | nenhum | `PurchaseOrder` |
| `PATCH` | `/api/v1/purchase-orders/{purchaseOrderId}` | Atualizar `metadata` da `purchase order` | `status`, com `deliveredAt` opcional | `PurchaseOrder` |
| `PATCH` | `/api/v1/purchase-orders/{purchaseOrderId}/receive` | Marcar uma `purchase order` como recebida | nenhum | `PurchaseOrder` |

Exemplo de `payload` de fornecedor:

```json
{
  "name": "Peças Mobilidade Urbana",
  "email": "encomendas@pecasmobilidadeurbana.pt",
  "phone": "+351220000001",
  "paymentTerms": "15 dias"
}
```

Exemplo de `payload` de `purchase order`:

```json
{
  "supplierId": "sup_01J9F5HT4A",
  "items": [
    {
      "partReference": "BAT-36V-7800",
      "quantity": 5
    },
    {
      "partReference": "BRG-6202-2RS",
      "quantity": 10
    }
  ]
}
```

Exemplo de `payload` de atualização de `purchase order`:

```json
{
  "status": "received",
  "deliveredAt": "2026-04-19"
}
```

Exemplo de resposta típica de `purchase order`:

```json
{
  "id": "po_01J9F63R6N",
  "supplierId": "sup_01J9F5HT4A",
  "items": [
    {
      "partReference": "BAT-36V-7800",
      "quantity": 5
    },
    {
      "partReference": "BRG-6202-2RS",
      "quantity": 10
    }
  ]
}
```

A implementação atual da `route` valida `status` e `deliveredAt` nas atualizações de `purchase order`, mas o `purchase-order DTO` devolvido continua, de forma intencional, reduzido a `id`, `supplierId` e `items`.

## 9. Faturação

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/invoices` | Listar `invoices` emitidas | nenhum | `Array` de resumos de `invoice` |
| `POST` | `/api/v1/invoices` | Emitir uma `invoice` | `Invoice-issue payload` | Resumo de `invoice` |
| `GET` | `/api/v1/invoices/pending-business` | Listar `invoices` pendentes para clientes empresariais | nenhum | `Array` de resumos de `invoice` |
| `GET` | `/api/v1/invoices/{id}` | Obter o resumo de uma `invoice` | nenhum | Resumo de `invoice` |
| `GET` | `/api/v1/invoices/{id}/pdf` | Fazer `download` do PDF da `invoice` | nenhum | PDF binário |
| `POST` | `/api/v1/invoices/{id}/payments` | Registar um pagamento | `Payment-registration payload` | Resumo de `invoice` |

Exemplo de `invoice-issue payload`:

```json
{
  "serviceOrderId": "so_01J9F3P4X1",
  "paymentMethod": "cartão",
  "note": "Fatura emitida no balcão de levantamento"
}
```

Exemplo de `payment-registration payload`:

```json
{
  "paymentMethod": "cartão",
  "paidAt": "2026-04-19T11:45:00.000Z",
  "note": "Pagamento integral no levantamento"
}
```

Exemplo de resposta típica de resumo de `invoice`:

```json
{
  "id": "inv_01J9F6M9S5",
  "invoiceNumber": "FT 2026/00042",
  "subtotal": "297.50",
  "vatAmount": "68.43",
  "total": "365.93",
  "paymentStatus": "paid"
}
```

`GET /api/v1/invoices/{id}/pdf` devolve `application/pdf`. Na implementação atual, o conteúdo binário é gerado a partir de uma `server-side invoice preview`.

## 10. Notificações

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/notifications` | Listar notificações enviadas ou em fila | nenhum | `Array` de notificações |
| `POST` | `/api/v1/notifications` | Enviar uma notificação | `Notification payload` | Registo da notificação |
| `GET` | `/api/v1/notification-templates` | Listar `notification templates` | nenhum | `Array` de `templates` |
| `PATCH` | `/api/v1/notification-templates/{templateId}` | Atualizar um `template` | `Template-update payload` | Registo do `template` |

A implementação atual trata todos os `notification endpoints` como operações orientadas ao papel de `manager`.

Valores válidos para `type` em notificações:

- `reception_confirmation`
- `budget_request`
- `repair_completed`
- `awaiting_parts_delay`

Exemplo de `notification payload`:

```json
{
  "type": "budget_request",
  "recipientEmail": "cliente@example.com",
  "subject": "Orçamento de reparação pronto para aprovação",
  "body": "O orçamento da reparação está agora pronto para aprovação.",
  "triggerSource": "service-order:so_01J9F3P4X1"
}
```

Exemplo de resposta típica de notificação:

```json
{
  "id": "not_01J9F75R4C",
  "type": "budget_request",
  "recipientEmail": "cliente@example.com",
  "subject": "Orçamento de reparação pronto para aprovação",
  "body": "O orçamento da reparação está agora pronto para aprovação.",
  "deliveryStatus": "sent",
  "triggerSource": "service-order:so_01J9F3P4X1",
  "createdAt": "2026-04-19T12:10:00.000Z"
}
```

Exemplo de `template-update payload`:

```json
{
  "subjectTemplate": "Orçamento disponível para aprovação",
  "bodyTemplate": "O orçamento da reparação da sua scooter está agora pronto para aprovação."
}
```

Exemplo de resposta típica de `template`:

```json
{
  "id": "tpl_01J9F77M0Q",
  "key": "budget_request",
  "subjectTemplate": "Orçamento disponível para aprovação",
  "bodyTemplate": "O orçamento da reparação da sua scooter está agora pronto para aprovação.",
  "updatedAt": "2026-04-19T12:14:00.000Z"
}
```

## 11. Relatórios

Todos os `report endpoints` são `GET routes` sob `/api/v1/reports/*` e exigem os mesmos `query parameters`:

- `from`: data obrigatória em `YYYY-MM-DD`
- `to`: data obrigatória em `YYYY-MM-DD`

| Path | Finalidade | Response shape |
| --- | --- | --- |
| `/api/v1/reports/operations` | Contar `throughput` operacional | `{ period, serviceOrders, invoices }` |
| `/api/v1/reports/billing` | Agregar totais de faturação | `{ period, subtotal, vatAmount, total }` |
| `/api/v1/reports/costs` | Agregar volume de inventário de entrada | `{ period, totalInboundUnits }` |
| `/api/v1/reports/parts-usage` | Identificar as peças mais usadas no período | `{ period, items: [{ partReference, quantity }] }` |
| `/api/v1/reports/common-failures` | Identificar os problemas reportados mais comuns | `{ period, items: [{ problem, count }] }` |
| `/api/v1/reports/repair-time` | Medir o total e a média dos tempos de intervenção | `{ period, interventions, totalSeconds, averageSeconds }` |
| `/api/v1/reports/mechanic-productivity` | Agrupar a produtividade por mecânico | `{ period, items: [{ mechanicUserId, interventions, totalSeconds }] }` |

Exemplo de resposta de relatório de faturação:

```json
{
  "period": {
    "from": "2026-04-01",
    "to": "2026-04-30"
  },
  "subtotal": "14250.00",
  "vatAmount": "3277.50",
  "total": "17527.50"
}
```

Exemplo de resposta de relatório de produtividade por mecânico:

```json
{
  "period": {
    "from": "2026-04-01",
    "to": "2026-04-30"
  },
  "items": [
    {
      "mechanicUserId": "usr_mech_02",
      "interventions": 14,
      "totalSeconds": 25200
    },
    {
      "mechanicUserId": "usr_mech_03",
      "interventions": 11,
      "totalSeconds": 19800
    }
  ]
}
```

## 12. Configuração

| Method | Path | Finalidade | Request body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/config/financial-parameters` | Ler os parâmetros atuais de preço | nenhum | `financialParameters` |
| `PATCH` | `/api/v1/config/financial-parameters` | Atualizar os parâmetros de preço | `financialParameters` | `financialParameters` |

Exemplo de `payload` de `financial-parameters`:

```json
{
  "hourlyLaborRate": "35.00",
  "vatRate": "0.23"
}
```

## 13. Notas para Consumidores

Este guia foca-se, de forma intencional, nas `routes` que já existem em [openapi.yaml](./openapi.yaml). A implementação do `backend` inclui alguns `helper endpoints` adicionais que ainda não fazem parte da `baseline` OpenAPI publicada e, por isso, são deliberadamente excluídos para manter o `Markdown` alinhado com a especificação formal.

Quando o ficheiro OpenAPI ainda deixa um corpo de resposta em aberto, os exemplos deste guia são derivados da `route layer` validada e dos `service DTOs` atuais. Isso torna o documento adequado para desenvolvimento de `frontend`, testes manuais e percursos de API, preservando ao mesmo tempo [openapi.yaml](./openapi.yaml) como `machine-readable contract`.
