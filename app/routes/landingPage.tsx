import { Button } from '#/components/ui/button';
import { requireAnonymous } from '#/utils/auth.server';

import {
  Link,
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import { HeroSection } from '#/components/landingpage/hero-section';
import { LandingNavbar } from '#/components/landingpage/landing-navbar';
import { PricingSection } from '#/components/landingpage/pricing-section';
import { FaqSection } from '#/components/landingpage/faq-section';

export const meta: MetaFunction = () => {
  return [
    { title: 'BullBearz - The trading community for the modern age' },
    {
      name: 'description',
      content: 'BullBearz is the trading community for the modern age',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return null;
}

export default function Home() {
  return (
    <main className="bg-black text-zinc-50">
      {/* <LandingNavbar /> */}
      <HeroSection />
      <PricingSection />
      <FaqSection />
    </main>
  );
}
