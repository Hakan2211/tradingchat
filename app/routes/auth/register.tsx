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
  Form,
  Link,
  redirect,
  useActionData,
  useSearchParams,
} from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { validateCSRF } from '#/utils/csrf.server';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { checkHoneypot } from '#/utils/honeypot.server';
import { requireAnonymous, signup } from '#/utils/auth.server';
import { z } from 'zod';
import { useIsSubmitting } from '#/utils/misc';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { AnimatePresence } from 'framer-motion';
import {
  getSession,
  getSessionExpirationDate,
  sessionKey,
  sessionStorage,
} from '#/utils/session.server';
import { safeRedirect } from 'remix-utils/safe-redirect';

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
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
    schema: RegisterSchema,
  });

  if (submission.status !== 'success') {
    return submission.reply();
  }

  const result = await signup(submission.value);

  // Check if result is an error object
  if (result && 'error' in result) {
    // Check if the error result includes a specific field
    if (result.field) {
      return submission.reply({
        // Attach the error to the specific field
        fieldErrors: { [result.field]: [result.error] },
      });
    }
    // Fallback for generic errors
    return submission.reply({
      formErrors: [result.error ?? 'An unknown error occurred'],
    });
  }
  const { dbSession } = result;
  const session = await getSession();
  session.set(sessionKey, dbSession.id);

  return redirect(safeRedirect(submission.value.redirectTo, '/home'), {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        expires: getSessionExpirationDate(),
      }),
    },
  });
}

export default function Register() {
  const isSubmitting = useIsSubmitting();
  const actionData = useActionData();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(RegisterSchema),
    defaultValue: { redirectTo },
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: RegisterSchema,
      });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>Create an account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          method="POST"
          {...getFormProps(form)}
          onSubmit={form.onSubmit}
          noValidate={false}
        >
          <AuthenticityTokenInput />
          <HoneypotInputs />
          <input {...getInputProps(fields.redirectTo, { type: 'hidden' })} />
          <div className="flex flex-col gap-6">
            <AnimatePresence>
              {form.errors && (
                <ErrorAlert id={form.errorId} errors={form.errors} />
              )}
            </AnimatePresence>
            <div className="grid gap-2">
              <Label htmlFor={fields.name.id}>Name</Label>
              <Input
                {...getInputProps(fields.name, { type: 'text' })}
                placeholder="John Doe"
              />
              <ErrorAlert
                id={fields.name.errorId}
                errors={fields.name.errors}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={fields.username.id}>Username</Label>
              <Input
                {...getInputProps(fields.username, { type: 'text' })}
                placeholder="johndoe"
              />
              <ErrorAlert
                id={fields.username.errorId}
                errors={fields.username.errors}
              />
            </div>
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
              <Label htmlFor={fields.password.id}>Password</Label>
              <Input
                {...getInputProps(fields.password, { type: 'password' })}
              />
              <ErrorAlert
                id={fields.password.errorId}
                errors={fields.password.errors}
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
            <Link
              to={
                redirectTo
                  ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
                  : '/login'
              }
              className="underline underline-offset-4"
            >
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
