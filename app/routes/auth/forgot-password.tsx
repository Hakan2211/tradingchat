// app/routes/forgot-password.tsx
import {
  getFormProps,
  getInputProps,
  useForm,
  type SubmissionResult,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Link,
  useFetcher,
} from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { z } from 'zod';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import { GeneralErrorBoundary } from '#/components/errorBoundary/errorBoundary';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { requireAnonymous } from '#/utils/auth.server';
import { validateCSRF } from '#/utils/csrf.server';
import { prisma } from '#/utils/db.server';
import { sendEmail } from '#/utils/email.server';
import { checkHoneypot } from '#/utils/honeypot.server';
import { useIsSubmitting } from '#/utils/misc';
import { EmailSchema, UsernameSchema } from '#/utils/user-validation';
import { prepareVerification } from '#/utils/verify.server';
import * as E from '@react-email/components';

const ForgotPasswordSchema = z.object({
  usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
});

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAnonymous(request);
  const formData = await request.formData();
  await validateCSRF(formData, request.headers);
  checkHoneypot(formData);

  const submission = await parseWithZod(formData, {
    schema: ForgotPasswordSchema.superRefine(async (data, ctx) => {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            {
              email: data.usernameOrEmail,
            },
            {
              username: data.usernameOrEmail,
            },
          ],
        },
        select: {
          id: true,
        },
      });
      if (!user) {
        ctx.addIssue({
          path: ['usernameOrEmail'],
          code: z.ZodIssueCode.custom,
          message: 'No user exists with this username or email',
        });
        return;
      }
    }),
    async: true,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { usernameOrEmail } = submission.value;
  const user = await prisma.user.findFirstOrThrow({
    where: {
      OR: [
        {
          email: usernameOrEmail,
        },
        {
          username: usernameOrEmail,
        },
      ],
    },
    select: {
      email: true,
      username: true,
    },
  });

  console.log('✅ User found:', user.email);

  const { verifyUrl, redirectTo, otp } = await prepareVerification({
    period: 10 * 60, // 10 minutes
    request,
    type: 'reset-password',
    target: user.email,
  });

  console.log(
    '✅ Verification prepared. Redirecting to:',
    redirectTo.toString()
  );

  const response = await sendEmail({
    to: user.email,
    subject: `Password Reset`,
    react: (
      <ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
    ),
  });
  console.log('✅ Email service response:', response);

  if (response.status === 'success') {
    console.log('✅ Email status is SUCCESS. Attempting redirect...');
    return { status: 'success' };
  } else {
    console.error('❌ Email status is ERROR.', response.error);
    return submission.reply({
      formErrors: [response.error.message],
    });
  }
}

function ForgotPasswordEmail({
  onboardingUrl,
  otp,
}: {
  onboardingUrl: string;
  otp: string;
}) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <h1>Password Reset</h1>
        <p>
          Here's your verification code: <strong>{otp}</strong>
        </p>
        <p>Or click the link:</p>
        <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
      </E.Container>
    </E.Html>
  );
}

export default function ForgotPasswordRoute() {
  //const actionData = useActionData();
  const fetcher = useFetcher<typeof action>();
  const isSubmitting = useIsSubmitting();

  const [form, fields] = useForm({
    id: 'forgot-password-form',
    constraint: getZodConstraint(ForgotPasswordSchema),
    lastResult: fetcher.data as SubmissionResult<string[]> | null,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: ForgotPasswordSchema,
      });
    },
    shouldRevalidate: 'onInput',
  });

  if (fetcher.data?.status === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We've sent a password reset link to your email address. Please check
            your inbox.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl"> Forgot Password</CardTitle>
        <CardDescription>
          No worries, we 'll send you reset instructions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fetcher.Form method="POST" {...getFormProps(form)}>
          <AuthenticityTokenInput />
          <HoneypotInputs />
          <ErrorAlert id={form.errorId} errors={form.errors} />
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor={fields.usernameOrEmail.id}>
                {' '}
                Username or Email{' '}
              </Label>
              <Input
                {...getInputProps(fields.usernameOrEmail, {
                  type: 'text',
                })}
                autoFocus
              />
              <ErrorAlert
                id={fields.usernameOrEmail.errorId}
                errors={fields.usernameOrEmail.errors}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={fetcher.state !== 'idle'}
            >
              {fetcher.state !== 'idle' ? 'Sending...' : 'Recover password'}
            </Button>
          </div>
        </fetcher.Form>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="underline underline-offset-4">
            Back to Login{' '}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
