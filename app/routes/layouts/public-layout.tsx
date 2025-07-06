// routes/layouts/public-layout.tsx
import { Outlet } from 'react-router';
import { LandingNavbar } from '#/components/landingpage/landing-navbar';
import { Footer } from '#/components/landingpage/footer';

export default function PublicLayout() {
  return (
    <div className="bg-black text-zinc-50">
      <LandingNavbar />
      <main className="relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
