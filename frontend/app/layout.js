import './globals.css';

export const metadata = {
  title: 'BizCard | Your professional space',
  description: 'Sign in to your BizCard account.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body className="min-h-screen bg-[#f7f8fc] text-slate-900 antialiased">{children}</body></html>;
}
