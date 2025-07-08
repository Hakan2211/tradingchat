import { type MetaFunction } from 'react-router';
import { Card, CardContent } from '#/components/ui/card';

export const meta: MetaFunction = () => {
  return [
    { title: 'Privacy Policy - BullBearz Trading Community' },
    {
      name: 'description',
      content:
        'BullBearz privacy policy detailing how we collect, use, and protect your personal information.',
    },
  ];
};

export default function PrivacyPolicy() {
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
              Privacy Policy
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-8 text-zinc-400 text-pretty">
            How we collect, use, and protect your personal information
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
                BullBearz ("we", "us", "our") values your privacy. This Privacy
                Policy ("Policy") applies to our BullBearz chat application (the
                "App") and the services we provide.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                1. Information We Collect and Use
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-6">
                When you use the BullBearz App, we may collect certain personal
                information about you, including:
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">Identifiers:</p>
                    <p className="text-zinc-300">
                      Name, Alias, Email Address, IP Address, Account Name,
                      Telephone Number, and other unique personal identifiers.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">Chat Content:</p>
                    <p className="text-zinc-300">
                      Any information, including financial information, you
                      voluntarily share in public and private chats.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">
                      Commercial Information:
                    </p>
                    <p className="text-zinc-300">
                      Records of products or services purchased, obtained, or
                      considered.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">
                      Internet Activity:
                    </p>
                    <p className="text-zinc-300">
                      Browsing history, search history, and information
                      regarding your interactions with the App.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                2. How We Use Your Information
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-6">
                We use your personal information for the following purposes:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    To provide and improve our services.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    To manage your account and for billing purposes.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    To deliver marketing communications.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    To prevent fraud and protect the security of our App and
                    users.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full flex-shrink-0"></div>
                  <p className="text-zinc-300">
                    To comply with legal and regulatory requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                3. Who Your Information May Be Shared With
              </h2>
              <p className="text-zinc-300 leading-relaxed mb-6">
                <span className="text-[#ccb389] font-medium">
                  We do not sell your personal information.
                </span>{' '}
                However, we may share your information with:
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">
                      Service Providers:
                    </p>
                    <p className="text-zinc-300">
                      Third-party companies that perform services on our behalf.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">
                      Business Transfers:
                    </p>
                    <p className="text-zinc-300">
                      In the event of a merger, acquisition, or sale of assets.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#ccb389] rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-[#ccb389] font-medium">
                      Legal and Regulatory Authorities:
                    </p>
                    <p className="text-zinc-300">
                      To comply with legal obligations.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                4. Your Choices & Rights
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                Depending on your jurisdiction, you may have certain rights
                regarding your personal information, including the right to
                access, correct, or delete your data. Please contact us to
                exercise your rights.
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                5. Security of Personal Information
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We take reasonable steps to protect your personal information
                from unauthorized access, use, or disclosure.
              </p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                6. Children's Privacy
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                The BullBearz App is not intended for children under the age of
                18. We do not knowingly collect personal information from
                children under 18.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                7. Changes to this Privacy Policy
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="bg-transparent ring-1 ring-zinc-800/50 backdrop-blur-10">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-medium text-[#ccb389] mb-6">
                8. Contact Us
              </h2>
              <p className="text-zinc-300 leading-relaxed">
                If you have any questions about this Privacy Policy, please
                contact us at hakanda3d@gmail.com.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
