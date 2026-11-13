import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Hind_Siliguri, Poppins } from 'next/font/google';

// Headings and brand UI use Poppins & Hind Siliguri (TechKnowGram corporate typography)
const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  variable: '--font-hind',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BizCard | Enterprise Business Card Platform',
  description: 'Manage your people, brand standards, and print-ready business cards with enterprise reliability.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${poppins.variable} ${hindSiliguri.variable} min-h-screen bg-white text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
