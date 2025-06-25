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

import { Form, Link, useActionData, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { checkHoneypot } from '#/utils/honeypot.server';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { validateCSRF } from '#/utils/csrf.server';
import { login, requireAnonymous } from '#/utils/auth.server';
import { z } from 'zod';
import { useIsSubmitting } from '#/utils/misc';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import {
  getSessionExpirationDate,
  getSession,
  sessionKey,
  sessionStorage,
} from '#/utils/session.server';
import { safeRedirect } from 'remix-utils/safe-redirect';
import { redirectWithToast } from '#/utils/toaster.server';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  redirectTo: z.string().optional(),
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

  const submission = parseWithZod(formData, {
    schema: LoginSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const result = await login(submission.value);

  // Check if result is an error object
  if (result && 'error' in result) {
    return submission.reply({
      formErrors: [result.error ?? ''],
    });
  }

  const { dbSession } = result;
  const session = await getSession();
  session.set(sessionKey, dbSession.id);

  // 2. GET THE SESSION COOKIE HEADER
  const sessionCookie = await sessionStorage.commitSession(session, {
    expires: getSessionExpirationDate(),
  });

  const redirectResponse = redirectWithToast(
    safeRedirect(submission.value.redirectTo, '/home'),
    {
      title: 'Welcome back!',
      description: 'You have successfully logged in.',
      type: 'success',
    },
    { headers: { 'Set-Cookie': sessionCookie } }
  );

  return redirectResponse;
}

export default function Login({ className, ...props }: { className?: string }) {
  const isSubmitting = useIsSubmitting();
  const actionData = useActionData();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(LoginSchema),
    defaultValue: { redirectTo },
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: LoginSchema,
      });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  return (
    <>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/images/resilience-runner.webp"
          alt="A person typing on a laptop in a dark room, with code on the screen"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.3]"
        />
      </div>
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form
              method="POST"
              {...getFormProps(form)}
              onSubmit={form.onSubmit}
              noValidate={false}
            >
              <input
                {...getInputProps(fields.redirectTo, { type: 'hidden' })}
              />
              <div className="flex flex-col gap-6">
                <ErrorAlert id={form.errorId} errors={form.errors} />
                <HoneypotInputs />
                <AuthenticityTokenInput />
                <div className="grid gap-2">
                  <Label htmlFor={fields.email.id}>Email</Label>
                  <Input
                    {...getInputProps(fields.email, { type: 'email' })}
                    placeholder="m@example.com"
                  />
                  <ErrorAlert
                    id={fields.email.errorId}
                    errors={fields.email.errors}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor={fields.password.id}>Password</Label>
                    <Link
                      to="/forgot-password"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                  <Input
                    {...getInputProps(fields.password, { type: 'password' })}
                  />
                  <ErrorAlert
                    id={fields.password.errorId}
                    errors={fields.password.errors}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logging In...' : 'Login'}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                New here?{' '}
                <Link
                  to={
                    redirectTo
                      ? `/register?redirectTo=${encodeURIComponent(redirectTo)}`
                      : '/register'
                  }
                  className="underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
