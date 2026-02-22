// app/routes/resources/scanner.tsx
import { type ActionFunctionArgs, data } from 'react-router';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';

// Helper: check if user has admin or moderator role
async function requireScannerEditor(request: Request) {
  const userId = await requireUserId(request);
  const user = await prisma.user.findFirst({
    select: { id: true },
    where: {
      id: userId,
      roles: {
        some: {
          name: { in: ['admin', 'moderator'] },
        },
      },
    },
  });
  if (!user) {
    throw data(
      {
        error: 'Unauthorized',
        message: 'You must be an admin or moderator to manage scanner entries.',
      },
      { status: 403 }
    );
  }
  return user.id;
}

const CreateScannerSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(10, 'Ticker must be 10 characters or less')
    .transform((v) => v.toUpperCase().trim()),
  targetDate: z.string().min(1, 'Target date is required'),
  volume: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  setupType: z.string().optional(),
  priceLevels: z.string().optional(),
});

const UpdateScannerSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(10, 'Ticker must be 10 characters or less')
    .transform((v) => v.toUpperCase().trim()),
  targetDate: z.string().min(1, 'Target date is required'),
  volume: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  setupType: z.string().optional(),
  status: z.enum(['WATCHING', 'PLAYED_OUT', 'DIDNT_PLAY_OUT']),
  outcomeNotes: z.string().optional(),
  executionGapNotes: z.string().optional(),
  priceLevels: z.string().optional(),
});

const UpdateStatusSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
  status: z.enum(['WATCHING', 'PLAYED_OUT', 'DIDNT_PLAY_OUT']),
});

const DeleteScannerSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    case 'create': {
      const userId = await requireScannerEditor(request);
      const submission = parseWithZod(formData, {
        schema: CreateScannerSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const { ticker, targetDate, volume, description, setupType, priceLevels } =
        submission.value;

      const entry = await prisma.scannerEntry.create({
        data: {
          ticker,
          targetDate: new Date(targetDate),
          volume: volume || null,
          description,
          setupType: setupType || null,
          priceLevels: priceLevels || null,
          createdById: userId,
        },
      });

      return data({ success: true, entry });
    }

    case 'update': {
      await requireScannerEditor(request);
      const submission = parseWithZod(formData, {
        schema: UpdateScannerSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const {
        id,
        ticker,
        targetDate,
        volume,
        description,
        setupType,
        status,
        outcomeNotes,
        executionGapNotes,
        priceLevels,
      } = submission.value;

      const entry = await prisma.scannerEntry.update({
        where: { id },
        data: {
          ticker,
          targetDate: new Date(targetDate),
          volume: volume || null,
          description,
          setupType: setupType || null,
          status,
          outcomeNotes: outcomeNotes || null,
          executionGapNotes: executionGapNotes || null,
          priceLevels: priceLevels || null,
        },
      });

      return data({ success: true, entry });
    }

    case 'updateStatus': {
      await requireScannerEditor(request);
      const submission = parseWithZod(formData, {
        schema: UpdateStatusSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const { id, status } = submission.value;

      const entry = await prisma.scannerEntry.update({
        where: { id },
        data: { status },
      });

      return data({ success: true, entry });
    }

    case 'delete': {
      await requireScannerEditor(request);
      const submission = parseWithZod(formData, {
        schema: DeleteScannerSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      await prisma.scannerEntry.delete({
        where: { id: submission.value.id },
      });

      return data({ success: true });
    }

    default:
      return data({ error: 'Invalid intent' }, { status: 400 });
  }
}
