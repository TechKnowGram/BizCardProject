'use client';

import SettingsTab from '@/components/company/SettingsTab';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanySettingsPage() {
  const { user, setTab, company, employees, setMessage, defaultSponsorship, setDefaultSponsorship } = useCompany();
  return (
    <SettingsTab
      company={company}
      username={user?.username}
      sponsorship={defaultSponsorship}
      onSponsorshipChange={value => {
        setDefaultSponsorship(value);
        setMessage(value === 'COMPANY' ? 'Default set to: company pays.' : 'Default set to: employees pay.');
      }}
      setTab={setTab}
    />
  );
}
