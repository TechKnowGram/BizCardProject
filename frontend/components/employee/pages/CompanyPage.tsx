'use client';

import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import DataTable, { NameCell } from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { useEmployee } from '@/components/employee/EmployeeDashboard';

export default function EmployeeCompanyPage() {
  const { companies, cards, companySearch, setCompanySearch, changeCompanyOpen, setChangeCompanyOpen, order, activeMembership, pendingMembership, membershipState, openJoinModal, filteredCompanies, goToOrderCompanyCards, toast, joinDialog, membershipSummary } = useEmployee();
  const isMember = membershipState === 'ACTIVE' && activeMembership;
  const directoryRows = isMember ? filteredCompanies.filter(c => c.id !== activeMembership.company_id) : filteredCompanies;

  const directoryColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Company',
      sortValue: c => c.name,
      render: c => <NameCell name={c.name || 'Company'} sub={c.description || undefined} />,
      className: 'max-w-80',
    },
    {
      key: 'website',
      header: 'Website',
      hideOnMobile: true,
      render: c => (c.website ? <span className="text-slate-600">{c.website}</span> : <span className="text-slate-400">—</span>),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: c =>
        pendingMembership?.company_id === c.id ? (
          <StatusBadge value="PENDING" />
        ) : (
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => openJoinModal(c)}>
            {isMember ? 'Request to move' : 'Request to join'}
          </Button>
        ),
    },
  ];

  const directory = (
    <DataTable
      title={isMember ? 'Other companies' : 'Find your company'}
      description={isMember ? 'Send a request to the company you are moving to.' : 'Search for your employer and send a request to join.'}
      rows={directoryRows}
      columns={directoryColumns}
      rowKey={c => c.id}
      search={{ value: companySearch, onChange: setCompanySearch, placeholder: 'Search companies' }}
      emptyMessage={companySearch ? 'No companies match your search.' : 'No companies are listed yet.'}
    />
  );

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title="Company"
        description={isMember ? 'Your company membership and card details.' : 'Join your company to order cards with its approved designs.'}
        actions={isMember ? <Button onClick={goToOrderCompanyCards}>Order company cards</Button> : undefined}
      />

      {isMember ? (
        <>
          <SectionCard title="Your company">
            {membershipSummary(true)}
          </SectionCard>

          <SectionCard
            title="Change company"
            action={
              <Button variant="secondary" className="px-3 py-1.5" onClick={() => setChangeCompanyOpen(!changeCompanyOpen)}>
                {changeCompanyOpen ? 'Close' : 'Change company'}
              </Button>
            }
          >
            <p className="text-sm text-slate-600">
              You can belong to one company at a time. If another company approves your request, it replaces your membership with{' '}
              {activeMembership.company?.name}.
            </p>
          </SectionCard>

          {changeCompanyOpen && directory}
        </>
      ) : (
        <>
          {(membershipState === 'PENDING' || membershipState === 'REJECTED') && (
            <SectionCard title="Your request">
              {membershipSummary(true)}
            </SectionCard>
          )}
          {directory}
        </>
      )}

      {joinDialog}
    </div>
  );
}
