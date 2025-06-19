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
import { Form, Link, redirect, useActionData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { validateCSRF } from '#/utils/csrf.server';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { checkHoneypot } from '#/utils/honeypot.server';
import { signup, getUser } from '#/utils/auth.server';
import { z } from 'zod';
import { useIsSubmitting } from '#/utils/misc';
import ErrorAlert from '#/components/errorAlert/errorAlert';

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
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
  await validateCSRF(formData, request.headers);
  checkHoneypot(formData);

  const email = formData.get('email');
  const password = formData.get('password');
  const name = formData.get('name');
  const username = formData.get('username');

  const submission = RegisterSchema.safeParse({
    email,
    password,
    name,
    username,
  });
  if (!submission.success) {
    return new Response(
      JSON.stringify({ errors: submission.error.flatten() }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  const result = await signup(submission.data);

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

export default function Register({
  className,
  ...props
}: {
  className?: string;
}) {
  const isSubmitting = useIsSubmitting();
  const actionData = useActionData();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>Create an account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="POST" noValidate>
          <AuthenticityTokenInput />
          <HoneypotInputs />
          <div className="flex flex-col gap-6">
            <ErrorAlert
              id="form-errors"
              errors={actionData?.errors?.formErrors}
            />
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
              />
              <ErrorAlert
                id="name-errors"
                errors={actionData?.errors?.fieldErrors?.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                required
              />
              <ErrorAlert
                id="username-errors"
                errors={actionData?.errors?.fieldErrors?.username}
              />
            </div>
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
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
              <ErrorAlert
                id="password-errors"
                errors={actionData?.errors?.fieldErrors?.password}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing Up...' : 'Sign Up'}
            </Button>
            {/* <Link to="/auth/google">
              <Button variant="outline" className="w-full">
                Sign up with Google
              </Button>
            </Link> */}
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline underline-offset-4">
              Login
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
