// app/routes/reset-password.tsx
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Form,
  redirect,
  useActionData,
  useLoaderData,
} from 'react-router';
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
import {
  checkIsCommonPassword,
  requireAnonymous,
  resetUserPassword,
} from '#/utils/auth.server';
import { useIsSubmitting } from '#/utils/misc';
import { PasswordAndConfirmPasswordSchema } from '#/utils/user-validation';
import { verifySessionStorage } from '#/utils/verification.server';

export const resetPasswordEmailSessionKey = 'resetPasswordEmail';

const ResetPasswordSchema = PasswordAndConfirmPasswordSchema;

type LoaderData = {
  resetPasswordEmail: string;
};

async function requireResetPasswordUsername(request: Request) {
  await requireAnonymous(request);
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  );
  const resetPasswordEmail = verifySession.get(resetPasswordEmailSessionKey);
  if (typeof resetPasswordEmail !== 'string' || !resetPasswordEmail) {
    throw redirect('/login');
  }
  return resetPasswordEmail;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const resetPasswordEmail = await requireResetPasswordUsername(request);
  return new Response(JSON.stringify({ resetPasswordEmail }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const resetPasswordEmail = await requireResetPasswordUsername(request);
  const formData = await request.formData();
  const submission = await parseWithZod(formData, {
    schema: ResetPasswordSchema.superRefine(async ({ password }, ctx) => {
      const isCommonPassword = await checkIsCommonPassword(password);
      if (isCommonPassword) {
        ctx.addIssue({
          path: ['password'],
          code: 'custom',
          message: 'Password is too common',
        });
      }
    }),
    async: true,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const { password } = submission.value;

  await resetUserPassword({
    email: resetPasswordEmail,
    password,
  });

  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  );

  return redirect('/login', {
    headers: {
      'set-cookie': await verifySessionStorage.destroySession(verifySession),
    },
  });
}

export default function ResetPasswordPage() {
  const data = useLoaderData<typeof loader>();
  if (!data) throw new Error('No data available');
  const typedData = data as unknown as LoaderData;
  const resetPasswordEmail = typedData.resetPasswordEmail;
  const actionData = useActionData();
  const isSubmitting = useIsSubmitting();

  const [form, fields] = useForm({
    id: 'reset-password',
    constraint: getZodConstraint(ResetPasswordSchema),
    lastResult: actionData,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: ResetPasswordSchema,
      });
    },
    shouldRevalidate: 'onInput',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl"> Password Reset </CardTitle>
        <CardDescription>
          {`Hi, ${resetPasswordEmail}. No worries, it happens. Enter a new password below.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="POST" {...getFormProps(form)}>
          <div className="flex flex-col gap-6">
            <ErrorAlert id={form.errorId} errors={form.errors} />
            <div className="grid gap-2">
              <Label htmlFor={fields.password.id}>New Password</Label>
              <Input
                {...getInputProps(fields.password, {
                  type: 'password',
                })}
                autoComplete="new-password"
                autoFocus
              />
              <ErrorAlert
                id={fields.password.errorId}
                errors={fields.password.errors}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fields.confirmPassword.id}>
                Confirm New Password
              </Label>
              <Input
                {...getInputProps(fields.confirmPassword, {
                  type: 'password',
                })}
                autoComplete="new-password"
              />
              <ErrorAlert
                id={fields.confirmPassword.errorId}
                errors={fields.confirmPassword.errors}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {' '}
              {isSubmitting ? 'Resetting...' : 'Reset Password'}{' '}
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
