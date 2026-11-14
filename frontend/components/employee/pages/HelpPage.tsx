'use client';

import Icon from '@/components/ui/Icon';
import { site } from '@/lib/site';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { PRICE } from '@/components/employee/shared';
import { useEmployee } from '@/components/employee/EmployeeDashboard';

export default function EmployeeHelpPage() {
  const { setTab, cards, orders, order } = useEmployee();
  const faqs = [
    {
      q: 'How do I join my company?',
      a: 'Open Company, find your employer and choose Request to join. Enter your work email and employee ID. If they match the company staff list, you become a member straight away. If not, the company admin reviews your request.',
    },
    {
      q: 'Can I order cards without a company?',
      a: `Yes. Choose Personal card on the My card page. Personal cards cost ৳${PRICE} each and do not need any approval.`,
    },
    {
      q: 'Who pays for company cards?',
      a: 'Your company decides. The Card payment line on your company details shows whether cards are paid by the company or by you. The order summary shows the total before you confirm.',
    },
    {
      q: 'How do I download my card?',
      a: 'Open My card and choose Saved cards, then Download PDF. The PDF is a vector file at 3.5 × 2 in that you can send to any printer.',
    },
    {
      q: 'Can I move to another company?',
      a: 'Yes. On the Company page choose Change company and send a request to the new company. You can be a member of one company at a time, so the new membership replaces the current one once it is approved.',
    },
    {
      q: 'My request was not approved. What now?',
      a: 'Check your employee ID and work email with your HR team, then send a new request from the Company page.',
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Help" description="Answers to common questions about joining a company, ordering and downloading cards." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SectionCard title="Frequently asked questions" bodyClassName="px-0 pb-2">
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {faqs.map(item => (
            <details key={item.q} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-navy-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="m6 8 4 4 4-4" />
                </svg>
              </summary>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          ))}
        </div>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard title="Quick links">
          <ul className="-mx-2 space-y-0.5">
            {[
              { label: 'Order cards', tab: 'card' },
              { label: 'Find or change your company', tab: 'company' },
              { label: 'View your orders', tab: 'orders' },
              { label: 'Your profile', tab: 'profile' },
            ].map(link => (
              <li key={link.tab}>
                <button type="button" onClick={() => setTab?.(link.tab)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-navy-900 hover:bg-slate-50">
                  {link.label}
                  <Icon name="chevronRight" size={16} className="text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Still need help?">
          <p className="text-sm text-slate-600">For questions about your membership, ask your company admin first. For anything else, contact BizCard support.</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a href={`mailto:${site.contact.email}`} className="font-medium text-brand-600 hover:text-brand-700">{site.contact.email}</a></li>
            <li className="text-navy-900">{site.contact.phone}</li>
            <li className="text-xs text-slate-500">{site.contact.hours}</li>
          </ul>
        </SectionCard>
      </div>
      </div>
    </div>
  );
}
