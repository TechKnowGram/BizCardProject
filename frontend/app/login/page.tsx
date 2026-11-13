import AuthScreen from '@/components/AuthScreen';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign in', description: 'Sign in to your BizCard workspace.' };

export default function LoginPage() { return <AuthScreen />; }
