// app/routes/resources/change-password.tsx

import { type ActionFunctionArgs } from 'react-router';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
// 1. Import the functions we need
import {
  requireUserId,
  resetUserPassword,
  verifyUserPassword,
} from '#/utils/auth.server';
import { redirectWithToast } from '#/utils/toaster.server';
import { prisma } from '#/utils/db.server';

// Define the schema for the form
const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: ChangePasswordSchema });
  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { currentPassword, newPassword } = submission.value;

  // 2. AUTHORIZATION STEP: Prove the user knows their current password.
  const isPasswordValid = await verifyUserPassword(
    { id: userId },
    currentPassword
  );
  if (!isPasswordValid) {
    return submission.reply({
      fieldErrors: { currentPassword: ['Invalid current password'] },
    });
  }

  // 3. ACTION STEP: If authorized, get the user's email and call the existing, trusted function.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  await resetUserPassword({
    email: user.email,
    password: newPassword, // Pass the new password to the function
  });

  // 4. RESPOND with success.
  return redirectWithToast(`/user/${userId}`, {
    // Or wherever you'd like them to land
    title: 'Password Changed',
    description: 'Your password has been updated successfully.',
    type: 'success',
  });
}
