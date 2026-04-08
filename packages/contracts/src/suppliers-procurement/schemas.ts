import { z } from 'zod';

export const supplierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  paymentTerms: z.string().min(1),
});

export const purchaseOrderItemSchema = z.object({
  partReference: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const purchaseOrderSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string().min(1),
  items: z.array(purchaseOrderItemSchema).min(1),
});
