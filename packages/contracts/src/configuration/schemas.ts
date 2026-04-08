import { z } from 'zod';

import { moneySchema } from '../common/primitives';

export const financialParametersSchema = z.object({
  hourlyLaborRate: moneySchema,
  vatRate: moneySchema,
});
