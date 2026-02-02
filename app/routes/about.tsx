import { type MetaFunction } from 'react-router';
import { Card, CardContent } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Link } from 'react-router';
import {
  Heart,
  BookOpen,
  Target,
  MessageSquare,
  Bookmark,
  BarChart3,
  Clock,
} from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    {
      title: 'About BullBearz - Built by a Trader, For Traders',
    },
    {
      name: 'description',
      content:
        'BullBearz is a trading community built from scratch by Hakan - an electrical engineer turned trader who combined his passion for trading and coding to create what he wished existed.',
    },
  ];
};

export default function About() {
  return (
    <div className="min-h-screen bg-black text-zinc-50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="noise-bg" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[60rem] w-[60rem] rounded-full bg-gradient-radial from-[#ccb389]/8 to-transparent blur-[200px]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8">
        {/* Hero Section */}
        <div className="pt-20 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-neutral-300 mb-6 leading-[1.3]">
            Built by a Trader.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ccb389] to-[#b8a082]">
              For Traders.
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-xl leading-8 text-zinc-400 text-pretty mb-8">
            I combined my passion for trading with my coding skills to build the
            platform I always wished existed — real-time collaboration, genuine
            insights, and an authentic community.
          </p>
          <p className="text-lg text-[#ccb389] font-medium mb-8">
            Welcome to BullBearz.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r text-base from-[#ccb389] to-[#b8a082] text-zinc-900/80 hover:from-[#b8a082] hover:to-[#ccb389] border border-[#dac9acbd] shadow-lg shadow-[#ccb389]/25"
            >
              <Link to="/register">Join Now</Link>
            </Button>
          </div>
        </div>
        <div
          className="h-px bg-gradient-to-r from-transparent via-[#ccb389]/30 to-transparent"
          aria-hidden="true"
        />

        {/* The Story Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              The Story
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                I'm{' '}
                <a
                  href="https://www.hakanda.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ccb389] underline hover:text-[#b8a082]/60 underline-offset-4 transition-colors duration-200"
                >
                  <span className="text-[#ccb389] font-medium">Hakan</span>
                </a>
                — an electrical engineer who fell in love with trading. After
                years of navigating the markets, I noticed something frustrating
                about the trading community landscape.
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                Most trading communities were just{' '}
                <span className="text-[#ccb389]">noise</span>. Alert services
                pushing tickers. Self-proclaimed gurus selling dreams. Crowds
                where individual voices got lost in the chaos.
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                I wanted something different. A place where traders could have
                real conversations, share genuine insights, and grow together.
                So I decided to build it myself.
              </p>
            </div>
            <div className="flex justify-center">
              <Card className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 dark:ring-zinc-800/50 p-2 border-none">
                <div className="w-64 h-48 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-lg flex items-center justify-center">
                  <img
                    src="/images/hakan.jpg"
                    alt="Hakan"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* The Build Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              The Build
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="flex justify-center lg:order-first">
              <Card className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 dark:ring-zinc-800/50 p-2 border-none">
                <div className="w-64 h-48 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-lg flex items-center justify-center">
                  <img
                    src="/images/desk-workspace.jpg"
                    alt="Hakan's workspace"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                I invested my time into learning full-stack development — not to
                become a developer, but to bring this vision to life. Every line
                of code, every feature, every design decision comes from{' '}
                <span className="text-[#ccb389]">
                  real trading experience
                </span>
                .
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed">
                BullBearz is my passion project:{' '}
                <span className="text-[#ccb389] font-medium">
                  a trader who codes, building tools for traders who trade.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Community Power Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              The Power of Community
            </h2>
          </div>

          <p className="text-lg text-zinc-300 leading-relaxed mb-8">
            Trading doesn't have to be a solo journey. The best traders I know
            understand the power of:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              {
                icon: Clock,
                title: 'Shared insights at 3 AM',
                description: 'when markets moved and sleep was impossible',
              },
              {
                icon: Heart,
                title: 'Celebrations of small wins',
                description: 'that actually felt meaningful',
              },
              {
                icon: Target,
                title: 'Honest post-mortems on losses',
                description: 'without judgment or shame',
              },
            ].map((item, index) => (
              <Card
                key={index}
                className="bg-transparent backdrop-blur-10 p-6 text-center my-3 border-[#ccb389]/20 dark:border-[#333842]"
              >
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[#ccb389] to-[#b8a082] rounded-lg flex items-center justify-center mb-4 dark:from-[#ccb389] dark:to-[#b8a082]">
                  <item.icon className="h-6 w-6 text-zinc-900" />
                </div>
                <h3 className="text-lg font-medium text-neutral-300 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400">{item.description}</p>
              </Card>
            ))}
          </div>

          <div className="bg-transparent backdrop-blur-10">
            <p className="text-lg text-zinc-300 leading-relaxed mb-4">
              This is what BullBearz is built around — creating a space where
              these connections happen naturally, without the noise.
            </p>
            <p className="text-lg text-[#ccb389] font-medium">
              Real traders. Real conversations. Real growth.
            </p>
          </div>
        </div>

        {/* The Platform Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              The Platform
            </h2>
            <p className="text-lg text-zinc-400">
              Here's what I've been building.
            </p>
          </div>

          <Card className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 dark:ring-zinc-800/50 p-3 border-none">
            <img
              src="/images/platform-bullbearz.jpg"
              alt="BullBearz platform screenshot"
              className="w-full h-auto rounded-lg"
            />
          </Card>
        </div>

        {/* Core Features Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              What This Means for You
            </h2>
            <p className="text-lg text-zinc-400">
              No more noise. No more empty alerts. Instead, you get:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: MessageSquare,
                title: 'Real-time, sector-specific & 1:1 chat',
                description: 'context that matters',
              },
              {
                icon: BookOpen,
                title:
                  'Integrated trading journal & emotional-pattern tracker (still in development)',
                description: 'know thyself',
              },
              {
                icon: Bookmark,
                title: 'Message bookmarking & highlight reels',
                description: 'capture breakthrough moments',
              },
              {
                icon: BarChart3,
                title: 'Monthly tool-belt updates (voted on by you)',
                description: 'features traders actually need',
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="bg-transparent backdrop-blur-10 p-6 border-[#ccb389]/20 dark:border-[#333842]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#ccb389] to-[#b8a082] rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-zinc-900" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-neutral-300 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Why It's Different */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              Why It's Different
            </h2>
          </div>

          <div className="bg-transparent backdrop-blur-10 p-8 text-pretty">
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              I'm building everything from scratch. No team (yet), no venture
              capital, no corporate agenda. Just a trader who knows what traders
              actually need.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              Every feature addresses a real problem I've experienced. The
              journal feature? Because tracking emotional patterns is just as
              important as tracking P&L. The sector-specific rooms? Because
              context matters more than noise.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed">
              This isn't a side project or a quick cash grab — it's something
              I'm genuinely excited to work on every single day.
            </p>
          </div>
        </div>

        {/* Mission & Values */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              Our Mission & Values
            </h2>
          </div>

          <Card className="flex items-center  bg-transparent ring-1 ring-[#ccb389]/40 dark:ring-[#ccb389]/40 backdrop-blur-10 p-8 mb-8 border-[#ccb389]/40 dark:border-[#ccb389]/40">
            <h3 className="text-xl font-medium text-[#ccb389] mb-2">
              Mission:
            </h3>
            <p className="text-lg text-zinc-300">
              To empower every trader with truth, tools, and teammates.
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Transparency', description: 'share all wins & losses' },
              { title: 'Community', description: 'nobody solos the summit' },
              { title: 'Iteration', description: 'ship fast, learn faster' },
              { title: 'Integrity', description: 'zero hidden agendas' },
            ].map((value, index) => (
              <Card
                key={index}
                className="bg-transparent ring-1 ring-zinc-800/50 dark:ring-zinc-800/50 backdrop-blur-10 p-6 text-center border-zinc-800/50 dark:border-zinc-800/50"
              >
                <h4 className="text-lg font-medium text-[#ccb389] mb-2">
                  {value.title}
                </h4>
                <p className="text-sm text-zinc-400">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Investment Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              Your Investment in Growth
            </h2>
          </div>

          <Card className="bg-transparent ring-1 ring-[#ccb389]/20 dark:ring-[#ccb389]/20 backdrop-blur-10 p-8 text-center border-[#ccb389]/20 dark:border-[#ccb389]/20">
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              At <span className="text-[#ccb389] font-semibold">$60/month</span>{' '}
              (or{' '}
              <span className="text-[#ccb389] font-semibold">
                $50/mo with annual
              </span>
              ), you're investing in real tools, real support, real growth.
              Every dollar goes back into building features you actually need.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Badge className="bg-gradient-to-r from-[#ccb389] to-[#b8a082] text-zinc-900/80 px-4 py-2 text-sm font-medium">
                14-day money back guarantee
              </Badge>
              <p className="text-sm text-zinc-400 mt-2">
                because confidence comes from experience, not promises.
              </p>
            </div>
          </Card>
        </div>

        {/* My Biggest Supporter Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              My Biggest Supporter
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="flex justify-center">
              <Card className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 dark:ring-zinc-800/50 p-2 border-none">
                <div className="w-64 h-48 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-lg flex items-center justify-center">
                  <img
                    src="/images/mom.jpg"
                    alt="Hakan with his mother"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </Card>
            </div>
            <div className="lg:col-span-2">
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                Behind every passion project is someone who believes in you.
                For me, that's my mother. She's been my biggest cheerleader
                through every late night coding session, every feature launch,
                and every pivot along the way.
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed">
                None of this would be possible without her unwavering support.{' '}
                <span className="text-[#ccb389] font-medium">Thanks, Mom.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Final Invitation */}
        <div className="py-20">
          <Card className="bg-gradient-to-br from-slate-800/90 to-black-600/90 ring-1 ring-[#ccb389]/30 dark:ring-[#ccb389]/30 border-[#ccb389]/30 dark:border-[#ccb389]/30 backdrop-blur-20 p-12 text-center shadow-2xl shadow-[#ccb389]/10 dark:shadow-[#ccb389]/10">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-6">
              Join the Community
            </h2>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              Whether you're a swing trader, scalper, momentum trader, or just
              getting started — there's a place for you here. Bring your
              questions, your ideas, and your willingness to grow alongside
              other traders.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              We celebrate wins, learn from losses, and build together.
            </p>
            <p className="text-xl text-[#ccb389] font-medium mb-8">
              Let's trade 'em well.
            </p>

            <div className="border-t border-zinc-700/50 pt-6 mb-8">
              <p className="text-lg text-zinc-300 mb-1">— Hakan</p>
              <p className="text-sm text-zinc-500">Founder of BullBearz</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#ccb389] to-[#b8a082] text-zinc-900/80 hover:from-[#b8a082] hover:to-[#ccb389] border border-[#dac9acbd] shadow-lg shadow-[#ccb389]/25"
              >
                <Link to="/register">Join Now</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
