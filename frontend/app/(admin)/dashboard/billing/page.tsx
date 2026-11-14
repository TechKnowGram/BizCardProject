import RolePage from '@/components/dashboard/RolePage';
import CompanyBillingPage from '@/components/company/pages/BillingPage';

export default function BillingPage() {
  return <RolePage company={<CompanyBillingPage />} />;
}
