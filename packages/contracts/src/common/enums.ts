export const userRoles = ['manager', 'mechanic'] as const;
export type UserRole = (typeof userRoles)[number];

export const customerTypes = ['personal', 'business'] as const;
export type CustomerType = (typeof customerTypes)[number];

export const serviceOrderStatuses = [
  'received',
  'in-diagnosis',
  'awaiting-customer-approval',
  'awaiting-parts',
  'in-repair',
  'completed',
  'delivered',
] as const;
export type ServiceOrderStatus = (typeof serviceOrderStatuses)[number];

export const timerStates = ['idle', 'running', 'paused', 'stopped'] as const;
export type TimerState = (typeof timerStates)[number];

export const purchaseOrderStatuses = ['requested', 'received'] as const;
export type PurchaseOrderStatus = (typeof purchaseOrderStatuses)[number];

export const paymentStatuses = ['pending', 'paid', 'overdue'] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const notificationTypes = [
  'reception_confirmation',
  'budget_request',
  'repair_completed',
  'awaiting_parts_delay',
] as const;
export type NotificationType = (typeof notificationTypes)[number];
