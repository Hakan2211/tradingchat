import { type MetaFunction } from 'react-router';
import { Card, CardContent } from '#/components/ui/card';

export const meta: MetaFunction = () => {
  return [
    { title: 'Terms of Service - BullBearz Trading Community' },
    {
      name: 'description',
      content:
        'Terms of service for BullBearz trading community platform, outlining user conduct and platform usage guidelines.',
    },
  ];
};

export default function TermsOfService() {
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
              Terms of Service
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-zinc-400 text-pretty">
            Platform usage guidelines and user conduct expectations
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
          {/* Introduction */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <p className="text-zinc-300 leading-relaxed">
                By using the BullBearz chat application (the "App"), you are
                agreeing to the following Terms of Service.
              </p>
            </CardContent>
          </Card>

          {/* User Conduct */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                1. User Conduct
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-6">
                By using the App, you agree not to:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Transmit, send, or otherwise post unauthorized commercial
                    communications (such as spam).
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Engage in multi-level marketing, including pyramid schemes.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Upload, use, or disseminate viruses or other malicious code.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Solicit login, account, or other personal information from
                    another person.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Bully, intimidate, or harass any person.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Post content that is hateful, threatening, or pornographic;
                    incites violence; or contains nudity or graphic or
                    gratuitous violence.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Use the App in any manner that is unlawful or could be
                    reasonably construed to be in violation of any law, rule, or
                    regulation related to securities or investments.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-300 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    Facilitate or encourage any violations of these Terms of
                    Service.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                2. Intellectual Property
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                All content, materials, and services related to the App are
                owned by BullBearz and are protected by patent, copyright,
                trademark, and other similar laws. You are granted a limited,
                revocable license to use the App for your personal use.
              </p>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                3. Termination of Account
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We reserve the right to terminate your account at our sole
                discretion if you breach these Terms of Service.
              </p>
            </CardContent>
          </Card>

          {/* Limitation of Liability */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                4. Limitation of Liability
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                BullBearz and its directors, officers, shareholders, employees,
                agents, and affiliates shall not be liable to you for any
                consequential, incidental, punitive, exemplary, special, or
                indirect damages of any kind.
              </p>
            </CardContent>
          </Card>

          {/* Indemnification */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                5. Indemnification
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                You agree to indemnify and hold harmless BullBearz and its
                officers, directors, shareholders, employees, agents, and
                affiliates from any and all claims, losses, damages,
                liabilities, and any other costs and expenses (including
                attorneys' fees), arising from or related to your use of the
                App.
              </p>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                6. Governing Law
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                These Terms of Service shall be governed by and construed in
                accordance with the laws of Wyoming.
              </p>
            </CardContent>
          </Card>

          {/* Modifications */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                7. Modifications
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We reserve the right to revise these Terms of Service at any
                time without notice. By using the App, you are agreeing to be
                bound by the then-current version of these Terms of Service.
              </p>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                8. Questions
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                If you have any questions about these Terms of Service, please
                contact us at hakanda3d@gmail.com.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
