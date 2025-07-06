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

export const meta: MetaFunction = () => {
  return [
    { title: 'New React Router App' },
    { name: 'description', content: 'Welcome to React Router!' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return null;
}

export default function Home() {
  return (
    <main className="bg-black text-zinc-50">
      <LandingNavbar />
      <HeroSection />
      <section className="text-zinc-50 h-screen w-full">Hello</section>
      {/* ... The rest of your landing page sections will go here ... */}
    </main>
  );
}
