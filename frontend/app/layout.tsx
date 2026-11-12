import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Sans, Space_Grotesk } from 'next/font/google';

// Headings use Space Grotesk, everything else DM Sans.
const space = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', weight: ['400', '500', '600'], display: 'swap' });
const dm = DM_Sans({ subsets: ['latin'], variable: '--font-dm', display: 'swap' });

export const metadata: Metadata = {
  title: 'BizCard | Business cards for whole teams',
  description: 'Manage your people, pick a design and get approved, print-ready business cards.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${space.variable} ${dm.variable} min-h-screen bg-white text-black antialiased`}>{children}</body>
    </html>
  );
}
