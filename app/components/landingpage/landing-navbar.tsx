import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { cn } from '#/lib/utils';
import { Button } from '#/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from '#/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useScrollNav } from '#/hooks/use-scroll-nav';
import Logo from './logo';

// Reusable Data
const navItems = [
  { name: 'About', link: '/about' },
  { name: 'Pricing', link: '/pricing' },
  // { name: 'Journal', link: '/journal' },
];

// Navbar Container
const NavbarContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  // const { ref, visible } = useScrollNav(50);
  const { visible } = useScrollNav(50);

  return (
    <motion.div
      // ref={ref}
      className={cn('sticky inset-x-0 top-0 md:top-4 z-50 w-full px-4')}
      style={{ position: 'sticky' }}
    >
      <motion.div
        animate={{ opacity: visible ? 1 : 0 }}
        className="absolute inset-x-0 top-0 h-[100px] w-full bg-transparent" // a fixed height
        style={{
          backdropFilter: 'blur(20px)',
          //backgroundColor: 'rgba(18, 18, 22, 0.65)',
          transform: 'translateY(-80%)',
        }}
      />

      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible }
            )
          : child
      )}
    </motion.div>
  );
};

// Desktop Nav Body
const NavBody = ({
  children,
  className,
  visible,
}: {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}) => (
  <motion.div
    animate={{
      backdropFilter: visible
        ? 'blur(24px) saturate(180%)'
        : 'blur(12px) saturate(100%)',
      background: visible ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.55)',
      y: visible ? 20 : 0,
    }}
    transition={{ type: 'spring', stiffness: 200, damping: 50 }}
    className={cn(
      'relative z-60 mx-auto hidden max-w-5xl flex-row items-center justify-between rounded-2xl px-4 py-2 md:flex',
      className
    )}
    style={{
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3), 0 0 12px rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}
  >
    {children}
  </motion.div>
);

const NavItems = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className="absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-6 text-sm font-light tracking-wide md:flex"
    >
      {navItems.map((item, idx) => (
        <Link
          onMouseEnter={() => setHovered(idx)}
          className="relative px-4 py-2 text-neutral-300 transition-colors hover:text-neutral-100"
          key={`link-${idx}`}
          to={item.link}
          style={{ textShadow: '0 0 5px rgba(255, 255, 255, 0.3)' }}
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 rounded-2xl bg-neutral-200/5"
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </Link>
      ))}
    </motion.div>
  );
};

// Mobile Sheet Nav
const MobileSheetNav = ({ visible }: { visible?: boolean }) => (
  <motion.div
    animate={{
      backdropFilter: visible ? 'blur(20px)' : 'blur(10px)',
      background: visible
        ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.8) 100%)'
        : 'linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)',
    }}
    transition={{ type: 'spring', stiffness: 200, damping: 50 }}
    className={cn(
      'relative z-60 mx-auto md:hidden max-w-5xl flex flex-row items-center justify-between rounded-2xl px-4 py-2 translate-y-[10px] bg-transparent'
    )}
    style={{
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3), 0 0 12px rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}
  >
    <Link to="/" className="text-xl cursor-pointer z-50 text-[#ccb389]">
      <div className="flex items-center gap-3">
        <Logo className="w-12 h-12" />
        <span className="font-serif text-2xl font-light">BullBearz </span>
      </div>
    </Link>
    <Sheet>
      <SheetTitle className="sr-only">Menu</SheetTitle>
      <SheetDescription className="sr-only">Menu</SheetDescription>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-neutral-300 hover:text-[#ccb389] hover:bg-transparent cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="bg-[rgba(0,0,0,0.7)] backdrop-blur-md border-l-zinc-800/60"
      >
        <div className="flex h-full flex-col p-6 space-y-6">
          <Link to="/" className="text-xl cursor-pointer z-50 text-[#ccb389]">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
              <span className="font-serif text-2xl font-light">BullBearz</span>
            </div>
          </Link>
          <nav className="flex flex-col gap-6">
            {navItems.map((link) => (
              <SheetClose asChild key={link.link}>
                <Link
                  to={link.link}
                  className="text-lg text-neutral-300 hover:text-[#ccb389]"
                  style={{ textShadow: '0 0 5px rgba(255, 255, 255, 0.3)' }}
                >
                  {link.name}
                </Link>
              </SheetClose>
            ))}
            <div className="mt-auto w-fit flex flex-col gap-4">
              <SheetClose asChild>
                <Button
                  asChild
                  variant="ghost"
                  className="dark:text-neutral-300  dark:hover:text-neutral-100 hover:bg-gray-800/40 hover:border-gray-800/40 hover:text-neutral-100 text-neutral-300"
                >
                  <Link to="/login">Log In</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button className="bg-gray-800/60 text-neutral-300 border-gray-800/60 hover:bg-gray-800/40 hover:border-gray-800/40 dark:bg-gray-800/60 dark:hover:bg-gray-800/40 border dark:border-gray-800/60  dark:hover:border-gray-700 transition-all duration-300">
                  <Link to="/register">Get Started</Link>
                </Button>
              </SheetClose>
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  </motion.div>
);

// Final Exported Component
export function LandingNavbar() {
  return (
    <NavbarContainer>
      <NavBody>
        <Link to="/" className="text-xl cursor-pointer z-50 text-[#ccb389]">
          <div className="flex items-center gap-3">
            <Logo className="w-12 h-12" />
            <span className="font-serif text-2xl font-light">BullBearz </span>
          </div>
        </Link>

        <NavItems />
        <div className="relative z-20 flex text-base font-light tracking-wide items-center gap-2">
          <Button
            asChild
            variant="ghost"
            className="dark:text-neutral-300  dark:hover:text-neutral-100 hover:bg-gray-800/40 hover:border-gray-800/40 hover:text-neutral-100 text-neutral-300"
          >
            <Link to="/login">Log In</Link>
          </Button>
          <Button
            asChild
            className="bg-gray-800/60 text-neutral-300 border-gray-800/60 hover:bg-gray-800/40 hover:border-gray-800/40 dark:bg-gray-800/60 dark:hover:bg-gray-800/40 border dark:border-gray-800/60  dark:hover:border-gray-700 transition-all duration-300"
          >
            <Link to="/register">Get Started</Link>
          </Button>
        </div>
      </NavBody>
      <MobileSheetNav />
    </NavbarContainer>
  );
}
