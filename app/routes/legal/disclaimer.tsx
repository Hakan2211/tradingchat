import { type MetaFunction } from 'react-router';
import { Card, CardContent } from '#/components/ui/card';

export const meta: MetaFunction = () => {
  return [
    { title: 'Disclaimer - BullBearz Trading Community' },
    {
      name: 'description',
      content:
        'Important disclaimer regarding the use of BullBearz trading community platform and educational content.',
    },
  ];
};

export default function Disclaimer() {
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccb389] to-[#b8a082]">
              Disclaimer
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-zinc-400 text-pretty">
            Important information regarding the use of BullBearz trading
            community
          </p>
          <p className="text-sm text-zinc-500 mt-4">
            Effective Date: July 8, 2025
          </p>
        </div>

        <div
          className="h-px bg-gradient-to-r from-transparent via-[#ccb389]/30 to-transparent mb-16"
          aria-hidden="true"
        />

        <div className="space-y-12 pb-20">
          {/* General Disclaimer */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                General Disclaimer
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                The BullBearz chat application (the "App") is provided on an "AS
                IS" and "AS AVAILABLE" basis, with no warranties whatsoever.
                BullBearz disclaims to the fullest extent permitted by law all
                express, implied, and statutory warranties, including, without
                limitation, the warranties of merchantability, fitness for a
                particular purpose, and non-infringement of proprietary rights.
              </p>
            </CardContent>
          </Card>

          {/* Educational Purposes */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                For Educational and Informational Purposes Only
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                All content, materials, and information provided within the
                BullBearz App, including but not limited to chat messages,
                user-generated content, and any other materials, are for
                educational and informational purposes only. This information
                should not be construed as investment or trading advice and is
                not a solicitation or recommendation to buy, sell, or hold any
                positions in any financial markets.
              </p>
            </CardContent>
          </Card>

          {/* No Investment Advice */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                No Investment Advice
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                BullBearz is not a registered investment adviser with the U.S.
                Securities and Exchange Commission or any other regulatory
                authority. We do not offer or provide personalized investment
                advice. Any information that may be deemed "investment advice"
                is impersonal and not tailored to the investment needs of any
                specific person. You are solely responsible for all decisions
                regarding your purchase and sale of securities, the suitability,
                profitability, or appropriateness for you of any security,
                investment, financial product, or investment strategy.
              </p>
            </CardContent>
          </Card>

          {/* High-Risk Activity */}
          <Card className="bg-transparent ring-1 ring-red-800/30 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-red-300 mb-6">
                High-Risk Activity
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                Trading in any security can result in immediate and substantial
                losses of the money invested. You should only invest funds that
                are not allocated for other purposes and that you can afford to
                lose.{' '}
                <span className="text-red-300 font-medium">
                  Do not trade with money you can't afford to lose.
                </span>
              </p>
            </CardContent>
          </Card>

          {/* User-Generated Content */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                User-Generated Content
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                The BullBearz App allows users to post content and information.
                BullBearz does not control and does not endorse any data,
                content, or information posted by users. Your participation in
                the chat is at your own risk, and BullBearz expressly disclaims
                responsibility for any such data, content, or information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
