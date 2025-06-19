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
import { invariantResponse } from '#/utils/misc';
import { Form, Link, redirect, useActionData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { checkHoneypot } from '#/utils/honeypot.server';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { validateCSRF } from '#/utils/csrf.server';
import { login, getUser } from '#/utils/auth.server';
import { z } from 'zod';
import { useIsSubmitting } from '#/utils/misc';
import ErrorAlert from '#/components/errorAlert/errorAlert';

const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request);
  if (user) {
    return redirect('/home');
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  await validateCSRF(formData, request.headers);
  checkHoneypot(formData);

  const submission = LoginSchema.safeParse({ email, password });

  if (!submission.success) {
    return new Response(
      JSON.stringify({ errors: submission.error.flatten() }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  const result = await login(submission.data);

  // Check if result is an error object
  if (result && 'error' in result) {
    return new Response(
      JSON.stringify({ formErrors: [result.error], fieldErrors: {} }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  return result;
}

export default function Login({ className, ...props }: { className?: string }) {
  const isSubmitting = useIsSubmitting();
  const actionData = useActionData();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="POST">
          <div className="flex flex-col gap-6">
            <ErrorAlert
              id="form-errors"
              errors={actionData?.errors?.formErrors}
            />
            <HoneypotInputs />
            <AuthenticityTokenInput />
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <ErrorAlert
                id="email-errors"
                errors={actionData?.errors?.fieldErrors?.email}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input id="password" name="password" type="password" required />
              <ErrorAlert
                id="password-errors"
                errors={actionData?.errors?.fieldErrors?.password}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Logging In...' : 'Login'}
            </Button>
            {/* <Link to="/auth/google">
              <Button variant="outline" className="w-full">
                Login with Google
              </Button>
            </Link> */}
          </div>
          <div className="mt-4 text-center text-sm">
            {/* Don&apos;t have an account? */}
            New here?{' '}
            <Link to="/register" className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
