// app/components/landingpage/pricing-section.tsx
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { cn } from '#/lib/utils';
import { Check } from 'lucide-react';
import { Link } from 'react-router';

const MONTHLY_PLAN_ID = 'efd3d8b4-a4cb-42ce-b178-5d0d40d6ff00';
const YEARLY_PLAN_ID = 'b5bfcda6-4d3a-46d5-a355-5ad0989486bb';

// Data for pricing plans
const pricingPlans = [
  {
    name: 'Monthly Plan',
    priceAnnually: 720,
    priceMonthly: '$60',
    description: 'Billed monthly',
    features: [
      'Live trading room access',
      'Daily market analysis & alerts',
      'Community discussions & insights',
      'Real-time trade ideas',
      'Guided learning path',
    ],
    highlighted: false,
    cta: 'Get Access Now',
    link: `/register?tierId=${MONTHLY_PLAN_ID}`,
  },
  {
    name: 'Yearly Plan',
    priceAnnually: 600,
    priceMonthly: '$600',
    description: 'Billed annually',
    features: [
      'Everything in the monthly plan',
      'Priority support & mentorship',
      'Custom watchlists',
    ],
    highlighted: true,
    cta: 'Get Access Now',
    link: `/register?tierId=${YEARLY_PLAN_ID}`,
  },
  {
    name: 'For Organizations',
    priceAnnually: 499,
    priceMonthly: 'Contact Us',
    description: '',
    features: [
      'Create your own trading room',
      'Invite your team members',
      'Customize your trading room',
      'Team collaboration tools',
    ],
    highlighted: false,
    cta: 'Contact Us',
  },
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{
        background:
          'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 15%, rgb(0,0,0) 35%)',
      }}
    >
      {/* Noise texture overlay matching hero */}
      <div className="noise-bg" />

      {/* Background Gradient */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-3/4 h-[45rem] w-[45rem] rounded-full bg-gradient-radial from-[#ccb389]/10 to-transparent blur-[150px]"
        aria-hidden="true"
      />

      {/* Seamless transition overlay */}
      <div
        className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 via-black/80 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 z-10 relative">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-medium tracking-tight text-neutral-300 font-serif sm:text-5xl">
            Investment Plans
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-400 text-pretty">
            Exclusive membership tiers designed for discerning professionals who
            demand the finest trading insights and premium community access.
          </p>
        </div>

        <div className="isolate mx-auto mt-20 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                'flex flex-col rounded-2xl transition-all duration-300 relative',
                plan.highlighted
                  ? 'bg-gradient-to-br from-zinc-900/90 to-zinc-800/90 scale-105 ring-1 ring-[#ccb389]/30 shadow-[#ccb389]/10  dark:ring-[#ccb389]/30 shadow-2xl dark:shadow-[#ccb389]/10 border-[#ccb389]/30 dark:border-[#ccb389]/30'
                  : 'bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 hover:ring-zinc-700/50 dark:ring-zinc-800/50 dark:hover:ring-zinc-700/50 border-[#333842]'
              )}
              style={
                plan.highlighted
                  ? {
                      background:
                        'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 20, 0.95) 100%)',
                      backdropFilter: 'blur(20px)',
                      boxShadow:
                        '0 25px 50px -12px rgba(204, 179, 137, 0.15), 0 0 0 1px rgba(204, 179, 137, 0.2)',
                    }
                  : {
                      backdropFilter: 'blur(10px)',
                    }
              }
            >
              {/* Subtle gold accent line for highlighted card */}
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ccb389] to-transparent" />
              )}

              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-[#ccb389] to-[#b8a082] text-zinc-900/80 px-4 py-1 text-sm font-medium shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="p-8">
                <CardTitle
                  className={cn(
                    'text-base font-medium leading-8 px-2 py-1 rounded-lg border w-fit',
                    plan.highlighted
                      ? 'border-[#ccb389]/30 text-neutral-300'
                      : ' border-zinc-700/50 text-zinc-300'
                  )}
                >
                  {plan.name}
                </CardTitle>
                {/* {plan.name === 'Yearly Plan' && (
                  <div className="flex items-center gap-x-2 mt-2">
                    <Badge className="bg-neutral-800/60 text-[#ccb389] border-[#ccb389]/30 text-xs px-2 py-0.5">
                      Save 2 Months
                    </Badge>
                    <span className="block text-xs text-zinc-400/70 mt-1">
                      vs $720 paid monthly
                    </span>
                  </div>
                )} */}

                <div className="mt-6 flex items-center gap-x-4">
                  <span
                    className={cn(
                      'text-4xl font-medium tracking-tight',
                      plan.highlighted
                        ? 'text-[#ccb389]'
                        : 'text-neutral-200/90'
                    )}
                  >
                    {plan.priceMonthly}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        'text-sm font-semibold ',
                        plan.name === 'For Organizations'
                          ? 'hidden'
                          : 'text-zinc-400/70'
                      )}
                    >
                      USD
                    </span>
                    <CardDescription className="text-sm text-zinc-400">
                      {plan.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 pt-0 flex-1">
                <ul role="list" className="space-y-4 text-sm leading-6">
                  {plan.features.map((feature, index) => (
                    <div key={feature}>
                      <li className="flex gap-x-3 items-center">
                        <Check
                          className={cn(
                            'h-5 w-5 flex-none',
                            plan.highlighted
                              ? 'text-[#ccb389]'
                              : 'text-zinc-400'
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                      {index < plan.features.length - 1 && (
                        <div
                          className={cn(
                            'w-full h-px bg-gradient-to-r from-transparent to-transparent',
                            plan.highlighted
                              ? 'via-[#ccb389]/20'
                              : 'via-zinc-700/30'
                          )}
                        />
                      )}
                    </div>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-8 pt-0">
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    'w-full font-medium',
                    plan.highlighted
                      ? 'bg-gradient-to-r from-[#ccb389] to-[#b8a082] text-zinc-900/80 hover:from-[#b8a082] hover:to-[#ccb389] border border-[#dac9acbd] shadow-lg shadow-[#ccb389]/25'
                      : 'bg-neutral-800/60 text-neutral-300 hover:bg-neutral-800/70 border border-zinc-700/50 hover:border-[#ccb389]/30'
                  )}
                >
                  {plan.name === 'For Organizations' ? (
                    <a href="mailto:hakanda3d@gmail.com?subject=Inquiry%20about%20BullBearz%20for%20Organizations">
                      {plan.cta}
                    </a>
                  ) : (
                    <Link to={plan.link ?? ''}>{plan.cta}</Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
