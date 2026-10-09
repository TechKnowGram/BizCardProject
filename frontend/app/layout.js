import './globals.css';
import localFont from 'next/font/local';

const manrope = localFont({ src: './fonts/Manrope.ttf', variable: '--font-ui', display: 'swap', weight: '200 800' });

export const metadata = {
  title: 'BizCard | Your professional space',
  description: 'Sign in to your BizCard account.',
};

export default function RootLayout({ children }) {
  return <html lang="en" data-scroll-behavior="smooth"><body className={`${manrope.variable} min-h-screen bg-[#f7f8fc] text-slate-900 antialiased`}>{children}</body></html>;
}
