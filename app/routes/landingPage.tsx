import { type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { HeroSection } from '#/components/landingpage/hero-section';
import { PricingSection } from '#/components/landingpage/pricing-section';
import { FaqSection } from '#/components/landingpage/faq-section';
import { requireAnonymous } from '#/utils/auth.server';

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
      <HeroSection />
      <PricingSection />
      <FaqSection />
    </main>
  );
}
