import { Button } from '#/components/ui/button';
import { Link } from 'react-router';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useParallax } from '#/hooks/use-parallax';
import { ArrowRight } from 'lucide-react';
import { MovingBorderButton } from '#/components/ui/moving-border.button';

const FADE_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  },
} as const;

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start end', 'end start'],
  });

  const y = useParallax(scrollYProgress, 50);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-start justify-center overflow-hidden"
    >
      {/* Background with Strong Radial Gradient */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        {/* Clear Background Image */}
        <div className="absolute inset-0 bg-[url('/images/heroimage.jpg')] bg-cover bg-center rotate-y-180" />

        {/* Strong Radial Gradient: Clear Center, Very Dark Edges */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 30% at center, transparent 0%, transparent 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%)',
          }}
        />

        {/* Bottom Fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />

        {/* Top Fade for navbar consistency */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />
      </motion.div>

      {/* Content - Moved Higher */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-32 md:pt-28"
      >
        {/* Main Headline */}
        <motion.h1
          variants={FADE_ANIMATION_VARIANTS}
          className="text-5xl font-serif md:text-6xl lg:text-6xl font-light tracking-tight text-neutral-100 mb-6"
        >
          Where Bulls and Bearz
          <br />
          <span className="">Forge Their Winning Edge</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={FADE_ANIMATION_VARIANTS}
          className="text-xl md:text-xl text-neutral-300 font-light leading-relaxed mb-10 max-w-xl mx-auto text-pretty"
        >
          Join a community that doesn't just survive market volatility — we
          thrive in it. Learn alongside elite traders who turn every market
          condition into opportunity.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={FADE_ANIMATION_VARIANTS}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          {/* <Button
            asChild
            size="lg"
            className="h-10 px-6 bg-gradient-to-r from-[#898a8b]/70  to-[#ccb389]/70 text-neutral-200 hover:bg-[#ccb389]/70 text-lg transition-all duration-300"
          >
            <Link to="/signup">Get Started</Link>
          </Button> */}
          <MovingBorderButton
            as="div" // Use a div as the container for the link
            duration={3000}
            borderRadius="0.5rem"
            containerClassName="h-10" // Use containerClassName for sizing
            className="hover:bg-transparent duration-300 transition-all" // Make the inner background transparent if needed, but the default is good
          >
            <Link to="/register" className="text-neutral-200 text-lg p-2">
              Join the Community
            </Link>
          </MovingBorderButton>

          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-10 px-6 text-neutral-300 bg-slate-900/60 hover:bg-slate-900/80 border-slate-800 border hover:text-neutral-300 text-lg font-light transition-all duration-300"
          >
            <Link to="/features" className="flex items-center gap-2">
              See What's Inside
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
