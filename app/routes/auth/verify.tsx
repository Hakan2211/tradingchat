// app/routes/verify.tsx
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import {
  type ActionFunctionArgs,
  Form,
  useActionData,
  useSearchParams,
} from 'react-router';
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
import { checkHoneypot } from '#/utils/honeypot.server';
import { useIsSubmitting } from '#/utils/misc';
import { validateRequest } from '#/utils/verify.server';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';

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

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  await checkHoneypot(formData);
  return validateRequest(request, formData);
}

export default function VerifyRoute() {
  const actionData = useActionData();
  const [searchParams] = useSearchParams();
  const isSubmitting = useIsSubmitting();

  const [form, fields] = useForm({
    id: 'verify-form',
    constraint: getZodConstraint(VerifySchema),
    lastResult: actionData,
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: VerifySchema,
      });
    },
    defaultValue: {
      code: searchParams.get(codeQueryParam),
      type: searchParams.get(typeQueryParam),
      target: searchParams.get(targetQueryParam),
      redirectTo: searchParams.get(redirectToQueryParam),
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We've sent you a code to verify your email address.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form method="POST" {...getFormProps(form)}>
          <AuthenticityTokenInput />
          <HoneypotInputs />
          <div className="flex flex-col gap-6">
            <ErrorAlert id={form.errorId} errors={form.errors} />
            <div className="grid gap-2">
              <Label htmlFor={fields.code.id}>Code</Label>
              <Input
                {...getInputProps(fields.code, {
                  type: 'text',
                })}
                autoFocus
              />
              <ErrorAlert
                id={fields.code.errorId}
                errors={fields.code.errors}
              />
            </div>
            <div className="grid gap-2">
              <Input
                {...getInputProps(fields.type, {
                  type: 'hidden',
                })}
              />
            </div>
            <Input
              {...getInputProps(fields.target, {
                type: 'hidden',
              })}
            />
            <Input
              {...getInputProps(fields.redirectTo, {
                type: 'hidden',
              })}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Submit'}
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
