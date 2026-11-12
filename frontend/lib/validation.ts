export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export interface AuthValues {
  email: string;
  password: string;
  username?: string;
  company_name?: string;
  confirm?: string;
}

export interface EmployeeValues {
  employee_id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  status?: string;
}

export function isValidEmail(raw = ''): boolean {
  const email = raw.trim();
  if (email.length > 255 || email.includes('..')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.startsWith('.') || local.endsWith('.') || local.length > 64) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)) && labels.at(-1)!.length >= 2;
}

export function validateAuth(values: AuthValues, register = false): FieldErrors {
  const errors: FieldErrors = {};
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  else if (register && values.email.trim().split('@').at(-1)!.toLowerCase() !== 'gmail.com') errors.email = 'Registration requires an @gmail.com address.';
  if (!values.password) errors.password = 'Enter your password.';
  else if (values.password.length > 128) errors.password = 'Use no more than 128 characters.';
  if (register) {
    if (!values.username?.trim()) errors.username = 'Enter your name.';
    if (!values.company_name?.trim()) errors.company_name = 'Enter your company name.';
    if (values.password.length < 8 || !/[A-Z]/.test(values.password) || !/[a-z]/.test(values.password) || !/[0-9]/.test(values.password) || !/[^A-Za-z0-9\s]/.test(values.password)) errors.password = 'Use 8–128 characters with uppercase, lowercase, number, and special character.';
    if (values.confirm !== values.password) errors.confirm = 'Passwords do not match.';
  }
  return errors;
}

export function validateEmployee(values: Partial<EmployeeValues>, csvMode = false): FieldErrors<keyof EmployeeValues> {
  const errors: FieldErrors<keyof EmployeeValues> = {};
  const required = csvMode
    ? (['employee_id', 'name'] as const)
    : (['employee_id', 'name', 'designation', 'department', 'phone'] as const);
  for (const key of required) {
    if (!values[key]?.trim()) errors[key] = 'This field is required.';
  }
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid employee email address.';
  return errors;
}
