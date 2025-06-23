// app/routes/reset-password.server.ts
import { invariantResponse } from '#/utils/misc';
import { redirect } from 'react-router';
import { prisma } from '#/utils/db.server';
import { verifySessionStorage } from '#/utils/verification.server';
import { resetPasswordEmailSessionKey } from '#/routes/auth/reset-password';
import { type VerifyFunctionArgs } from '#/utils/verify.server';

export async function handleVerification({ submission }: VerifyFunctionArgs) {
  invariantResponse(
    submission.status === 'success',
    'Submission should be successful by now'
  );
  const target = submission.value.target;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: target,
        },
        {
          username: target,
        },
      ],
    },
    select: {
      email: true,
      username: true,
    },
  });

  if (!user) {
    return new Response(
      JSON.stringify({
        result: submission.reply({
          fieldErrors: {
            code: ['Invalid code'],
          },
        }),
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const verifySession = await verifySessionStorage.getSession();
  verifySession.set(resetPasswordEmailSessionKey, user.email);
  return redirect('/reset-password', {
    headers: {
      'set-cookie': await verifySessionStorage.commitSession(verifySession),
    },
  });
}
