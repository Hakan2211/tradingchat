import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion';

const faqItems = [
  {
    id: 'item-1',
    question: 'What makes BullBearz different from Discord or Telegram?',
    answer:
      'BullBearz is built from the ground up for professional traders. We focus on high-signal, low-noise environments, integrated data tools, and enterprise-grade security, eliminating the distractions and security risks of consumer chat apps.',
  },
  {
    id: 'item-2',
    question: 'Is my trading data and communication secure?',
    answer:
      'Absolutely. Security is our highest priority. All communications are end-to-end encrypted, and we adhere to strict data protection and compliance standards suitable for financial professionals.',
  },
  {
    id: 'item-3',
    question: 'Who is the ideal member of the BullBearz community?',
    answer:
      'Our community is curated for professional retail traders, fund managers, and financial analysts who require a sophisticated platform for collaboration, idea generation, and market analysis.',
  },
  {
    id: 'item-4',
    question: 'Can I integrate my existing trading tools or brokers?',
    answer:
      "Yes, our 'For Organizations' plan includes API access for integrating with your existing brokerage accounts, analytics platforms, and other essential trading tools for a seamless workflow.",
  },
  {
    id: 'item-5',
    question: 'How do I switch between monthly and yearly plans?',
    answer:
      'You can easily manage your subscription from your account dashboard. You can upgrade, downgrade, or switch your billing cycle at any time, with changes prorated and applied to your next billing period.',
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="w-full py-24 sm:py-32 relative bg-black">
      <div className="noise-bg" />

      {/* Subtle background variation for visual interest */}
      <div
        className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 h-[35rem] w-[35rem] rounded-full bg-gradient-radial from-[#ccb389]/5 to-transparent blur-[120px]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-medium tracking-tight text-neutral-300 font-serif sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Have questions? We have answers. If you can't find what you're
            looking for, feel free to contact our support team.
          </p>
        </div>
        <div className="mt-20">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-b border-zinc-800/80"
              >
                <AccordionTrigger className=" z-10 w-full py-6 text-left text-base font-medium text-neutral-200 hover:text-[#ccb389] hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 text-base leading-relaxed pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
