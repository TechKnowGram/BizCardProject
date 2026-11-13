import AuthScreen from '@/components/AuthScreen';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create an employee account', description: 'Create your BizCard account, join your company and order your card.' };

export default function EmployeeRegisterPage() {
  return <AuthScreen register initialType="EMPLOYEE" />;
}
