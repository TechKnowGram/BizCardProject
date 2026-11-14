'use client';

import type { SetupStep } from '@/components/company/OverviewTab';

import OverviewTab from '@/components/company/OverviewTab';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyOverviewPage() {
  const { setTab, company, employees, templates, requests, memberships, busy, decideMembership, createRequest, openRequest, activeEmployees, pendingMemberships, completedRequests, selectedTemplate } = useCompany();
  const profileComplete = Boolean(
    company.phone && company.address && company.website && company.description && company.has_logo
  );
  const setupSteps: SetupStep[] = [
    ['Workspace approved', true, 'overview'],
    ['Complete the company profile', profileComplete, 'profile'],
    ['Add or import employees', employees.length > 0, 'employees'],
    ['Choose a card template', Boolean(selectedTemplate), 'templates'],
    ['Review membership requests', pendingMemberships.length === 0 && memberships.length > 0, 'memberships'],
  ];
  return (
    <OverviewTab
      company={company}
      employees={employees}
      activeEmployees={activeEmployees}
      requests={requests}
      completedRequests={completedRequests}
      pendingMemberships={pendingMemberships}
      selectedTemplate={selectedTemplate}
      setupSteps={setupSteps}
      busy={busy}
      setTab={setTab}
      onCreateRequest={createRequest}
      onOpenRequest={openRequest}
      onDecideMembership={decideMembership}
    />
  );
}
