'use client';

import CardOrderStudio from '@/components/employee/CardOrderStudio';
import { useEmployee } from '@/components/employee/EmployeeDashboard';

export default function EmployeeCardPage() {
  const { user, setTab, templates, cardSubView, setCardSubView, cardOrderType, setCardOrderType, cardTheme, setCardTheme, order, setOrder, setError, busy, activeMembership, membershipState, checkout, cardRows, toast } = useEmployee();
  return (
    <>
      {toast}
      <CardOrderStudio
        user={user}
        order={order}
        setOrder={setOrder}
        cardOrderType={cardOrderType}
        setCardOrderType={setCardOrderType}
        cardTheme={cardTheme}
        setCardTheme={setCardTheme}
        cardSubView={cardSubView}
        setCardSubView={setCardSubView}
        isMember={membershipState === 'ACTIVE'}
        activeMembership={activeMembership}
        templates={templates}
        cardRows={cardRows}
        busy={busy}
        onCheckout={checkout}
        onGoToCompany={() => setTab?.('company')}
        onError={setError}
      />
    </>
  );
}
