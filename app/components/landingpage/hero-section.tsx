import { Button } from '#/components/ui/button';
import { Link } from 'react-router';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useParallax } from '#/hooks/use-parallax';
import { ArrowRight } from 'lucide-react';

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
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background with Strong Radial Gradient */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        {/* Clear Background Image */}
        <div className="absolute inset-0 bg-[url('/images/heroimage.jpg')] bg-cover bg-center" />

        {/* Strong Radial Gradient: Clear Center, Very Dark Edges */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at center, transparent 0%, transparent 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%)',
          }}
        />

        {/* Bottom Fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </motion.div>

      {/* Content */}
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
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        {/* Main Headline */}
        <motion.h1
          variants={FADE_ANIMATION_VARIANTS}
          className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-6"
        >
          Master the Markets,
          <br />
          <span className="font-normal">Together</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={FADE_ANIMATION_VARIANTS}
          className="text-xl md:text-2xl text-white/70 font-light leading-relaxed mb-12 max-w-2xl mx-auto"
        >
          An exclusive trading community for professionals who demand
          excellence.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={FADE_ANIMATION_VARIANTS}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Button
            size="lg"
            className="h-14 px-8 bg-white text-black hover:bg-white/90 font-medium text-lg border-0 transition-all duration-300"
          >
            Join Waitlist
          </Button>

          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-14 px-8 text-white/80 hover:text-white hover:bg-white/5 font-medium text-lg transition-all duration-300"
          >
            <Link to="/features" className="flex items-center gap-2">
              Learn More
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
