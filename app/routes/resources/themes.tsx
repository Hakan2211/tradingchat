// app/routes/resources/themes.tsx
import { type ActionFunctionArgs, data } from 'react-router';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';

// Helper: check if user has admin or moderator role
async function requireThemeEditor(request: Request) {
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
        message:
          'You must be an admin or moderator to manage themes.',
      },
      { status: 403 }
    );
  }
  return user.id;
}

// --- Theme Schemas ---

const CreateThemeSchema = z.object({
  name: z
    .string()
    .min(1, 'Theme name is required')
    .max(50, 'Theme name must be 50 characters or less')
    .transform((v) => v.trim()),
  description: z.string().optional(),
});

const UpdateThemeSchema = z.object({
  id: z.string().min(1, 'Theme ID is required'),
  name: z
    .string()
    .min(1, 'Theme name is required')
    .max(50, 'Theme name must be 50 characters or less')
    .transform((v) => v.trim()),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  sortOrder: z.coerce.number().int().optional(),
});

const DeleteThemeSchema = z.object({
  id: z.string().min(1, 'Theme ID is required'),
});

// --- Ticker Schemas ---

const AddTickerSchema = z.object({
  themeId: z.string().min(1, 'Theme ID is required'),
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(10, 'Ticker must be 10 characters or less')
    .transform((v) => v.toUpperCase().trim()),
  role: z.enum(['LEADER', 'SYMPATHY']).default('SYMPATHY'),
  float: z.string().optional(),
  volume: z.string().optional(),
  marketCap: z.string().optional(),
  priceAtAdd: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const UpdateTickerSchema = z.object({
  id: z.string().min(1, 'Ticker entry ID is required'),
  ticker: z
    .string()
    .min(1, 'Ticker is required')
    .max(10, 'Ticker must be 10 characters or less')
    .transform((v) => v.toUpperCase().trim()),
  role: z.enum(['LEADER', 'SYMPATHY']),
  float: z.string().optional(),
  volume: z.string().optional(),
  marketCap: z.string().optional(),
  priceAtAdd: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const RemoveTickerSchema = z.object({
  id: z.string().min(1, 'Ticker entry ID is required'),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  switch (intent) {
    // ==================== THEME CRUD ====================
    case 'createTheme': {
      const userId = await requireThemeEditor(request);
      const submission = parseWithZod(formData, {
        schema: CreateThemeSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const { name, description } = submission.value;

      const existing = await prisma.theme.findUnique({
        where: { name },
      });
      if (existing) {
        return data(
          {
            result: submission.reply({
              fieldErrors: { name: ['A theme with this name already exists'] },
            }),
          },
          { status: 400 }
        );
      }

      // Get the max sortOrder to place new theme at the end
      const maxSort = await prisma.theme.aggregate({
        _max: { sortOrder: true },
      });

      const theme = await prisma.theme.create({
        data: {
          name,
          description: description || null,
          sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
          createdById: userId,
        },
      });

      return data({ success: true, theme });
    }

    case 'updateTheme': {
      await requireThemeEditor(request);
      const submission = parseWithZod(formData, {
        schema: UpdateThemeSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const { id, name, description, status, sortOrder } = submission.value;

      // Check for duplicate name (excluding self)
      const existing = await prisma.theme.findFirst({
        where: { name, id: { not: id } },
      });
      if (existing) {
        return data(
          {
            result: submission.reply({
              fieldErrors: { name: ['A theme with this name already exists'] },
            }),
          },
          { status: 400 }
        );
      }

      const theme = await prisma.theme.update({
        where: { id },
        data: {
          name,
          description: description || null,
          status,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        },
      });

      return data({ success: true, theme });
    }

    case 'deleteTheme': {
      await requireThemeEditor(request);
      const submission = parseWithZod(formData, {
        schema: DeleteThemeSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      await prisma.theme.delete({
        where: { id: submission.value.id },
      });

      return data({ success: true });
    }

    // ==================== TICKER CRUD ====================
    case 'addTicker': {
      const userId = await requireThemeEditor(request);
      const submission = parseWithZod(formData, {
        schema: AddTickerSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const {
        themeId,
        ticker,
        role,
        float: floatVal,
        volume,
        marketCap,
        priceAtAdd,
        notes,
        sortOrder,
      } = submission.value;

      // Check for duplicate ticker in this theme
      const existing = await prisma.themeTicker.findUnique({
        where: { themeId_ticker: { themeId, ticker } },
      });
      if (existing) {
        return data(
          {
            result: submission.reply({
              fieldErrors: {
                ticker: ['This ticker is already in this theme'],
              },
            }),
          },
          { status: 400 }
        );
      }

      // Get the max sortOrder to place new ticker at the end
      const maxSort = await prisma.themeTicker.aggregate({
        where: { themeId },
        _max: { sortOrder: true },
      });

      const themeTicker = await prisma.themeTicker.create({
        data: {
          ticker,
          role,
          float: floatVal || null,
          volume: volume || null,
          marketCap: marketCap || null,
          priceAtAdd: priceAtAdd || null,
          notes: notes || null,
          sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
          themeId,
          addedById: userId,
        },
      });

      return data({ success: true, themeTicker });
    }

    case 'updateTicker': {
      await requireThemeEditor(request);
      const submission = parseWithZod(formData, {
        schema: UpdateTickerSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      const {
        id,
        ticker,
        role,
        float: floatVal,
        volume,
        marketCap,
        priceAtAdd,
        notes,
        sortOrder,
      } = submission.value;

      const themeTicker = await prisma.themeTicker.update({
        where: { id },
        data: {
          ticker,
          role,
          float: floatVal || null,
          volume: volume || null,
          marketCap: marketCap || null,
          priceAtAdd: priceAtAdd || null,
          notes: notes || null,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
        },
      });

      return data({ success: true, themeTicker });
    }

    case 'removeTicker': {
      await requireThemeEditor(request);
      const submission = parseWithZod(formData, {
        schema: RemoveTickerSchema,
      });
      if (submission.status !== 'success') {
        return data({ result: submission.reply() }, { status: 400 });
      }

      await prisma.themeTicker.delete({
        where: { id: submission.value.id },
      });

      return data({ success: true });
    }

    default:
      return data({ error: 'Invalid intent' }, { status: 400 });
  }
}
