import { type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { HeroSection } from '#/components/landingpage/hero-section';
import { PricingSection } from '#/components/landingpage/pricing-section';
import { FaqSection } from '#/components/landingpage/faq-section';
import { requireAnonymous } from '#/utils/auth.server';

export function createMetaTags({
  title = 'BullBearz | The Winning Edge for Traders',
  description = 'Join a community of elite traders who turn market volatility into opportunity. Learn, share, and forge your winning edge.',
  imageUrl = 'https://pub-9c15a0205a1d42c8acc549a0dd7d568e.r2.dev/og-image.jpg',
  siteUrl = 'https://bullbearz.com',
}: {
  title?: string;
  description?: string;
  imageUrl?: string;
  siteUrl?: string;
} = {}) {
  return [
    { title: title },
    { name: 'description', content: description },

    // Open Graph tags
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: siteUrl },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '628' },
    {
      property: 'og:image:alt',
      content: 'BullBearz - The Winning Edge for Traders',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'BullBearz' },

    // Twitter Card tags
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    {
      name: 'twitter:image:alt',
      content: 'BullBearz - The Winning Edge for Traders',
    },
    { name: 'twitter:site', content: '@hakanbilgo' },
    { name: 'twitter:creator', content: '@hakanbilgo' },
  ];
}

export const meta: MetaFunction = () => {
  return createMetaTags();
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
