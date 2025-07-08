import { type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { PricingSection } from '#/components/landingpage/pricing-section';
import { LandingNavbar } from '#/components/landingpage/landing-navbar';
import { requireAnonymous } from '#/utils/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Pricing - BullBearz Trading Community' },
    {
      name: 'description',
      content:
        'Choose the perfect plan for your trading journey. Exclusive membership tiers for professional traders.',
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return null;
}

export default function Pricing() {
  return (
    <main className="bg-black text-zinc-50 min-h-screen">
      {/* Hero Section with Title */}
      <section className="relative w-full overflow-hidden pt-24 pb-12">
        {/* Background matching the design */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.8) 100%)',
          }}
        />

        {/* Background Gradient */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[30rem] w-[30rem] rounded-full bg-gradient-radial from-[#ccb389]/10 to-transparent blur-[100px]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-medium tracking-tight text-neutral-200 font-serif sm:text-5xl lg:text-6xl">
            Invest in Your Trading Future
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-400 text-pretty max-w-2xl mx-auto">
            Join an exclusive community where professional traders share real
            strategies, live insights, and proven techniques. Your next winning
            trade starts here.
          </p>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="relative w-full py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-medium text-neutral-200 mb-6 font-serif">
              The Real Cost of Trading Alone
            </h2>

            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="bg-gradient-to-br from-zinc-900/20 to-zinc-800/20 rounded-2xl p-6 border border-zinc-800/50">
                <h3 className="text-lg font-medium text-[#ccb389] mb-4">
                  What Solo Trading Actually Costs You
                </h3>
                <p className="text-zinc-300 leading-relaxed mb-4">
                  Trading without guidance isn't just risky — it's expensive.
                  Most traders lose money not from bad luck, but from avoidable
                  mistakes that experienced traders have already learned to
                  avoid.
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-red-300 font-medium text-sm">
                        Emotional Trading
                      </p>
                      <p className="text-zinc-400 text-sm">
                        FOMO buys and panic sells can wipe out weeks of gains
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-red-300 font-medium text-sm">
                        Missing Market Signals
                      </p>
                      <p className="text-zinc-400 text-sm">
                        Key trends spotted too late or not at all
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-red-300 font-medium text-sm">
                        Poor Risk Management
                      </p>
                      <p className="text-zinc-400 text-sm">
                        Oversized positions that turn small losses into
                        disasters
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-800/20 border border-red-800/30 rounded-lg">
                  <p className="text-red-300/80 text-sm">
                    <strong>Reality Check:</strong> A 3% loss on a $25,000
                    account = $750. That's 15 months of our membership. How many
                    of these losses could our community help you avoid?
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-zinc-900/20 to-zinc-800/20 rounded-2xl p-6 border border-zinc-800/50">
                <h3 className="text-lg font-medium text-[#ccb389] mb-4">
                  Why Our Pricing Makes Sense
                </h3>
                <p className="text-zinc-300 leading-relaxed mb-4">
                  We could charge $300+ per month like other "exclusive" trading
                  groups. Instead, we priced our community to be accessible to
                  serious traders at any level, because we believe success
                  should be about skill, not wallet size.
                </p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      <strong className="text-[#ccb389]">$1.67 per day</strong>{' '}
                      - Less than your morning coffee
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      <strong className="text-[#ccb389]">90% less</strong> than
                      private trading coaching ($300-800/hour)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      <strong className="text-[#ccb389]">
                        Unlimited access
                      </strong>{' '}
                      to live market discussions & setups
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                    <p className="text-zinc-300 text-sm">
                      <strong className="text-[#ccb389]">ROI focused</strong> -
                      One saved bad trade covers months of membership
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <p className="text-green-300/80 text-sm">
                    <strong>Smart Investment:</strong> If our insights help you
                    capture just one extra 1% gain per month on a $20K account,
                    you've already paid for the entire year.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-zinc-700/20 to-zinc-600/20 border border-zinc-800/50 rounded-2xl">
              <p className="text-neutral-200 text-xl font-medium mb-3">
                This Isn't About Getting Rich Quick
              </p>
              <p className="text-zinc-300 leading-relaxed">
                We're building a community of traders who understand that
                consistent profitability comes from disciplined strategy, proper
                risk management, and learning from those who've already walked
                the path. Our pricing reflects our commitment to your long-term
                success, not short-term profits from expensive courses that
                overpromise and underdeliver.
              </p>
              <div className="mt-4 pt-4 border-t border-[#ccb389]/20">
                <p className="text-sm text-zinc-400 text-center">
                  <strong className="text-[#ccb389]">Bottom line:</strong> Your
                  trading account is already at risk every day. Isn't it worth
                  $50/month to dramatically improve your odds?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="relative w-full py-12 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="bg-gradient-to-br from-zinc-900/20 to-zinc-800/20 rounded-2xl p-8 border border-zinc-800/50">
            <h3 className="text-xl font-medium text-[#ccb389] mb-6 text-center">
              What Our Members Say About Value
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <p className="text-2xl font-bold text-green-300">$2,400</p>
                <p className="text-sm text-zinc-400">
                  Average amount saved in first 3 months by avoiding bad trades
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-[#ccb389]">15 mins</p>
                <p className="text-sm text-zinc-400">
                  Daily time investment to stay connected with market insights
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-blue-300">40x</p>
                <p className="text-sm text-zinc-400">
                  Return on membership investment for our most active traders
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />
    </main>
  );
}
