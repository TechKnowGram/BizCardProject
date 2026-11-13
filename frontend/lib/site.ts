/**
 * Site-wide details shown on the public pages.
 *
 * PLACEHOLDER VALUES: replace these with the real company details before launch.
 * Everything in the footer and contact areas reads from here, so this is the only
 * file that needs editing.
 */
export const site = {
  name: 'BizCard',
  legalName: 'BizCard Ltd.',
  tagline: 'Business cards for your whole company.',
  contact: {
    email: 'hello@bizcard.example',
    phone: '+880 1700-000000',
    address: 'House 00, Road 00, Gulshan, Dhaka 1212, Bangladesh',
    hours: 'Sun–Thu, 9:00–18:00 (GMT+6)',
  },
  social: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: 'lucide:linkedin' },
    { label: 'Facebook', href: 'https://www.facebook.com/', icon: 'lucide:facebook' },
  ],
} as const;
