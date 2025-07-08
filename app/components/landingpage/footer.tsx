import { Link } from 'react-router';
import { Twitter } from 'lucide-react';

// Data for footer links, organized by category
const footerLinks = [
  {
    title: 'Product',
    links: [
      // { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      // { label: 'Journal', href: '/journal' },
      // { label: 'Security', href: '/security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      // { label: 'Blog', href: '/blog' },
      // { label: 'Careers', href: '/careers' },
      // { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Disclaimer', href: '/disclaimer' },
    ],
  },
];

const socialLinks = [
  {
    name: 'Twitter',
    href: 'https://x.com/hakanbilgo',
    icon: (props: any) => <Twitter {...props} />,
  },
  // {
  //   name: 'GitHub',
  //   href: '#',
  //   icon: (props: any) => <Github {...props} />,
  // },
];

export function Footer() {
  return (
    <footer
      id="footer"
      className="relative text-neutral-300"
      aria-labelledby="footer-heading"
      style={{
        background:
          'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(10,10,10,1) 100%)',
      }}
    >
      {/* Spotlight transition effect */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-radial from-[#ccb389]/20 via-[#ccb389]/5 to-transparent blur-sm"
        aria-hidden="true"
      />

      {/* Subtle top border with gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ccb389]/30 to-transparent"
        aria-hidden="true"
      />

      {/* Noise texture for consistency */}
      <div className="noise-bg opacity-30" />

      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="lg:grid lg:grid-cols-5 lg:gap-8">
          {/* Logo and Description Column */}
          <div className="space-y-4 lg:col-span-2">
            <Link to="/" className="text-xl font-medium text-[#ccb389]">
              BullBearz
            </Link>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
              An exclusive trading community for professionals who demand
              excellence.
            </p>
          </div>

          {/* Link Columns */}
          <div className="mt-12 grid grid-cols-2 gap-8 lg:mt-0 lg:col-span-3 lg:grid-cols-3">
            {footerLinks.map((category) => (
              <div key={category.title}>
                <h3 className="text-sm font-semibold leading-6 text-neutral-200">
                  {category.title}
                </h3>
                <ul role="list" className="mt-6 space-y-4">
                  {category.links.map((item) => (
                    <li key={item.label}>
                      <Link
                        to={item.href}
                        className="text-sm leading-6 text-zinc-400 hover:text-[#ccb389] transition-colors duration-300"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar: Copyright and Socials */}
        <div className="mt-16 border-t border-zinc-800/80 pt-8 sm:mt-20 md:flex md:items-center md:justify-between lg:mt-24">
          <div className="flex space-x-6 md:order-2">
            {socialLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-zinc-500 hover:text-zinc-400"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="sr-only">{item.name}</span>
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </a>
            ))}
          </div>
          <p className="mt-8 text-xs leading-5 text-zinc-500 md:order-1 md:mt-0">
            © {new Date().getFullYear()} BullBearz, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
