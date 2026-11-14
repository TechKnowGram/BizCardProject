'use client';

import { downloadOrReport } from '@/lib/api';
import EmployeesTab from '@/components/company/EmployeesTab';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyEmployeesPage() {
  const { employees, selectedEmployees, setSelectedEmployees, search, setSearch, department, setDepartment, statusFilter, setStatusFilter, setError, busy, setEmployeeEditor, setEmployeeError, setCsvOpen, uploadPhoto, changeEmployeeStatus, toggleEmployee, createRequest, departments, visibleEmployees } = useCompany();
  return (
    <EmployeesTab
      employees={employees}
      visibleEmployees={visibleEmployees}
      departments={departments}
      search={search}
      setSearch={setSearch}
      department={department}
      setDepartment={setDepartment}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      selectedEmployees={selectedEmployees}
      setSelectedEmployees={setSelectedEmployees}
      toggleEmployee={toggleEmployee}
      busy={busy}
      onExport={() => downloadOrReport('/employees/export', 'employees.csv', setError)}
      onImport={() => setCsvOpen(true)}
      onAdd={() => { setEmployeeError(''); setEmployeeEditor(null); }}
      onEdit={employee => { setEmployeeError(''); setEmployeeEditor(employee); }}
      onUploadPhoto={uploadPhoto}
      onChangeStatus={changeEmployeeStatus}
      onCreateRequest={createRequest}
    />
  );
}
