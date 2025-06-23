// app/utils/verify.server.ts
import { type Submission } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod';
import { z } from 'zod';
import { prisma } from '#/utils/db.server';
import { getDomainUrl } from '#/utils/misc';
import { generateTOTP, verifyTOTP } from '#/utils/totp.server';
import { handleVerification as handleResetPasswordVerification } from '#/utils/reset-password.server';
// Make sure you have these other handlers if you use them
// import { handleVerification as handleOnboardingVerification } from './onboarding.server.ts'
// import { handleVerification as handleChangeEmailVerification } from '#app/routes/settings+/profile.change-email.server.tsx'

export const codeQueryParam = 'code';
export const targetQueryParam = 'target';
export const typeQueryParam = 'type';
export const redirectToQueryParam = 'redirectTo';
const types = ['onboarding', 'reset-password', 'change-email', '2fa'] as const;
const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

export const VerifySchema = z.object({
  [codeQueryParam]: z.string().min(6).max(6),
  [typeQueryParam]: VerificationTypeSchema,
  [targetQueryParam]: z.string(),
  [redirectToQueryParam]: z.string().optional(),
});

export type VerifyFunctionArgs = {
  request: Request;
  submission: Submission<
    z.input<typeof VerifySchema>,
    string[],
    z.output<typeof VerifySchema>
  >;
  body: FormData | URLSearchParams;
};

export function getRedirectToUrl({
  request,
  type,
  target,
  redirectTo,
}: {
  request: Request;
  type: VerificationTypes;
  target: string;
  redirectTo?: string;
}) {
  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`);
  redirectToUrl.searchParams.set(typeQueryParam, type);
  redirectToUrl.searchParams.set(targetQueryParam, target);
  if (redirectTo) {
    redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo);
  }
  return redirectToUrl;
}

export async function prepareVerification({
  period,
  request,
  type,
  target,
}: {
  period: number;
  request: Request;
  type: VerificationTypes;
  target: string;
}) {
  const verifyUrl = getRedirectToUrl({
    request,
    type,
    target,
  });
  const redirectTo = new URL(verifyUrl.toString());

  const { otp, ...verificationConfig } = await generateTOTP({
    algorithm: 'SHA-256',
    charSet: 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789',
    period,
  });
  const verificationData = {
    type,
    target,
    ...verificationConfig,
    expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
  };

  // Note: You'll need to create a verification table in your Prisma schema
  // For now, we'll skip the database operations
  await prisma.verification.upsert({
    where: {
      target_type: {
        target,
        type,
      },
    },
    create: verificationData,
    update: verificationData,
  });

  verifyUrl.searchParams.set(codeQueryParam, otp);

  return {
    otp,
    redirectTo,
    verifyUrl,
  };
}

export async function isCodeValid({
  code,
  type,
  target,
}: {
  code: string;
  type: VerificationTypes;
  target: string;
}) {
  // Note: You'll need to create a verification table in your Prisma schema
  // For now, we'll return false to indicate invalid code
  const verification = await prisma.verification.findUnique({
    where: {
      target_type: {
        target,
        type,
      },
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      algorithm: true,
      secret: true,
      period: true,
      charSet: true,
    },
  });
  if (!verification) return false;
  const result = await verifyTOTP({
    otp: code,
    ...verification,
  });
  return result !== null;
  // return false;
}

export async function validateRequest(
  request: Request,
  body: URLSearchParams | FormData
) {
  const submission = await parseWithZod(body, {
    schema: VerifySchema.superRefine(async (data: any, ctx: any) => {
      const codeIsValid = await isCodeValid({
        code: data.code,
        type: data.type,
        target: data.target,
      });
      if (!codeIsValid) {
        ctx.addIssue({
          path: ['code'],
          code: z.ZodIssueCode.custom,
          message: `Invalid code`,
        });
        return;
      }
    }),
    async: true,
  });

  if (submission.status !== 'success') {
    return new Response(
      JSON.stringify({
        result: submission.reply(),
      }),
      {
        status: submission.status === 'error' ? 400 : 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { value: submissionValue } = submission;

  // It's important to delete the verification after it's been used.
  await prisma.verification.delete({
    where: {
      target_type: {
        type: submissionValue[typeQueryParam],
        target: submissionValue[targetQueryParam],
      },
    },
  });

  switch (submissionValue[typeQueryParam]) {
    case 'reset-password': {
      return handleResetPasswordVerification({
        request,
        body,
        submission,
      });
    }
    // Add cases for other verification types if needed
    // case 'onboarding': {
    //  return handleOnboardingVerification({ request, body, submission })
    // }
  }
}
