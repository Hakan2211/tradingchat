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
  useActionData,
  useSearchParams,
  useLoaderData,
} from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { AuthenticityTokenInput } from 'remix-utils/csrf/react';
import { validateCSRF } from '#/utils/csrf.server';
import { HoneypotInputs } from 'remix-utils/honeypot/react';
import { checkHoneypot } from '#/utils/honeypot.server';
import { requireAnonymous, signup } from '#/utils/auth.server';
import { z } from 'zod';
import { useIsSubmitting, formatPrice, extractPriceInfo } from '#/utils/misc';
import ErrorAlert from '#/components/errorAlert/errorAlert';
import { parseWithZod, getZodConstraint } from '@conform-to/zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { AnimatePresence } from 'framer-motion';
import { redirect } from 'react-router';
import { polar } from '#/utils/polar.server';
import { RadioGroup, RadioGroupItem } from '#/components/ui/radio-group';
import { useEffect, useState } from 'react';
import { cn } from '#/lib/utils';

const RegisterSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  redirectTo: z.string().optional(),
  tierId: z.string().min(1, 'A subscription plan must be selected'),
});

type PolarProduct = any;

type LoaderData = {
  plans: PolarProduct[];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);

  try {
    const productsResponse = await polar.products.list({
      limit: 10,
    });

    // Convert the paginator to an array using the working approach
    const plans: PolarProduct[] = [];
    for await (const page of productsResponse) {
      // Handle the Polar API pagination structure that we know works
      if (
        page &&
        typeof page === 'object' &&
        'result' in page &&
        page.result &&
        'items' in page.result &&
        Array.isArray(page.result.items)
      ) {
        plans.push(...(page.result.items as unknown as PolarProduct[]));
      } else if (Array.isArray(page)) {
        plans.push(...(page as PolarProduct[]));
      } else if (
        page &&
        typeof page === 'object' &&
        'results' in page &&
        Array.isArray(page.results)
      ) {
        plans.push(...(page.results as PolarProduct[]));
      }
    }

    console.log(`✅ Successfully fetched ${plans.length} plans from Polar.`);
    return { plans };
  } catch (error) {
    console.error('❌ Failed to fetch subscription plans from Polar:', error);
    return { plans: [] }; // Return empty array on error
  }
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

  if (result && 'error' in result) {
    if (result.field) {
      return submission.reply({
        fieldErrors: { [result.field]: [result.error] },
      });
    }
    return submission.reply({
      formErrors: [result.error ?? 'An unknown error occurred'],
    });
  }
  // const { dbSession } = result;
  // const session = await getSession();
  // session.set(sessionKey, dbSession.id);

  // 2. GET THE SESSION COOKIE HEADER
  // const sessionCookie = await sessionStorage.commitSession(session, {
  //   expires: getSessionExpirationDate(),
  // });

  // return redirectWithToast(
  //   safeRedirect(submission.value.redirectTo, '/home'),
  //   {
  //     title: 'Welcome!',
  //     description: 'Your account has been created successfully.',
  //     type: 'success',
  //   },
  //   { headers: { 'Set-Cookie': sessionCookie } }
  // );
  const checkoutUrl = `/checkout?tierId=${
    submission.value.tierId
  }&email=${encodeURIComponent(result.user.email)}`;
  return redirect(checkoutUrl);
}

export default function Register() {
  const isSubmitting = useIsSubmitting();
  const actionData = useActionData();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const { plans } = useLoaderData<LoaderData>();

  // Determine the default plan selection:
  // 1. Use the tierId from the URL if it exists.
  // 2. Otherwise, find the "Yearly Plan" to highlight it.
  // 3. Fallback to the first plan in the list.
  const tierIdFromUrl = searchParams.get('tierId');

  const defaultYearlyPlan = plans.find((p) =>
    p?.name?.toLowerCase?.()?.includes('yearly')
  );
  const defaultTierId =
    tierIdFromUrl || defaultYearlyPlan?.id || plans[0]?.id || '';

  // Use state to manage the selected tier - initialize to empty first
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  // Set initial value only once when we have plans
  useEffect(() => {
    if (plans.length > 0 && selectedTierId === '' && defaultTierId) {
      setSelectedTierId(defaultTierId);
    }
  }, [plans.length, defaultTierId, selectedTierId]);

  const [form, fields] = useForm({
    lastResult: actionData,
    constraint: getZodConstraint(RegisterSchema),
    defaultValue: { redirectTo, tierId: selectedTierId || defaultTierId },
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: RegisterSchema,
      });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  return (
    <>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/images/athlete.webp"
          alt="A person sitting at a desk with a laptop and a cup of coffee"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.3]"
        />
      </div>
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Account</CardTitle>
            <CardDescription>
              First, choose your plan. Then, create your account to get started.
            </CardDescription>
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
              <input
                {...getInputProps(fields.redirectTo, { type: 'hidden' })}
              />

              <div className="flex flex-col gap-6">
                <AnimatePresence>
                  {form.errors && (
                    <ErrorAlert id={form.errorId} errors={form.errors} />
                  )}
                </AnimatePresence>
                {/* Plan Selection */}{' '}
                <div className="grid gap-2">
                  <Label>Choose Your Plan</Label>
                  <RadioGroup
                    value={selectedTierId}
                    onValueChange={setSelectedTierId}
                    className="grid grid-cols-1 gap-2 pt-2"
                  >
                    {plans.length === 0 ? (
                      <div className="text-center p-4 text-muted-foreground bg-yellow-100 rounded">
                        No subscription plans available. Check the console for
                        errors.
                        <br />
                        <small>Plans loaded: {plans.length}</small>
                      </div>
                    ) : (
                      plans.map((plan) => {
                        const price = plan.prices?.find(
                          (p: any) => p.type === 'recurring'
                        );
                        const priceInfo = extractPriceInfo(price);

                        return (
                          <Label
                            key={plan.id}
                            htmlFor={fields.tierId.id + '-' + plan.id}
                            className={cn(
                              'flex items-center justify-between rounded-lg border-2 p-3 transition-all cursor-pointer',
                              selectedTierId === plan.id
                                ? 'border-[#ccb389] bg-primary/5'
                                : 'border-muted hover:border-muted-foreground/50'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem
                                value={plan.id}
                                id={fields.tierId.id + '-' + plan.id}
                              />
                              <div>
                                <p className="font-semibold">{plan.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {plan.description}
                                </p>
                              </div>
                            </div>
                            {priceInfo && priceInfo.amount && (
                              <span className="font-semibold text-sm">
                                {formatPrice(
                                  priceInfo.amount,
                                  priceInfo.interval
                                )}
                              </span>
                            )}
                          </Label>
                        );
                      })
                    )}
                  </RadioGroup>
                  {/* Hidden input for form submission */}
                  <input
                    type="hidden"
                    name={fields.tierId.name}
                    value={selectedTierId}
                    onChange={() => {}} // Controlled by selectedTierId state
                  />
                  <ErrorAlert
                    id={fields.tierId.errorId}
                    errors={fields.tierId.errors}
                  />
                </div>
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
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Proceed to Payment'}
                </Button>
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
      </div>
    </>
  );
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
