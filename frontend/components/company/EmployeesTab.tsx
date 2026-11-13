'use client';

import type { Employee } from '@/lib/types';
import DataTable, { NameCell, type Column } from '@/components/dashboard/DataTable';
import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import StatusBadge from '@/components/StatusBadge';
import { Button, buttonClass } from '@/components/ui';
import { cellNoteClass, checkboxClass, rowButtonClass } from '@/components/CompanyDashboardParts';

export type EmployeeStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface EmployeesTabProps {
  employees: Employee[];
  visibleEmployees: Employee[];
  departments: string[];
  search: string;
  setSearch: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  statusFilter: EmployeeStatusFilter;
  setStatusFilter: (value: EmployeeStatusFilter) => void;
  selectedEmployees: number[];
  setSelectedEmployees: (update: (current: number[]) => number[]) => void;
  toggleEmployee: (id: number) => void;
  busy: boolean;
  onExport: () => void;
  onImport: () => void;
  onAdd: () => void;
  onEdit: (employee: Employee) => void;
  onUploadPhoto: (employee: Employee, file: File | undefined) => void;
  onChangeStatus: (employee: Employee) => void;
  onCreateRequest: () => void;
}

export default function EmployeesTab(props: EmployeesTabProps) {
  const {
    employees, visibleEmployees, departments, search, setSearch, department, setDepartment, statusFilter, setStatusFilter,
    selectedEmployees, setSelectedEmployees, toggleEmployee, busy, onExport, onImport, onAdd, onEdit, onUploadPhoto, onChangeStatus, onCreateRequest,
  } = props;

  const selectable = visibleEmployees.filter((item) => item.is_active);
  const allSelected = selectable.length > 0 && selectable.every((item) => selectedEmployees.includes(item.id));
  const filtered = Boolean(search) || department !== 'ALL' || statusFilter !== 'ALL';

  const columns: Column<Employee>[] = [
    {
      key: 'select',
      header: 'Select',
      align: 'center',
      className: 'w-16',
      render: (employee) => (
        <input
          type="checkbox"
          className={checkboxClass}
          aria-label={`Select ${employee.name}`}
          disabled={!employee.is_active}
          checked={selectedEmployees.includes(employee.id)}
          onChange={() => toggleEmployee(employee.id)}
        />
      ),
    },
    {
      key: 'name',
      header: 'Employee',
      sortValue: (employee) => employee.name.toLowerCase(),
      render: (employee) => <NameCell name={employee.name} sub={`${employee.employee_id}${employee.has_photo ? ' · Photo added' : ''}`} />,
    },
    {
      key: 'role',
      header: 'Role',
      sortValue: (employee) => employee.department,
      render: (employee) => (
        <>
          <span className="block text-sm text-slate-800">{employee.designation}</span>
          <span className={cellNoteClass}>{employee.department}</span>
        </>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      hideOnMobile: true,
      render: (employee) => (
        <>
          <span className="block text-sm text-slate-700">{employee.email}</span>
          {employee.phone && <span className={cellNoteClass}>{employee.phone}</span>}
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (employee) => (employee.is_active ? 0 : 1),
      render: (employee) => <StatusBadge value={employee.is_active ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (employee) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="secondary" className={rowButtonClass} onClick={() => onEdit(employee)}>Edit</Button>
          <label className={buttonClass('secondary', `${rowButtonClass} cursor-pointer`)}>
            {employee.has_photo ? 'Change photo' : 'Add photo'}
            <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onUploadPhoto(employee, event.target.files?.[0])} />
          </label>
          <Button variant={employee.is_active ? 'danger' : 'secondary'} className={rowButtonClass} disabled={busy} onClick={() => onChangeStatus(employee)}>
            {employee.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description="Keep your staff list up to date. Select active employees to order cards for them."
        actions={
          <>
            <Button variant="secondary" onClick={onExport}>Export CSV</Button>
            <Button variant="secondary" onClick={onImport}>Import CSV</Button>
            <Button onClick={onAdd}>Add employee</Button>
          </>
        }
      />

      <DataTable
        rows={visibleEmployees}
        columns={columns}
        rowKey={(employee) => employee.id}
        title="Staff list"
        description={`${visibleEmployees.length} of ${employees.length} employees`}
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, ID or email' }}
        toolbar={
          <>
            <ToolbarSelect
              label="Department"
              value={department}
              onChange={setDepartment}
              options={[{ value: 'ALL', label: 'All departments' }, ...departments.map((item) => ({ value: item, label: item }))]}
            />
            <ToolbarSelect
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as EmployeeStatusFilter)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:border-slate-300">
              <input
                type="checkbox"
                className={checkboxClass}
                disabled={!selectable.length}
                checked={allSelected}
                onChange={() =>
                  setSelectedEmployees((current) =>
                    allSelected
                      ? current.filter((id) => !selectable.some((item) => item.id === id))
                      : [...new Set([...current, ...selectable.map((item) => item.id)])],
                  )
                }
              />
              Select all active
            </label>
            {filtered && (
              <Button variant="quiet" className="h-9 py-0" onClick={() => { setSearch(''); setDepartment('ALL'); setStatusFilter('ALL'); }}>
                Clear filters
              </Button>
            )}
          </>
        }
        emptyTitle={employees.length === 0 ? 'Add your first employee' : 'No matches'}
        emptyMessage={employees.length === 0 ? 'Add people one by one, or import your whole staff list from a CSV file.' : 'No employees match these filters.'}
        emptyAction={employees.length === 0 ? <Button onClick={onAdd}>Add employee</Button> : undefined}
      />

      {selectedEmployees.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-navy-900">{selectedEmployees.length}</span> active employee{selectedEmployees.length === 1 ? '' : 's'} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="quiet" onClick={() => setSelectedEmployees(() => [])}>Clear selection</Button>
            <Button disabled={busy} onClick={onCreateRequest}>{busy ? 'Submitting…' : 'Create card request'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
