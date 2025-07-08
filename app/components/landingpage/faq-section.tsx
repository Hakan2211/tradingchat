import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion';

const faqItems = [
  {
    id: 'item-1',
    question: 'What makes BullBearz different from other trading communities?',
    answer:
      'BullBearz is an exclusive, curated community focused on high-quality trading insights rather than noise. We provide real-time market analysis, proven strategies from experienced traders, and a supportive environment where serious traders can learn and grow together. Unlike generic Discord servers, we maintain strict quality standards and focus on actionable trading education.',
  },
  {
    id: 'item-2',
    question: 'Do you provide specific trade recommendations or signals?',
    answer:
      'We share trade ideas, market analysis, and educational setups as part of our community discussions. However, all content is for educational purposes only and should not be considered financial advice. Every member is responsible for their own trading decisions and risk management.',
  },
  {
    id: 'item-3',
    question: 'What experience level is required to join?',
    answer:
      'While we welcome traders of all levels, our content is designed for those who are serious about improving their trading skills. Beginners will find educational mentorship, while experienced traders can engage in advanced strategy discussions and market analysis.',
  },
  {
    id: 'item-4',
    question: 'How active is the community and what can I expect?',
    answer:
      'Our community is highly active during market hours with real-time discussions, daily market analysis, and regular educational content. You can expect daily insights, weekly strategy sessions, and ongoing support from our community and fellow members.',
  },
  {
    id: 'item-5',
    question: 'Can I cancel my membership at any time?',
    answer:
      "Yes, you can cancel your membership at any time from your account dashboard. Your access will continue until the end of your current billing period. We also offer a satisfaction guarantee - if you're not happy within the first 14 days, we'll provide a full refund.",
  },
  {
    id: 'item-6',
    question: 'What markets and instruments do you focus on?',
    answer:
      'We primarily focus on US equities and options. Our analysis covers both swing trading and day trading strategies, with emphasis on technical analysis, risk management, and market psychology across different market conditions.',
  },
  {
    id: 'item-7',
    question: 'Is there a money-back guarantee?',
    answer:
      "Yes, we offer a 14-day money-back guarantee for new members. If you're not satisfied with the value and quality of our community within your first 14 days, simply contact me for a full refund.",
  },
  {
    id: 'item-8',
    question: 'How do I access the community after signing up?',
    answer:
      "After completing your registration and payment, you'll receive immediate access to our private community platform. I will be available to help you get oriented and make the most of your membership.",
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
