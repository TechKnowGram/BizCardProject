import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Hind_Siliguri, Montserrat } from 'next/font/google';

// Montserrat for the whole interface; Hind Siliguri covers Bengali text.
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  variable: '--font-hind',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'BizCard | Business cards for your whole team',
    template: '%s | BizCard',
  },
  description: 'Keep your staff list in one place, use your own card design, approve requests and download print-ready PDFs with a QR check on every card.',
  applicationName: 'BizCard',
  openGraph: {
    type: 'website',
    siteName: 'BizCard',
    title: 'BizCard | Business cards for your whole team',
    description: 'Your own card design, filled in for every employee, approved and ready to print.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className={`${montserrat.variable} ${hindSiliguri.variable}`}>
      <body className={`min-h-screen bg-white text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
