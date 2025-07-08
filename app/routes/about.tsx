import { type MetaFunction } from 'react-router';
import { Card, CardContent } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Link } from 'react-router';
import {
  Heart,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  MessageSquare,
  Bookmark,
  BarChart3,
  Clock,
} from 'lucide-react';

export const meta: MetaFunction = () => {
  return [
    {
      title:
        "About BullBearz - Trading Is Hard. You Don't Have To Do It Alone.",
    },
    {
      name: 'description',
      content:
        'The story of Hakan, an electrical engineer turned trader who built BullBearz from rock bottom - a real trading community for real traders.',
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
            Trading Is Hard.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#ccb389] to-[#b8a082]">
              You Don't Have To Do It Alone.
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-xl leading-8 text-zinc-400 text-pretty mb-8">
            A chat platform built from scratch by a trader, for traders —
            real-time collaboration, genuine insights, authentic community.
          </p>
          <p className="text-lg text-[#ccb389] font-medium mb-8">
            BullBearz exists so you never have to trade alone again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r text-base from-[#ccb389] to-[#b8a082] text-zinc-900/80 hover:from-[#b8a082] hover:to-[#ccb389] border border-[#dac9acbd] shadow-lg shadow-[#ccb389]/25"
            >
              <Link to="/register">Join Now</Link>
            </Button>
            {/* <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[#ccb389]/30 text-neutral-300 hover:bg-[#ccb389]/10 hover:border-[#ccb389]/50"
            >
              <Link to="/roadmap">See Full Roadmap</Link>
            </Button> */}
          </div>
        </div>
        <div
          className="h-px bg-gradient-to-r from-transparent via-[#ccb389]/30 to-transparent"
          aria-hidden="true"
        />

        {/* Rock Bottom Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              Rock Bottom
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
                  <span className="text-[#ccb389] font-medium">Hakan</span>.
                </a>{' '}
                Electrical engineer turned full-time trader. I thought I knew
                what "hard" meant.
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                I was wrong.
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed mb-6">
                There's a special kind of loneliness that comes with staring at
                charts at 3 AM, watching your account bleed red while the world
                sleeps. When COVID hit and everyone seemed to be printing money,
                I was paralyzed — too scared to take trades, too proud to quit,
                too broke to keep going.
              </p>
            </div>
            <div className="flex justify-center">
              <Card className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 p-2">
                <div className="w-64 h-48 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-lg flex items-center justify-center">
                  <img
                    src="/images/hakan.jpg"
                    alt="Hakan at his trading desk"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* The Lifeline Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              The Lifeline
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="flex justify-center lg:order-first">
              <Card className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 ring-1 ring-zinc-800/50 p-2">
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
                My mother saved my life. Not metaphorically.{' '}
                <span className="text-[#ccb389]">Literally.</span> She saw me
                disappearing into a darkness where trading losses felt like life
                failures, where every red day brought thoughts I'm not proud of.
                She refused to let me give up — not on trading, not on building
                something meaningful, not on myself.
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed">
                That's when I realized:{' '}
                <span className="text-[#ccb389] font-medium">
                  this struggle isn't unique to me. It's the trader's condition.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Finding Community Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              Finding Community
            </h2>
          </div>

          <p className="text-lg text-zinc-300 leading-relaxed mb-8">
            After hitting rock bottom, I started joining chat rooms. For the
            first time in months, I wasn't alone with my thoughts. I discovered
            the power of:
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
                className="bg-transparent backdrop-blur-10 p-6 text-center my-3"
              >
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[#ccb389] to-[#b8a082] rounded-lg flex items-center justify-center mb-4">
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
              But here's what frustrated me: most chat rooms were just noise.
              Alert services pushing tickers. Gurus selling dreams. Crowds
              hiding individual voices.
            </p>
            <p className="text-lg text-[#ccb389] font-medium">
              I wanted something different. Something real.
            </p>
          </div>
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
              <Card key={index} className="bg-transparent backdrop-blur-10 p-6">
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

        {/* Why I Built It This Way */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-4">
              Why I Built It This Way
            </h2>
          </div>

          <div className="bg-transparent backdrop-blur-10 p-8 text-pretty">
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              While recovering from my lowest point, I invested time and money
              learning full-stack development. Not because I wanted to become a
              developer, but because I needed to build something that didn't
              exist.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              I'm coding everything from scratch. No team (yet), no venture
              capital, no corporate agenda. Just a trader who knows what traders
              actually need.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed">
              Every feature addresses a real problem I've faced. The journal
              feature? Because I needed to track not just my trades, but my
              emotional patterns. The sector-specific rooms? Because context
              matters more than noise.
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

          <Card className="flex items-center  bg-transparent ring-1 ring-[#ccb389]/40 backdrop-blur-10 p-8 mb-8">
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
                className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10 p-6 text-center"
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

          <Card className="bg-transparent ring-1 ring-[#ccb389]/20 backdrop-blur-10 p-8 text-center">
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

        {/* Final Invitation */}
        <div className="py-20">
          <Card className="bg-gradient-to-br from-slate-800/90 to-black-600/90 ring-1 ring-[#ccb389]/30 backdrop-blur-20 p-12 text-center shadow-2xl shadow-[#ccb389]/10">
            <h2 className="text-3xl font-serif font-medium text-[#ccb389] mb-6">
              The Invitation
            </h2>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              Whether you're a weekend swing trader, scalper, large-cap trader,
              small-cap trader, momentum trader, or finance student just
              starting out, there's a seat at our table. Bring your questions,
              your boldest ideas, or just your willingness to learn.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              We celebrate wins, dissect losses, and treat failure as the
              greatest teacher.
            </p>
            <p className="text-xl text-[#ccb389] font-medium mb-6">
              Trading is hard. You Shouldn’t Have to Go It Alone.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed mb-8">
              Join <span className="text-[#ccb389]">BullBearz</span> today and
              turn every red candle into a lesson, every green candle into
              celebration.
              <br />
              Let's trade 'em well together.
            </p>

            <div className="border-t border-zinc-700/50 pt-6 mb-8">
              <p className="text-lg text-zinc-300 mb-1">— Hakan</p>
              {/* <p className="text-sm text-zinc-400 mb-1">
                Founder & Lead Developer
              </p> */}
              <p className="text-sm text-zinc-500">July 7, 2025</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#ccb389] to-[#b8a082] text-zinc-900/80 hover:from-[#b8a082] hover:to-[#ccb389] border border-[#dac9acbd] shadow-lg shadow-[#ccb389]/25"
              >
                <Link to="/register">Join Now</Link>
              </Button>
              {/* <Button
                asChild
                variant="outline"
                size="lg"
                className="border-[#ccb389]/30 text-neutral-300 hover:bg-[#ccb389]/10 hover:border-[#ccb389]/50"
              >
                <Link to="/roadmap">See Full Roadmap</Link>
              </Button> */}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
