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
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';

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
      formErrors: [result.error],
    });
  }

  return result;
}

export default function Login({ className, ...props }: { className?: string }) {
  const isSubmitting = useIsSubmitting();
  const actionData = useActionData();

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(LoginSchema),
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: LoginSchema,
      });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  return (
    <Card>
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
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                {...getInputProps(fields.password, { type: 'password' })}
              />
              <ErrorAlert
                id={fields.password.errorId}
                errors={fields.password.errors}
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
