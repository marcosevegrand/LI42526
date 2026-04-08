# API Specification

## 1. Document Status

This document defines the authoritative HTTP API specification for the system `Sistema de Gestão para as Oficinas Gengis Khan`.

The specification is written to support the following outcomes:

1. Backend implementation in a modular monolith.
2. Frontend integration from a single-page application.
3. OpenAPI 3.1 formalization.
4. Contract validation and traceability against the requirements described in the project report.

This document is intentionally detailed. It is not an endpoint sketch. It is the contract baseline for implementation.

## 2. Scope and Source of Truth

The API scope is derived from the project material for Tema 3, focused on a single scooter repair workshop.

Primary source documents:

1. `assets/report/content/enunciado.md`
2. `assets/report/main.tex`

Supporting notes:

1. `assets/report/content/notas-relatorio.md`

At the time of writing, `notas-relatorio.md` is empty. Therefore, the effective source of truth is `main.tex` plus the architectural clarifications later provided by the user.

## 3. Architectural Baseline

This specification assumes the following architectural decisions are fixed:

1. API style: REST over HTTP.
2. Formal specification target: OpenAPI 3.1.
3. Payload format: JSON for request and response bodies unless explicitly stated otherwise.
4. Deployment model: single workshop, single application, no public multi-tenant exposure.
5. Backend style: modular monolith.
6. Frontend client: browser-based SPA.
7. Authentication: JWT transported in httpOnly cookies.
8. Roles: `manager` and `mechanic`.
9. Primary outbound notification channel: email.
10. Invoice issuance: explicit manager action after the service order has been completed.

These decisions are treated as normative for the remainder of this specification.

## 4. Domain Overview

The system manages the full operational lifecycle of scooter repair work in a workshop environment.

The core business capabilities are:

1. Customer registration and lookup.
2. Scooter registration and repair history tracking.
3. Service order creation and workflow progression.
4. Technical diagnosis and repair intervention recording.
5. Intervention timing and labor-cost calculation.
6. Parts catalog management and stock movement tracking.
7. Supplier and purchase-order management.
8. Invoice generation and payment tracking.
9. Automated email notifications.
10. Operational and financial reporting.

The API must support both operational use by mechanics and managerial control by the workshop manager, while preserving auditability, fiscal continuity, and role restrictions.

## 5. Primary Roles

The API recognizes two application roles.

### 5.1 Manager

The `manager` role has full application access, including:

1. Customer creation and editing.
2. Supplier and parts administration.
3. Configuration of hourly labor rate and VAT rate.
4. Invoice issuance and payment updates.
5. Access to all reports and financial data.
6. Confirmation of the `delivered` service-order state.
7. Management of email templates.

### 5.2 Mechanic

The `mechanic` role has operational access, including:

1. Creating service orders.
2. Updating service-order operational states.
3. Recording diagnosis.
4. Recording interventions.
5. Starting, pausing, resuming, and stopping intervention timers.
6. Associating parts with interventions.
7. Consulting stock and technical history.

The `mechanic` role cannot:

1. Issue invoices.
2. Access financial reports.
3. Change labor rate or VAT configuration.
4. Confirm the final `delivered` transition.
5. Manage notification templates.

## 6. Resource Model

The API is organized around the following first-class resources.

### 6.1 Customers

Represents workshop clients. Customers may be personal or business clients.

Core attributes:

1. Full name.
2. Tax identifier (`nif`) used as the primary business identifier.
3. Phone.
4. Email.
5. Optional address.
6. Customer type.

Business customers additionally carry:

1. Legal company name.
2. Credit limit.
3. Payment terms.

### 6.2 Scooters

Represents each serviced scooter.

Core attributes:

1. Brand.
2. Model.
3. Unique serial number.
4. General-condition observations.
5. Associated customer.

### 6.3 Service Orders

Represents the central operational record of the workshop.

Core attributes:

1. Sequential service-order number.
2. Creation timestamp.
3. Initial state `received`.
4. Customer reference.
5. Scooter reference.
6. Reported problem.
7. Diagnosis data.
8. Budget data.
9. Completion and delivery dates.
10. Related invoice reference.

### 6.4 Interventions

Represents concrete repair work performed within a service order.

Core attributes:

1. Description of work performed.
2. Responsible mechanic.
3. Time spent.
4. Parts used.
5. Timer state.

### 6.5 Parts

Represents the workshop parts catalog and pricing basis.

Core attributes:

1. Internal part reference.
2. Description.
3. Supplier.
4. Cost price.
5. Sale price.
6. Current stock.
7. Minimum stock.

### 6.6 Stock Movements

Represents auditable stock changes.

Core attributes:

1. Part reference.
2. Timestamp.
3. Movement type.
4. Movement origin.
5. Quantity delta.
6. Balance after movement.
7. Responsible user.

### 6.7 Suppliers

Represents parts suppliers and their commercial conditions.

Core attributes:

1. Name.
2. Email.
3. Phone.
4. Payment conditions.

### 6.8 Purchase Orders

Represents orders sent to suppliers for replenishment.

Core attributes:

1. Purchase-order identifier.
2. Supplier.
3. Status.
4. Creation date.
5. Delivery date.
6. Ordered parts and quantities.

### 6.9 Invoices

Represents fiscal output issued from completed service orders.

Core attributes:

1. Continuous sequential invoice number.
2. Issuance date.
3. Related service order.
4. Customer.
5. Line-level values derived from labor and parts.
6. Subtotal.
7. VAT amount.
8. Total.
9. Payment method.
10. Payment status.

### 6.10 Notifications

Represents outbound automated or manually triggered customer communications.

Core attributes:

1. Notification type.
2. Recipient email.
3. Subject.
4. Rendered body.
5. Delivery status.
6. Trigger source.

### 6.11 Configuration

Represents application-wide operational parameters.

Core attributes:

1. Hourly labor rate.
2. VAT rate.
3. Editable notification templates.

## 7. Identifier Strategy

The API uses natural identifiers where the domain already provides a stable unique identifier.

Natural identifiers exposed in URLs:

1. Customer: `nif`.
2. Scooter: `serialNumber`.
3. Part: `partReference`.

Generated identifiers exposed in URLs:

1. Service orders: internal UUID or numeric internal ID.
2. Interventions: internal UUID or numeric internal ID.
3. Purchase orders: internal UUID or numeric internal ID.
4. Invoices: internal UUID or numeric internal ID for resource retrieval, while the business invoice number remains a separate immutable field.
5. Notifications: internal UUID or numeric internal ID.

Business numbering rules:

1. Service-order numbers are server-generated and sequential.
2. Invoice numbers are server-generated, sequential, continuous, and never client-supplied.

## 8. API Conventions

### 8.1 Base URL

All endpoints are versioned under the following prefix:

`/api/v1`

### 8.2 Naming Conventions

The API follows these naming rules:

1. Resource names are in English.
2. Resource names are plural.
3. Composite resource names use kebab-case.
4. JSON field names use camelCase.

Examples:

1. `/service-orders`
2. `/purchase-orders`
3. `/stock-movements`

### 8.3 HTTP Method Semantics

The API uses standard HTTP method semantics.

1. `GET` for safe reads.
2. `POST` for resource creation and explicit business actions.
3. `PATCH` for partial updates.
4. `DELETE` only where deletion is explicitly allowed by the resource rules.

`PUT` is not used by default because the domain primarily requires partial updates rather than full-resource replacement.

### 8.4 Content Types

Default request and response content type:

`application/json`

Exceptions:

1. Invoice PDF download endpoints return `application/pdf`.
2. Future export endpoints may return `text/csv` if explicitly defined.

### 8.5 Date, Time, and Money Formats

The following formats are mandatory:

1. Date-time fields: ISO 8601 in UTC.
2. Date-only fields: `YYYY-MM-DD`.
3. Monetary values: decimal values with two fractional digits.
4. VAT rate: decimal percentage value stored explicitly at the time of invoice issuance.

The API must never use floating-point semantics for financial values.

## 9. Authentication and Session Model

Authentication is based on JWT tokens stored in httpOnly cookies.

Normative rules:

1. Tokens are issued on successful login.
2. Tokens have an eight-hour lifetime.
3. No refresh-token flow is assumed in the baseline specification.
4. Cookies must be marked `HttpOnly`.
5. Cookies should be marked `Secure` outside local development.
6. Cookies should be configured with an appropriate `SameSite` policy.

The authenticated token payload must contain at least:

1. User identifier.
2. User role.
3. User display name.

## 10. Authorization Model

Authorization is role-based.

General rules:

1. All endpoints require authentication unless explicitly marked public.
2. The `manager` role has access to all application domains.
3. The `mechanic` role is restricted to operational domains.
4. Role checks are enforced server-side.
5. Client-side hiding of UI options has no normative security value.

Manager-only capabilities include:

1. Invoice issuance.
2. Payment recording.
3. Report access.
4. Configuration management.
5. Supplier and template administration.
6. Confirmation of final delivery.

## 11. Error Model

All non-success responses must follow a uniform JSON envelope.

Canonical structure:

```json
{
	"error": "validation_error",
	"message": "One or more fields are invalid.",
	"validationErrors": {
		"email": ["Invalid email format"],
		"nif": ["Invalid Portuguese tax identifier"]
	},
	"traceId": "7ec7e2d0-0e52-4b31-98bb-b7e4e7a1989d"
}
```

Minimum error fields:

1. `error`: stable machine-readable code.
2. `message`: human-readable summary.
3. `traceId`: correlation identifier for debugging.

Optional error fields:

1. `validationErrors` for field-level validation failures.
2. `details` for structured business-rule context.

### 11.1 Standard Status Codes

The API uses the following status-code conventions:

1. `200 OK` for successful reads and updates that return a body.
2. `201 Created` for successful resource creation.
3. `204 No Content` for successful operations without a response body.
4. `400 Bad Request` for malformed input.
5. `401 Unauthorized` for unauthenticated requests.
6. `403 Forbidden` for authenticated users lacking permission.
7. `404 Not Found` for missing resources.
8. `409 Conflict` for state conflicts or business-rule violations.
9. `422 Unprocessable Entity` may be used for semantically invalid but well-formed input if adopted consistently in OpenAPI.

### 11.2 Business Conflict Cases

The following scenarios must return `409 Conflict` rather than a generic validation error:

1. Attempting to issue an invoice for a service order not yet completed.
2. Attempting to confirm delivery without manager permissions.
3. Attempting an invalid service-order state transition.
4. Attempting to consume more stock than available.
5. Attempting to issue a second invoice for the same service order if the domain forbids duplicates.
6. Attempting to modify an immutable issued invoice.

## 12. Validation Rules

Unless otherwise stated by a resource-specific section, the following validation rules apply.

### 12.1 Customer Validation

1. `nif` is mandatory and must be a valid Portuguese tax identifier.
2. `fullName` is mandatory for all customers.
3. `email` is mandatory and must be syntactically valid.
4. `phone` is mandatory and must follow the accepted national format.
5. `address` is optional.
6. `customerType` is mandatory and must be one of `personal` or `business`.
7. For `business` customers, `legalName`, `creditLimit`, and `paymentTerms` are mandatory.

### 12.2 Scooter Validation

1. `serialNumber` is mandatory.
2. `serialNumber` must be unique.
3. `brand` is mandatory.
4. `model` is mandatory.
5. `customerNif` must reference an existing customer.

### 12.3 Service Order Validation

1. The client cannot supply the service-order number.
2. The initial state is always `received`.
3. `customerNif`, `scooterSerialNumber`, and `reportedProblem` are mandatory at creation time.
4. The referenced scooter must belong to the referenced customer.
5. Diagnosis data is not mandatory at creation time.
6. Budget data is not mandatory at creation time.

### 12.4 Intervention Validation

1. Each intervention must belong to a service order.
2. `description` is mandatory.
3. `mechanicUserId` is mandatory.
4. `mechanicUserId` must reference a user with role `mechanic`.
5. `elapsedSeconds` must be zero or positive.

### 12.5 Parts and Stock Validation

1. `partReference` is mandatory and unique.
2. `costPrice` and `salePrice` must be zero or positive.
3. `currentStock` and `minimumStock` must be zero or positive integers.
4. Stock cannot become negative as a result of any API operation.

### 12.6 Invoice Validation

1. The client cannot supply the invoice number.
2. Invoices can only be issued from completed service orders.
3. An invoice must persist the VAT rate and labor rate effective at issuance time.
4. An issued invoice is immutable except for explicitly permitted payment-state changes or future reversal mechanisms if later specified.

## 13. Idempotency and Concurrency

The API contains operations whose unintended repetition would cause material business errors. Those operations require explicit protections.

### 13.1 Idempotency Requirements

The following operations must support an `Idempotency-Key` request header:

1. Invoice issuance.
2. Payment recording.
3. Timer action commands if the implementation cannot guarantee duplicate suppression by state alone.
4. Part association to interventions.
5. Purchase-order creation from low-stock generation.
6. Notification send operations exposed as explicit API actions.

Normative behavior:

1. If the same caller repeats the same idempotent command with the same key, the server must not apply the side effect twice.
2. The server may return the original successful response when replaying a previously completed command.
3. If the same key is reused with a materially different payload, the server should reject the request with `409 Conflict`.

### 13.2 Concurrency Requirements

The following domain areas require explicit concurrency control:

1. Stock consumption and replenishment.
2. Service-order state transitions.
3. Invoice numbering.
4. Payment recording.

Normative behavior:

1. Stock-changing operations must execute atomically.
2. Invoice issuance must reserve the next sequential number in a transaction-safe manner.
3. Service-order state transitions must validate the current persisted state before applying the next one.
4. The API should expose optimistic concurrency through resource versioning, `ETag`, or equivalent response metadata for mutable resources.

## 14. Pagination, Filtering, and Sorting

### 14.1 Pagination Modes

The API uses two pagination strategies.

Offset-based pagination for bounded lists:

1. Suppliers.
2. Email templates.
3. Users.

Cursor-based pagination for unbounded or high-volume histories:

1. Service-order history.
2. Stock movements.
3. Notifications.
4. Audit-style event feeds.

### 14.2 Parameter Conventions

Offset pagination parameters:

1. `page`
2. `limit`

Cursor pagination parameters:

1. `cursor`
2. `limit`

Default rule:

1. If omitted, the server applies a safe default page size.
2. The server must enforce a maximum allowed page size.

### 14.3 Filtering Rules

The API supports filtering via query parameters.

Representative filter examples:

1. `/customers?customerType=business`
2. `/customers?nif=123456789`
3. `/service-orders?status=awaiting-parts`
4. `/parts?lowStock=true`
5. `/invoices?paymentStatus=overdue`
6. `/reports/billing?from=2026-01-01&to=2026-03-31`

### 14.4 Sorting Rules

The API supports sorting through a `sort` query parameter.

Format:

`sort=field:direction`

Example:

`sort=createdAt:desc`

If omitted, each endpoint must define a deterministic default ordering.

## 15. Deletion and Archival Rules

Deletion semantics differ by resource class.

### 15.1 Archive-Only Resources

The following resources are archive-only by default and must not support hard deletion through ordinary API usage:

1. Service orders.
2. Stock movements.
3. Invoices.
4. Payments.
5. Notification delivery history.
6. Purchase orders once issued.

For these resources, the API may expose:

1. Soft-delete flags.
2. Archival state.
3. Inactive markers.

The API must not expose irreversible deletion for these resources unless a future legal and operational policy section explicitly allows it.

### 15.2 Conditionally Deletable Resources

The following resources may support hard deletion if no legal, fiscal, or referential constraints are violated:

1. Email templates created for testing.
2. Draft purchase orders not yet sent.
3. Supplier records not referenced by historical transactions.
4. User records, if modeled as deactivation instead of deletion, should prefer deactivation.

### 15.3 Preferred Behavior

Default behavior across the API is to prefer deactivation or archival over hard deletion.

## 16. Audit and Traceability

The API must preserve sufficient traceability for operational and fiscal integrity.

The following events are auditable by requirement:

1. Service-order state transitions.
2. Diagnosis registration or update.
3. Budget registration and approval recording.
4. Intervention creation and timer activity.
5. Stock movements.
6. Purchase-order status transitions.
7. Invoice issuance.
8. Payment recording.
9. Notification sending.
10. Configuration changes to labor rate, VAT, and templates.

Each auditable event should persist at least:

1. Event type.
2. Actor user identifier.
3. Target resource identifier.
4. Timestamp.
5. Relevant before-and-after state where applicable.
6. Correlation identifier if available.

## 17. Service-Order Workflow

The service order is the central workflow aggregate in the domain.

### 17.1 Valid Service-Order States

The API must support the following service-order states:

1. `received`
2. `in-diagnosis`
3. `awaiting-customer-approval`
4. `awaiting-parts`
5. `in-repair`
6. `completed`
7. `delivered`

### 17.2 Transition Rules

Allowed transitions are:

1. `received` -> `in-diagnosis`
2. `in-diagnosis` -> `awaiting-customer-approval`
3. `in-diagnosis` -> `in-repair` if no approval gate is required for the case being handled
4. `awaiting-customer-approval` -> `awaiting-parts`
5. `awaiting-customer-approval` -> `in-repair`
6. `awaiting-parts` -> `in-repair`
7. `in-repair` -> `completed`
8. `completed` -> `delivered`

The API must reject invalid transitions with `409 Conflict`.

### 17.3 Actor Restrictions

1. Mechanics may perform operational state transitions except the final delivery confirmation.
2. Only managers may confirm the transition to `delivered`.

### 17.4 Recorded Metadata

Each state transition must record:

1. Previous state.
2. New state.
3. Transition timestamp.
4. Actor user identifier.

## 18. Budget Workflow

The API models budgeting as a subdomain of the service order rather than as a completely separate top-level resource.

### 18.1 Budget Object

Each service order may carry a budget object containing:

1. Estimated labor amount.
2. Estimated parts amount.
3. Estimated subtotal.
4. Estimated VAT.
5. Estimated total.
6. Manager or mechanic notes.
7. Timestamp of proposal.

### 18.2 Approval Recording

Baseline assumption:

1. Customer approval is recorded internally by staff.
2. The API does not expose a public customer self-service approval endpoint in the baseline version.

The approval record should include:

1. Approval status.
2. Approval timestamp.
3. User who recorded the approval.
4. Optional note describing how approval was obtained.

### 18.3 Budget Notification Trigger

When a service order enters `awaiting-customer-approval`, the system must be able to send a detailed budget email to the customer.

## 19. Intervention and Timer Workflow

### 19.1 Intervention Rules

1. A service order may contain multiple interventions.
2. Each intervention is linked to one responsible mechanic.
3. Each intervention may reference zero or more parts.

### 19.2 Timer Rules

The intervention timer is modeled as explicit server-side state.

Supported timer states:

1. `idle`
2. `running`
3. `paused`
4. `stopped`

Normative timer behavior:

1. Timer state must survive page refresh and reconnect.
2. Starting a timer creates or resumes a tracked work session.
3. Pausing a timer preserves accumulated elapsed time.
4. Stopping a timer finalizes the current timing session and updates accumulated labor time.
5. The client display may reconstruct a live timer from persisted fields returned by the API.

### 19.3 Part Association Rules

When a part is associated with an intervention:

1. The stock of that part must decrease automatically.
2. A stock-movement record must be created.
3. The operation must fail atomically if available stock is insufficient.

## 20. Purchase-Order Workflow

### 20.1 Low-Stock Pre-Order Generation

The system must be able to identify parts where `currentStock <= minimumStock`.

The API must support generating a supplier-grouped pre-order list from those parts.

### 20.2 Purchase-Order States

The baseline workflow supports at least:

1. `requested`
2. `received`

The API may extend this state set later if a richer procurement lifecycle is required, but the baseline contract must support these two states.

### 20.3 Receipt Rules

When a purchase order is marked as `received`:

1. Stock for the received parts must increase.
2. A stock-movement entry must be created for each affected part.
3. Delivery timestamp must be recorded.
4. The operation must execute atomically.

## 21. Invoice and Payment Workflow

### 21.1 Invoice Issuance Preconditions

An invoice may only be issued if:

1. The related service order exists.
2. The service order is in state `completed`.
3. The service order has not already been invoiced.

### 21.2 Invoice Issuance Rules

Invoice issuance is an explicit manager action.

On issuance, the server must:

1. Reserve the next invoice number.
2. Calculate labor value using accumulated intervention time and configured hourly rate.
3. Calculate parts value using part sale prices.
4. Calculate subtotal, VAT, and total.
5. Persist the applied VAT rate and hourly rate on the invoice.
6. Link the invoice to the completed service order.

### 21.3 Sequential Numbering Rule

Invoice numbers must be:

1. Sequential.
2. Continuous.
3. Server-generated.
4. Protected against concurrent duplication.

### 21.4 Payment Rules

Each invoice may track:

1. Payment method.
2. Payment status.
3. Payment date.
4. Optional payment note.

Business customers may have pending and overdue invoices discoverable through dedicated query capabilities.

## 22. Notification Workflow

The API must support the following outbound notification use cases.

1. Reception confirmation when a scooter is accepted.
2. Budget email when the service order enters `awaiting-customer-approval`.
3. Completion notification when repair is finished.
4. Delay email when a service order remains in `awaiting-parts` for more than ten days.

Notification templates must be editable by managers.

Each notification event should capture:

1. Notification type.
2. Recipient.
3. Template identifier.
4. Rendered subject.
5. Rendered body.
6. Delivery timestamp.
7. Delivery status.

## 23. Endpoint Catalog

This section defines the baseline endpoint inventory and the contractual behavior of each endpoint group.

## 24. Authentication Endpoints

### 24.1 POST /auth/login

Authenticates a user and establishes the application session cookie.

Authorization:

1. Public.

Request body:

```json
{
	"email": "manager@gengiskhan.pt",
	"password": "string"
}
```

Request rules:

1. `email` is mandatory.
2. `password` is mandatory.

Successful response:

1. Status `200 OK`.
2. Sets an httpOnly authentication cookie.
3. Returns the authenticated user summary.

Example response:

```json
{
	"user": {
		"id": "usr_01JX9S4D0J7J6X2G7XH2B2C1A3",
		"fullName": "António Silva",
		"email": "manager@gengiskhan.pt",
		"role": "manager"
	}
}
```

Failure cases:

1. `401 Unauthorized` for invalid credentials.
2. `400 Bad Request` for malformed payload.

### 24.2 POST /auth/logout

Clears the authentication cookie and ends the current session.

Authorization:

1. Authenticated user.

Successful response:

1. Status `204 No Content`.

### 24.3 GET /auth/me

Returns the identity and role of the current authenticated user.

Authorization:

1. Authenticated user.

Successful response:

```json
{
	"id": "usr_01JX9S4D0J7J6X2G7XH2B2C1A3",
	"fullName": "Ricardo Costa",
	"email": "ricardo@gengiskhan.pt",
	"role": "mechanic"
}
```

## 25. Customer Endpoints

### 25.1 Customer Representation

Customer resource fields:

1. `nif`
2. `customerType`
3. `fullName`
4. `legalName`
5. `email`
6. `phone`
7. `address`
8. `creditLimit`
9. `paymentTerms`
10. `isArchived`
11. `createdAt`
12. `updatedAt`

### 25.2 POST /customers

Creates a customer.

Authorization:

1. `manager` only.

Request body:

```json
{
	"nif": "123456789",
	"customerType": "business",
	"fullName": "João Mendes",
	"legalName": "JM Delivery, Lda.",
	"email": "geral@jmdelivery.pt",
	"phone": "+351912345678",
	"address": "Rua da Oficina, 42, Braga",
	"creditLimit": "1500.00",
	"paymentTerms": "30_days"
}
```

Request rules:

1. `nif` must be unique.
2. All base contact fields are mandatory.
3. `legalName`, `creditLimit`, and `paymentTerms` are mandatory for business customers.

Successful response:

1. Status `201 Created`.
2. Returns the created customer resource.

Failure cases:

1. `409 Conflict` if the `nif` already exists.
2. `422 Unprocessable Entity` or `400 Bad Request` for validation failure, depending on the adopted error policy.

### 25.3 GET /customers

Returns a paginated customer list.

Authorization:

1. `manager`
2. `mechanic`

Supported filters:

1. `nif`
2. `fullName`
3. `email`
4. `customerType`
5. `isArchived`

Supported sorting:

1. `createdAt`
2. `fullName`
3. `nif`

Successful response shape:

```json
{
	"items": [
		{
			"nif": "123456789",
			"customerType": "business",
			"fullName": "João Mendes",
			"legalName": "JM Delivery, Lda.",
			"email": "geral@jmdelivery.pt",
			"phone": "+351912345678",
			"creditLimit": "1500.00",
			"paymentTerms": "30_days",
			"isArchived": false,
			"createdAt": "2026-02-20T10:30:00Z",
			"updatedAt": "2026-02-20T10:30:00Z"
		}
	],
	"page": 1,
	"limit": 20,
	"total": 1
}
```

### 25.4 GET /customers/{nif}

Returns full customer details.

Authorization:

1. `manager`
2. `mechanic`

Path parameters:

1. `nif`: customer tax identifier.

Successful response includes:

1. Full customer profile.
2. Business-specific fields where applicable.
3. Optional summary fields such as outstanding balance for business customers.

Failure cases:

1. `404 Not Found` if the customer does not exist.

### 25.5 PATCH /customers/{nif}

Partially updates editable customer fields.

Authorization:

1. `manager` only.

Editable fields:

1. `email`
2. `phone`
3. `address`
4. `legalName`
5. `creditLimit`
6. `paymentTerms`
7. `isArchived`

Non-editable fields by default:

1. `nif`
2. `customerType`

Successful response:

1. Status `200 OK`.
2. Returns the updated customer.

### 25.6 GET /customers/{nif}/history

Returns customer-level service and billing history.

Authorization:

1. `manager`
2. `mechanic`, except for financial details that may be redacted if the implementation chooses stricter role separation

Response includes:

1. Total number of service orders.
2. Total amount spent.
3. Pending invoice count.
4. Pending invoice amount.
5. Last service-order date.

## 26. Scooter Endpoints

### 26.1 Scooter Representation

Scooter resource fields:

1. `serialNumber`
2. `brand`
3. `model`
4. `conditionNotes`
5. `customerNif`
6. `isArchived`
7. `createdAt`
8. `updatedAt`

### 26.2 POST /scooters

Registers a scooter.

Authorization:

1. `manager`
2. `mechanic`

Request body:

```json
{
	"serialNumber": "SN-XIA-2026-000145",
	"brand": "Xiaomi",
	"model": "Pro 2",
	"conditionNotes": "Rear brake worn, front stem scratched.",
	"customerNif": "123456789"
}
```

Request rules:

1. `serialNumber` must be unique.
2. `customerNif` must reference an existing customer.

Successful response:

1. Status `201 Created`.
2. Returns the created scooter.

Failure cases:

1. `409 Conflict` if the serial number already exists.
2. `404 Not Found` if the referenced customer does not exist.

### 26.3 GET /scooters

Returns a paginated scooter list.

Authorization:

1. `manager`
2. `mechanic`

Supported filters:

1. `serialNumber`
2. `brand`
3. `model`
4. `customerNif`
5. `isArchived`

### 26.4 GET /scooters/{serialNumber}

Returns full scooter details.

Authorization:

1. `manager`
2. `mechanic`

### 26.5 PATCH /scooters/{serialNumber}

Updates editable scooter fields.

Authorization:

1. `manager`
2. `mechanic`

Editable fields:

1. `brand`
2. `model`
3. `conditionNotes`
4. `customerNif`
5. `isArchived`

Business rule:

1. Reassigning a scooter to another customer must be treated as an explicit business action and should preserve audit history.

### 26.6 GET /scooters/{serialNumber}/repairs

Returns the complete repair history of a scooter.

Authorization:

1. `manager`
2. `mechanic`

Response includes:

1. Related service-order summaries.
2. Diagnoses.
3. Intervention summaries.
4. Completion and delivery dates.
5. Invoice references where applicable.

## 27. Service-Order Endpoints

### 27.1 Service-Order Representation

Service-order summary fields:

1. `id`
2. `serviceOrderNumber`
3. `status`
4. `customerNif`
5. `customerName`
6. `scooterSerialNumber`
7. `scooterLabel`
8. `reportedProblem`
9. `createdAt`
10. `completedAt`
11. `deliveredAt`

Service-order detail fields additionally include:

1. `diagnosis`
2. `budget`
3. `statusHistory`
4. `interventionSummary`
5. `invoiceId`
6. `estimatedCompletionDate` if supported by implementation

### 27.2 POST /service-orders

Creates a service order.

Authorization:

1. `manager`
2. `mechanic`

Request body:

```json
{
	"customerNif": "123456789",
	"scooterSerialNumber": "SN-XIA-2026-000145",
	"reportedProblem": "Battery drains quickly and rear wheel vibrates.",
	"estimatedCompletionDate": "2026-02-25"
}
```

Creation rules:

1. The server generates `serviceOrderNumber`.
2. The initial status is always `received`.
3. `createdAt` is assigned by the server.
4. The service order is linked to the specified customer and scooter.

Successful response:

1. Status `201 Created`.
2. Returns the created service-order detail.

Side effects:

1. The system may trigger a reception-confirmation notification to the customer.

### 27.3 GET /service-orders

Returns a paginated list of service orders.

Authorization:

1. `manager`
2. `mechanic`

Supported filters:

1. `status`
2. `serviceOrderNumber`
3. `customerNif`
4. `scooterSerialNumber`
5. `createdFrom`
6. `createdTo`
7. `completedFrom`
8. `completedTo`

Supported sorting:

1. `createdAt`
2. `serviceOrderNumber`
3. `status`

Default ordering:

1. Most recently created first.

### 27.4 GET /service-orders/{serviceOrderId}

Returns the complete service-order detail.

Authorization:

1. `manager`
2. `mechanic`

Response includes:

1. Base service-order fields.
2. Diagnosis object.
3. Budget object.
4. Current status.
5. Status history.
6. Intervention summaries.
7. Invoice link if present.

### 27.5 PATCH /service-orders/{serviceOrderId}

Updates editable service-order fields that are not state-transition actions.

Authorization:

1. `manager`
2. `mechanic`

Editable fields:

1. `reportedProblem`
2. `estimatedCompletionDate`

Non-editable through this endpoint:

1. `serviceOrderNumber`
2. `status`
3. `createdAt`
4. `completedAt`
5. `deliveredAt`

The `status` field is updated exclusively through the dedicated status-transition endpoint.

### 27.6 PATCH /service-orders/{serviceOrderId}/status

Performs a state transition on the service order.

Authorization:

1. `manager`
2. `mechanic`, except transition to `delivered`

Request body:

```json
{
	"toStatus": "in-diagnosis",
	"note": "Scooter moved to diagnostic bench."
}
```

Request rules:

1. `toStatus` is mandatory.
2. The transition must be valid from the current state.
3. Transition to `delivered` requires the `manager` role.

Successful response:

1. Status `200 OK`.
2. Returns the updated service-order status summary.

Side effects:

1. Records state-transition history.
2. May trigger a notification depending on the target status.
3. Setting status to `completed` should set `completedAt`.
4. Setting status to `delivered` should set `deliveredAt`.

Failure cases:

1. `409 Conflict` for invalid transitions.
2. `403 Forbidden` if a mechanic attempts to set `delivered`.

### 27.7 GET /service-orders/{serviceOrderId}/history

Returns the chronological history of service-order state changes and major events.

Authorization:

1. `manager`
2. `mechanic`

Response includes:

1. State-transition events.
2. Diagnosis updates.
3. Budget updates and approval recording.
4. Intervention creation summaries.
5. Invoice issuance event if applicable.

### 27.8 GET /service-orders/summary

Returns dashboard-friendly counts of service orders by status.

Authorization:

1. `manager`
2. `mechanic`

Example response:

```json
{
	"received": 3,
	"inDiagnosis": 5,
	"awaitingCustomerApproval": 2,
	"awaitingParts": 4,
	"inRepair": 6,
	"completed": 2,
	"delivered": 19
}
```

## 28. Diagnosis and Budget Endpoints

### 28.1 PATCH /service-orders/{serviceOrderId}/diagnosis

Creates or updates the diagnosis portion of a service order.

Authorization:

1. `manager`
2. `mechanic`

Request body:

```json
{
	"technicalFindings": "Battery cell imbalance confirmed. Rear wheel bearing worn.",
	"recommendedActions": "Replace battery pack, replace rear bearing, test controller after repair.",
	"estimatedLaborHours": "2.50",
	"notes": "Customer reports issue started after rain exposure."
}
```

Business rules:

1. Diagnosis may only be recorded after the service order exists.
2. The API should allow diagnosis updates while the service order is in diagnosis-related operational states.
3. Diagnosis changes are auditable.

Successful response:

1. Status `200 OK`.
2. Returns the updated diagnosis object embedded in the service order or as a standalone payload.

### 28.2 PATCH /service-orders/{serviceOrderId}/budget

Creates or updates the budget associated with a service order.

Authorization:

1. `manager`
2. `mechanic`

Request body:

```json
{
	"estimatedLaborAmount": "62.50",
	"estimatedPartsAmount": "145.00",
	"estimatedVatAmount": "47.73",
	"estimatedTotal": "255.23",
	"notes": "Price assumes Xiaomi-compatible battery currently in stock."
}
```

Business rules:

1. Budget should normally be created after diagnosis exists.
2. Budget changes are auditable.
3. Entering `awaiting-customer-approval` may require a budget to exist.

### 28.3 POST /service-orders/{serviceOrderId}/budget/approval

Records the approval or rejection of a budget by staff.

Authorization:

1. `manager`
2. `mechanic`

Request body:

```json
{
	"decision": "approved",
	"recordedByUserId": "usr_01JX9S4D0J7J6X2G7XH2B2C1A3",
	"note": "Approved by customer via phone at 14:20."
}
```

Rules:

1. `decision` must be either `approved` or `rejected`.
2. The action records internal evidence of the customer decision.
3. The action does not imply a public customer endpoint.

Side effects:

1. May unlock transition from `awaiting-customer-approval` to a later status.

## 29. Intervention Endpoints

### 29.1 POST /service-orders/{serviceOrderId}/interventions

Creates an intervention under a service order.

Authorization:

1. `manager`
2. `mechanic`

Request body:

```json
{
	"description": "Replaced rear bearing and checked wheel alignment.",
	"mechanicUserId": "usr_01JX9S8B3TG3E3PTP7B2VJ9KD2",
	"notes": "Bearing seized; axle threads intact."
}
```

Business rules:

1. A service order may contain multiple interventions.
2. Each intervention belongs to exactly one service order.
3. Each intervention has one responsible mechanic in the baseline contract.

Successful response:

1. Status `201 Created`.
2. Returns the created intervention.

### 29.2 GET /service-orders/{serviceOrderId}/interventions

Returns all interventions associated with a service order.

Authorization:

1. `manager`
2. `mechanic`

### 29.3 GET /interventions/{interventionId}

Returns the detail of a specific intervention.

Authorization:

1. `manager`
2. `mechanic`

Response fields include:

1. Description.
2. Responsible mechanic.
3. Accumulated elapsed seconds.
4. Timer state.
5. Linked parts.
6. Notes.

### 29.4 PATCH /interventions/{interventionId}

Updates editable intervention fields.

Authorization:

1. `manager`
2. `mechanic`

Editable fields:

1. `description`
2. `notes`
3. `mechanicUserId`

Non-editable through this endpoint:

1. Timer transitions.
2. Stock side effects.

## 30. Timer Action Endpoints

### 30.1 POST /interventions/{interventionId}/timer/start

Starts or resumes the intervention timer.

Authorization:

1. `manager`
2. `mechanic`

Headers:

1. `Idempotency-Key` recommended.

Rules:

1. Timer may start only from `idle` or `paused`.
2. Starting an already running timer should return either a conflict or the unchanged current timer state, but the behavior must be consistent in OpenAPI.

Successful response includes:

1. `timerState`
2. `timerStartedAt`
3. `elapsedSeconds`

### 30.2 POST /interventions/{interventionId}/timer/pause

Pauses the intervention timer.

Authorization:

1. `manager`
2. `mechanic`

Rules:

1. Timer may pause only from `running`.
2. Elapsed time must be accumulated before persistence.

### 30.3 POST /interventions/{interventionId}/timer/stop

Stops the timer and finalizes the current timing session.

Authorization:

1. `manager`
2. `mechanic`

Rules:

1. Timer may stop from `running` or `paused` depending on implementation policy.
2. The API must persist the new accumulated elapsed time.
3. Stopping the timer must not delete prior elapsed time.

## 31. Intervention Parts Endpoints

### 31.1 POST /interventions/{interventionId}/parts

Associates a part with an intervention and decreases stock automatically.

Authorization:

1. `manager`
2. `mechanic`

Headers:

1. `Idempotency-Key` required by policy for safe duplicate protection.

Request body:

```json
{
	"partReference": "BAT-XIA-PRO2-001",
	"quantity": 1,
	"note": "Installed new compatible battery pack."
}
```

Business rules:

1. `quantity` must be a positive integer.
2. The referenced part must exist.
3. Available stock must be sufficient.
4. Stock decrement and stock-movement creation are atomic side effects.

Failure cases:

1. `409 Conflict` if stock is insufficient.

### 31.2 GET /interventions/{interventionId}/parts

Returns all parts associated with an intervention.

Authorization:

1. `manager`
2. `mechanic`

## 32. Parts Endpoints

### 32.1 POST /parts

Creates a new catalog part.

Authorization:

1. `manager` only.

Request body:

```json
{
	"partReference": "BEAR-6201-REAR",
	"description": "Rear wheel bearing 6201",
	"supplierId": "sup_01JX9V23K1M9R3YGW0Q0C9F6MZ",
	"costPrice": "4.50",
	"salePrice": "12.00",
	"currentStock": 18,
	"minimumStock": 5
}
```

Rules:

1. `partReference` must be unique.
2. Prices must be non-negative.
3. Stock values must be non-negative integers.

### 32.2 GET /parts

Returns a paginated parts catalog.

Authorization:

1. `manager`
2. `mechanic`

Supported filters:

1. `partReference`
2. `description`
3. `supplierId`
4. `lowStock`

Supported sorting:

1. `partReference`
2. `description`
3. `currentStock`
4. `minimumStock`

### 32.3 GET /parts/{partReference}

Returns a single part record.

Authorization:

1. `manager`
2. `mechanic`

### 32.4 PATCH /parts/{partReference}

Updates editable part fields.

Authorization:

1. `manager` only.

Editable fields:

1. `description`
2. `supplierId`
3. `costPrice`
4. `salePrice`
5. `minimumStock`
6. `isArchived`

### 32.5 GET /parts/low-stock

Returns parts at or below their minimum stock threshold.

Authorization:

1. `manager`
2. `mechanic`

Response fields should include:

1. Part reference.
2. Description.
3. Current stock.
4. Minimum stock.
5. Supplier summary.

## 33. Stock-Movement Endpoints

### 33.1 GET /stock-movements

Returns stock-movement history.

Authorization:

1. `manager`
2. `mechanic`

Supported filters:

1. `partReference`
2. `movementType`
3. `originType`
4. `from`
5. `to`

Response fields:

1. `id`
2. `partReference`
3. `occurredAt`
4. `movementType`
5. `originType`
6. `originId`
7. `quantityDelta`
8. `balanceAfter`
9. `responsibleUserId`

### 33.2 POST /parts/{partReference}/stock-adjustments

Creates a manual stock adjustment.

Authorization:

1. `manager` only.

Request body:

```json
{
	"quantityDelta": -2,
	"reason": "Inventory correction after physical count."
}
```

Rules:

1. Manual adjustments are auditable.
2. The resulting stock balance must not be negative unless a future explicit policy allows it.

## 34. Supplier Endpoints

### 34.1 POST /suppliers

Creates a supplier.

Authorization:

1. `manager` only.

Request body:

```json
{
	"name": "MicroMobility Parts Iberia",
	"email": "orders@mm-iberia.pt",
	"phone": "+351253000111",
	"paymentTerms": "30_days"
}
```

### 34.2 GET /suppliers

Returns a paginated supplier list.

Authorization:

1. `manager`
2. `mechanic` may be allowed read access if needed for operational lookup

### 34.3 GET /suppliers/{supplierId}

Returns supplier detail.

Authorization:

1. `manager`
2. `mechanic` if read access is enabled

### 34.4 PATCH /suppliers/{supplierId}

Updates editable supplier fields.

Authorization:

1. `manager` only.

Editable fields:

1. `email`
2. `phone`
3. `paymentTerms`
4. `name`
5. `isArchived`

## 35. Purchase-Order Endpoints

### 35.1 POST /purchase-orders

Creates a purchase order.

Authorization:

1. `manager` only.

Request body:

```json
{
	"supplierId": "sup_01JX9V23K1M9R3YGW0Q0C9F6MZ",
	"items": [
		{
			"partReference": "BEAR-6201-REAR",
			"quantity": 10
		}
	]
}
```

Rules:

1. A purchase order must contain at least one item.
2. All items must belong to valid parts.
3. The supplier must exist.
4. Initial status is `requested`.

Side effects:

1. The system may trigger supplier email delivery depending on implementation policy.

### 35.2 POST /purchase-orders/generate-from-low-stock

Generates purchase-order drafts or direct purchase orders from low-stock parts grouped by supplier.

Authorization:

1. `manager` only.

Headers:

1. `Idempotency-Key` required.

Request options may include:

1. `createDrafts`
2. `sendEmails`
3. `supplierIds`

Response should include:

1. Generated purchase-order identifiers.
2. Grouped parts summary.
3. Any skipped parts lacking supplier assignment.

### 35.3 GET /purchase-orders

Returns purchase orders.

Authorization:

1. `manager` only.

Supported filters:

1. `supplierId`
2. `status`
3. `createdFrom`
4. `createdTo`

### 35.4 GET /purchase-orders/{purchaseOrderId}

Returns full purchase-order detail.

Authorization:

1. `manager` only.

### 35.5 PATCH /purchase-orders/{purchaseOrderId}

Updates editable purchase-order fields while the order is not yet received.

Authorization:

1. `manager` only.

Editable fields may include:

1. Item quantities.
2. Notes.
3. Email-send metadata.

### 35.6 PATCH /purchase-orders/{purchaseOrderId}/receive

Marks a purchase order as received and updates stock.

Authorization:

1. `manager` only.

Headers:

1. `Idempotency-Key` recommended.

Request body:

```json
{
	"receivedAt": "2026-02-24T16:45:00Z",
	"note": "Full order received and checked."
}
```

Side effects:

1. Sets purchase-order status to `received`.
2. Increments stock for each received item.
3. Creates stock-movement entries.
4. Records delivery timestamp.

Failure cases:

1. `409 Conflict` if the purchase order is already received.

## 36. Invoice and Payment Endpoints

### 36.1 POST /invoices

Issues an invoice from a completed service order.

Authorization:

1. `manager` only.

Headers:

1. `Idempotency-Key` required.

Request body:

```json
{
	"serviceOrderId": "so_01JXAF5G6P8Q2W5J2M1H6X7A3K",
	"paymentMethod": "cash",
	"note": "Customer will collect tomorrow morning."
}
```

Business rules:

1. The referenced service order must be in state `completed`.
2. The service order must not already have an issued invoice.
3. The invoice number is server-generated.
4. Labor, parts, VAT, subtotal, and total are computed server-side.

Successful response:

1. Status `201 Created`.
2. Returns the full invoice resource.

Failure cases:

1. `409 Conflict` if the service order is not eligible for invoicing.
2. `404 Not Found` if the service order does not exist.

### 36.2 GET /invoices

Returns a paginated invoice list.

Authorization:

1. `manager` only.

Supported filters:

1. `invoiceNumber`
2. `serviceOrderId`
3. `customerNif`
4. `paymentStatus`
5. `issuedFrom`
6. `issuedTo`
7. `customerType`

Supported sorting:

1. `issuedAt`
2. `invoiceNumber`
3. `total`

### 36.3 GET /invoices/{invoiceId}

Returns full invoice detail.

Authorization:

1. `manager` only.

Response fields include:

1. Internal resource identifier.
2. Immutable business invoice number.
3. Service-order reference.
4. Customer summary.
5. Labor totals.
6. Parts totals.
7. Subtotal.
8. VAT rate.
9. VAT amount.
10. Total.
11. Payment method.
12. Payment status.
13. Issued timestamp.

### 36.4 GET /invoices/{invoiceId}/pdf

Returns the rendered PDF representation of the invoice.

Authorization:

1. `manager` only.

Successful response:

1. Status `200 OK`.
2. Content type `application/pdf`.

### 36.5 POST /invoices/{invoiceId}/payments

Records a payment against an invoice.

Authorization:

1. `manager` only.

Headers:

1. `Idempotency-Key` required.

Request body:

```json
{
	"paymentMethod": "bank_transfer",
	"paymentStatus": "paid",
	"paidAt": "2026-02-26T11:15:00Z",
	"note": "Transferred by business customer."
}
```

Business rules:

1. Payment records are auditable.
2. The API must preserve the historical issued invoice data.
3. The payment action must not mutate fiscal totals.

### 36.6 GET /invoices/pending-business

Returns pending and overdue invoices for business customers.

Authorization:

1. `manager` only.

Supported filters:

1. `customerNif`
2. `status`
3. `dueBefore`

Response includes:

1. Customer summary.
2. Invoice number.
3. Issued date.
4. Due date if modeled.
5. Outstanding amount.
6. Current payment status.

## 37. Notification and Template Endpoints

### 37.1 GET /notifications

Returns notification history.

Authorization:

1. `manager` only.

Supported filters:

1. `notificationType`
2. `recipientEmail`
3. `deliveryStatus`
4. `from`
5. `to`

### 37.2 POST /notifications

Triggers an outbound notification explicitly.

Authorization:

1. `manager` only.

Headers:

1. `Idempotency-Key` recommended.

Request body:

```json
{
	"notificationType": "repair_completed",
	"serviceOrderId": "so_01JXAF5G6P8Q2W5J2M1H6X7A3K"
}
```

Business rules:

1. The server resolves recipient and template using resource data and configuration.
2. The rendered notification must be stored in notification history.

### 37.3 GET /notification-templates

Returns all configured notification templates.

Authorization:

1. `manager` only.

Response fields:

1. `id`
2. `templateKey`
3. `subjectTemplate`
4. `bodyTemplate`
5. `updatedAt`

### 37.4 PATCH /notification-templates/{templateId}

Updates a notification template.

Authorization:

1. `manager` only.

Editable fields:

1. `subjectTemplate`
2. `bodyTemplate`

Business rules:

1. Template updates are auditable.
2. Template rendering placeholders must be validated server-side.

## 38. Reporting Endpoints

All reporting endpoints are manager-only because they expose financial or strategic operational information.

Common query parameters:

1. `from`
2. `to`

The API accepts explicit date ranges rather than abstract period labels.

### 38.1 GET /reports/billing

Returns billing totals for the requested period.

Response fields should include:

1. Total billed amount.
2. Total labor amount.
3. Total parts amount.
4. Total VAT collected.
5. Invoice count.

### 38.2 GET /reports/costs

Returns cost-oriented data for the requested period.

Response fields should include:

1. Total parts cost.
2. Cost by part category if categories exist.
3. Cost by supplier if desired by implementation.

### 38.3 GET /reports/parts-usage

Returns the most used parts in the requested period.

Response fields should include:

1. Part reference.
2. Description.
3. Total quantity used.

### 38.4 GET /reports/common-failures

Returns the most common reported problems or diagnoses.

Response fields should include:

1. Failure label.
2. Occurrence count.
3. Optional brand/model breakdown.

### 38.5 GET /reports/repair-time

Returns repair-time metrics.

Response fields should include:

1. Average repair time.
2. Median repair time if implemented.
3. Time grouped by brand or repair category if supported.

### 38.6 GET /reports/mechanic-productivity

Returns productivity indicators by mechanic.

Response fields should include:

1. Mechanic identifier.
2. Mechanic name.
3. Total interventions.
4. Total accumulated labor time.
5. Completed service-order count if supported.

## 39. Configuration Endpoints

### 39.1 GET /config/financial-parameters

Returns the current hourly labor rate and VAT rate.

Authorization:

1. `manager` only.

Example response:

```json
{
	"hourlyLaborRate": "25.00",
	"vatRate": "23.00",
	"updatedAt": "2026-02-20T09:00:00Z",
	"updatedByUserId": "usr_01JX9S4D0J7J6X2G7XH2B2C1A3"
}
```

### 39.2 PATCH /config/financial-parameters

Updates financial parameters.

Authorization:

1. `manager` only.

Request body:

```json
{
	"hourlyLaborRate": "27.50",
	"vatRate": "23.00"
}
```

Business rules:

1. Changes apply to future calculations.
2. Already issued invoices remain unchanged.
3. The update is auditable.

## 40. Reusable Schema Catalog

This section defines the canonical data structures that should become reusable OpenAPI components.

### 40.1 Enumerations

Mandatory enums:

1. `UserRole`: `manager`, `mechanic`
2. `CustomerType`: `personal`, `business`
3. `ServiceOrderStatus`: `received`, `in-diagnosis`, `awaiting-customer-approval`, `awaiting-parts`, `in-repair`, `completed`, `delivered`
4. `TimerState`: `idle`, `running`, `paused`, `stopped`
5. `PurchaseOrderStatus`: `requested`, `received`
6. `PaymentStatus`: `pending`, `paid`, `overdue`
7. `NotificationType`: `reception_confirmation`, `budget_request`, `repair_completed`, `awaiting_parts_delay`

### 40.2 Shared Value Objects

Recommended reusable component schemas:

1. `Money`
2. `Address`
3. `AuditMetadata`
4. `PaginationEnvelope`
5. `CursorPaginationEnvelope`
6. `ProblemResponse`
7. `ValidationProblemResponse`
8. `CustomerSummary`
9. `ScooterSummary`
10. `ServiceOrderSummary`
11. `ServiceOrderDetail`
12. `Diagnosis`
13. `Budget`
14. `InterventionSummary`
15. `InterventionDetail`
16. `PartSummary`
17. `StockMovement`
18. `SupplierSummary`
19. `PurchaseOrderDetail`
20. `InvoiceDetail`
21. `NotificationRecord`

### 40.3 Money Schema Requirements

Every money-bearing schema must:

1. Use decimal string or explicit fixed-precision numeric representation compatible with OpenAPI and implementation constraints.
2. Preserve two decimal places for currency values.
3. Include the currency if the implementation wishes to be explicit, though the baseline assumption is euro.

## 41. Worked API Flows

The following flows are normative examples and should be represented in OpenAPI examples.

### 41.1 Flow A: Create Customer, Scooter, and Service Order

1. `POST /customers`
2. `POST /scooters`
3. `POST /service-orders`
4. Optional automatic notification: reception confirmation

### 41.2 Flow B: Diagnose and Submit Budget

1. `PATCH /service-orders/{id}/diagnosis`
2. `PATCH /service-orders/{id}/budget`
3. `PATCH /service-orders/{id}/status` to `awaiting-customer-approval`
4. `POST /notifications` or automatic notification using the budget template

### 41.3 Flow C: Record Approval and Begin Repair

1. `POST /service-orders/{id}/budget/approval`
2. `PATCH /service-orders/{id}/status` to `in-repair` or `awaiting-parts`

### 41.4 Flow D: Execute Intervention with Timer and Parts

1. `POST /service-orders/{id}/interventions`
2. `POST /interventions/{id}/timer/start`
3. `POST /interventions/{id}/parts`
4. `POST /interventions/{id}/timer/pause`
5. `POST /interventions/{id}/timer/start`
6. `POST /interventions/{id}/timer/stop`

Expected side effects:

1. Elapsed labor time is accumulated.
2. Stock decreases atomically.
3. Stock-movement history is created.

### 41.5 Flow E: Complete and Invoice a Service Order

1. `PATCH /service-orders/{id}/status` to `completed`
2. `POST /invoices`
3. `GET /invoices/{invoiceId}/pdf`
4. Optional notification of completed repair

### 41.6 Flow F: Record Payment

1. `POST /invoices/{invoiceId}/payments`
2. `GET /invoices/{invoiceId}`

### 41.7 Flow G: Replenish Low Stock

1. `GET /parts/low-stock`
2. `POST /purchase-orders/generate-from-low-stock`
3. `PATCH /purchase-orders/{id}/receive`

## 42. Requirement Traceability Matrix

This matrix maps the functional requirements to API areas so implementation and review can verify complete coverage.

| Requirement Area | API Coverage |
| --- | --- |
| Customer registration and differentiation | `POST /customers`, `GET /customers`, `GET /customers/{nif}`, `PATCH /customers/{nif}` |
| Business-customer credit visibility | `GET /customers/{nif}/history`, `GET /invoices/pending-business` |
| Scooter registration and history | `POST /scooters`, `GET /scooters/{serialNumber}`, `GET /scooters/{serialNumber}/repairs` |
| Service-order creation and lifecycle | `POST /service-orders`, `PATCH /service-orders/{id}/status`, `GET /service-orders/{id}/history`, `GET /service-orders/summary` |
| Diagnosis and budgeting | `PATCH /service-orders/{id}/diagnosis`, `PATCH /service-orders/{id}/budget`, `POST /service-orders/{id}/budget/approval` |
| Multiple interventions and timing | `POST /service-orders/{id}/interventions`, timer action endpoints |
| Parts catalog and automatic stock consumption | `POST /parts`, `PATCH /parts/{partReference}`, `POST /interventions/{id}/parts`, `GET /stock-movements` |
| Low-stock alerts and pre-orders | `GET /parts/low-stock`, `POST /purchase-orders/generate-from-low-stock` |
| Supplier management | `/suppliers` endpoints |
| Purchase-order lifecycle | `/purchase-orders` endpoints |
| Invoice generation and fiscal calculation | `POST /invoices`, `GET /invoices/{id}`, `GET /invoices/{id}/pdf`, config endpoints |
| Payment state and pending business invoices | `POST /invoices/{id}/payments`, `GET /invoices/pending-business` |
| Notifications and editable templates | `/notifications` endpoints, `/notification-templates` endpoints |
| Reporting | `/reports/*` endpoints |
| Login and role-based access | `/auth/*` endpoints and authorization rules in Sections 9 and 10 |

## 43. Non-Functional and Compliance Coverage

The following non-functional and compliance concerns are enforced by the API contract.

1. Sequential numbering integrity for invoices is addressed in Sections 13 and 21.
2. Auditability is addressed in Section 16.
3. RBAC restrictions are addressed in Section 10 and repeated in endpoint sections.
4. Browser-based operational use is supported by cookie-based authentication and JSON endpoints.
5. Notification-by-email requirements are addressed in Sections 22 and 37.
6. Data integrity for stock and invoice issuance is addressed through transactional and idempotency rules in Sections 13, 20, and 21.
7. Archive-over-delete behavior is addressed in Section 15.

## 44. OpenAPI Assembly Notes

When converting this document into OpenAPI 3.1:

1. Each endpoint in Sections 24 through 39 must become an OpenAPI path item.
2. Shared structures in Section 40 must become reusable component schemas.
3. The error format in Section 11 must become reusable response components.
4. Authorization rules should be expressed through security requirements and documented role notes.
5. Every workflow-critical endpoint should include at least one success example and one conflict example.
6. Idempotent command endpoints should document the `Idempotency-Key` header explicitly.

## 45. Final Normative Notes

1. This specification treats service-order workflow and invoice issuance as business commands, not generic CRUD updates.
2. Financial totals are always server-calculated.
3. Invoice numbers and service-order numbers are always server-generated.
4. Issued invoices are immutable except for permitted payment-state updates or future explicit reversal mechanisms.
5. The API must remain consistent with the single-workshop scope and must not introduce multi-tenant complexity unless requirements change.
6. The baseline contract allows exactly one issued invoice per service order.
