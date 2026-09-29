export function isValidEmail(raw = '') {
  const email = raw.trim();
  if (email.length > 255 || email.includes('..')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.startsWith('.') || local.endsWith('.') || local.length > 64) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  const labels = domain.split('.');
  return labels.length >= 2 && labels.every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label)) && labels.at(-1).length >= 2;
}

export function validateAuth(values, register = false) {
  const errors = {};
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  else if (register && values.email.trim().split('@').at(-1).toLowerCase() !== 'gmail.com') errors.email = 'Registration requires an @gmail.com address.';
  if (!values.password) errors.password = 'Enter your password.';
  else if (values.password.length > 128) errors.password = 'Use no more than 128 characters.';
  if (register) {
    if (!values.username.trim()) errors.username = 'Enter your name.';
    if (!values.company_name.trim()) errors.company_name = 'Enter your company name.';
    if (values.password.length < 8 || !/[A-Z]/.test(values.password) || !/[a-z]/.test(values.password) || !/[0-9]/.test(values.password) || !/[^A-Za-z0-9\s]/.test(values.password)) errors.password = 'Use 8–128 characters with uppercase, lowercase, number, and special character.';
    if (values.confirm !== values.password) errors.confirm = 'Passwords do not match.';
  }
  return errors;
}

export function validateEmployee(values) {
  const errors = {};
  for (const key of ['employee_id', 'name', 'designation', 'department', 'phone']) {
    if (!values[key]?.trim()) errors[key] = 'This field is required.';
  }
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid employee email address.';
  return errors;
}
