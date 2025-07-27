import { z } from 'zod';
import { TradeDirection, TradeOutcome } from '@prisma/client';

export const CreateFormSchema = z.object({
  ticker: z.string().min(1, 'Ticker is required.').toUpperCase(),
  tradeDate: z.string().datetime('Invalid date format.'),
  direction: z.nativeEnum(TradeDirection),
  outcome: z.nativeEnum(TradeOutcome),
  pnl: z.coerce.number().optional(),
  tradeThesis: z.string().optional(),
  executionQuality: z.string().optional(),
  lessonsLearned: z.string().optional(),
});

export const EditFormSchema = CreateFormSchema.extend({
  imagesToDelete: z.array(z.string()).optional(),
  _intent: z.literal('update'),
});
