import AuthScreen from '@/components/auth/AuthScreen';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create an account', description: 'Register your company or create an employee account on BizCard.' };

export default function RegisterPage() {
  return <AuthScreen register />;
}
