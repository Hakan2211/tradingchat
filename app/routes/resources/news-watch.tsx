// app/routes/resources/news-watch.tsx
import { type ActionFunctionArgs, data } from 'react-router';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { prisma } from '#/utils/db.server';
import { requireNewsAccess } from '#/utils/news.server';
import { NEWS_CATALYSTS } from '#/utils/news/constants';
import {
  MAX_WATCH_RULES,
  MAX_WATCH_TICKERS,
  isUnconstrained,
  parseTickerInput,
} from '#/utils/news/watch';

/**
 * Watch-rule CRUD.
 *
 * Unlike `resources/scanner.tsx` this is NOT staff-gated: watch rules are
 * personal, so the guard is the same one the feed itself uses — an active
 * member or staff. Every write is scoped by `userId` through `updateMany` /
 * `deleteMany` rather than `update({ where: { id } })`, so a guessed cuid
 * cannot touch another member's rules.
 */

const CATALYST_VALUES = NEWS_CATALYSTS as unknown as [string, ...string[]];

const RuleFields = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Give the rule a name')
    .max(40, 'Keep the name under 40 characters'),
  // One free-text field, split on commas and spaces — faster to type at 09:25
  // than a tag widget, and it round-trips cleanly when editing.
  tickers: z.string().optional(),
  catalysts: z.array(z.enum(CATALYST_VALUES)).optional(),
  minScore: z.coerce
    .number()
    .int()
    .min(0, 'Minimum score cannot be negative')
    .max(100, 'Scores only go to 100')
    .default(0),
  // An unchecked checkbox is absent from the form data entirely.
  sound: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
  enabled: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
});

const CreateWatchSchema = RuleFields;
const UpdateWatchSchema = RuleFields.extend({
  id: z.string().min(1, 'Rule ID is required'),
});
const IdSchema = z.object({ id: z.string().min(1, 'Rule ID is required') });

/** Form values -> the columns, with the two JSON lists encoded. */
function toColumns(value: z.infer<typeof RuleFields>) {
  const tickers = parseTickerInput(value.tickers ?? '');
  const catalysts = value.catalysts ?? [];

  if (tickers.length > MAX_WATCH_TICKERS) {
    return {
      error: `A rule can watch at most ${MAX_WATCH_TICKERS} symbols.`,
    } as const;
  }

  if (isUnconstrained({ tickers, catalysts, minScore: value.minScore })) {
    // Otherwise the rule matches every wire item on every poll — hundreds an
    // hour, each one a toast. Refuse the shape rather than let a member turn
    // their own screen into a strobe and blame the feed.
    return {
      error:
        'Add at least one ticker, catalyst or minimum score — a rule with none matches every headline.',
    } as const;
  }

  return {
    columns: {
      label: value.label,
      tickers: tickers.length ? JSON.stringify(tickers) : null,
      catalysts: catalysts.length ? JSON.stringify(catalysts) : null,
      minScore: value.minScore,
      sound: value.sound,
      enabled: value.enabled,
    },
  } as const;
}

export async function action({ request }: ActionFunctionArgs) {
  const { userId } = await requireNewsAccess(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'create': {
      const submission = parseWithZod(formData, { schema: CreateWatchSchema });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const built = toColumns(submission.value);
      if ('error' in built) {
        return data({ error: built.error }, { status: 400 });
      }

      const count = await prisma.newsWatch.count({ where: { userId } });
      if (count >= MAX_WATCH_RULES) {
        return data(
          { error: `You already have ${MAX_WATCH_RULES} rules. Delete one first.` },
          { status: 400 }
        );
      }

      await prisma.newsWatch.create({
        data: { ...built.columns, userId },
      });
      return data({ success: true });
    }

    case 'update': {
      const submission = parseWithZod(formData, { schema: UpdateWatchSchema });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const built = toColumns(submission.value);
      if ('error' in built) {
        return data({ error: built.error }, { status: 400 });
      }

      const { count } = await prisma.newsWatch.updateMany({
        where: { id: submission.value.id, userId },
        data: built.columns,
      });
      if (count === 0) return data({ error: 'Rule not found' }, { status: 404 });

      return data({ success: true });
    }

    // Separate from `update` so the on/off switch in the list does not have to
    // round-trip every other field to flip one boolean.
    case 'toggle': {
      const submission = parseWithZod(formData, { schema: IdSchema });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const rule = await prisma.newsWatch.findFirst({
        where: { id: submission.value.id, userId },
        select: { enabled: true },
      });
      if (!rule) return data({ error: 'Rule not found' }, { status: 404 });

      await prisma.newsWatch.updateMany({
        where: { id: submission.value.id, userId },
        data: { enabled: !rule.enabled },
      });
      return data({ success: true });
    }

    case 'delete': {
      const submission = parseWithZod(formData, { schema: IdSchema });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const { count } = await prisma.newsWatch.deleteMany({
        where: { id: submission.value.id, userId },
      });
      if (count === 0) return data({ error: 'Rule not found' }, { status: 404 });

      return data({ success: true });
    }

    default:
      return data({ error: 'Invalid intent' }, { status: 400 });
  }
}
