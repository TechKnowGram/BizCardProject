import AuthScreen from '@/components/auth/AuthScreen';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Register your company', description: 'Register your company on BizCard to order business cards for your whole team.' };

export default function CompanyRegisterPage() {
  return <AuthScreen register />;
}
