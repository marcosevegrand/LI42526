import { z } from 'zod';

import { isoDateSchema } from '../common/primitives';

export const reportPeriodSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
});
