import { isValidEmail } from './validation';

export const requiredHeaders = ['employee_id', 'name', 'email'];
export const optionalHeaders = ['department', 'designation', 'status', 'phone'];
export const allSupportedHeaders = [...requiredHeaders, ...optionalHeaders];

// Normalize header text to standard canonical field names
export function normalizeHeader(raw = '') {
  const clean = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    employee_id: 'employee_id',
    employeeid: 'employee_id',
    emp_id: 'employee_id',
    id: 'employee_id',

    full_name: 'name',
    fullname: 'name',
    name: 'name',
    employee_name: 'name',

    official_email: 'email',
    officialemail: 'email',
    email: 'email',
    work_email: 'email',

    department: 'department',
    dept: 'department',

    designation: 'designation',
    title: 'designation',
    role: 'designation',
    position: 'designation',

    phone: 'phone',
    mobile: 'phone',
    contact: 'phone',

    status: 'status',
  };
  return aliases[clean] || clean;
}

// Handles quoted commas, escaped quotes and line breaks inside quoted fields.
export function parseEmployeeCsv(text, existingIds = []) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(field); if (row.some(value => value.trim())) rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('An opening quote has no closing quote. Check the CSV file.');
  row.push(field); if (row.some(value => value.trim())) rows.push(row);

  const rawHeaders = rows.shift() || [];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  // Check required headers: employee_id, name, email
  const missing = requiredHeaders.filter(key => !normalizedHeaders.includes(key));
  if (missing.length) {
    const readable = missing.map(m => (m === 'name' ? 'full_name (or name)' : m === 'email' ? 'official_email (or email)' : m));
    throw new Error(`Missing required column(s): ${readable.join(', ')}`);
  }

  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new Error('Duplicate column headers are not allowed.');
  }

  if (!rows.length) throw new Error('The CSV has no employee rows.');

  const seen = new Set(existingIds);

  return rows.map((cells, index) => {
    const getVal = key => {
      const idx = normalizedHeaders.indexOf(key);
      return idx >= 0 && cells[idx] !== undefined ? cells[idx].trim() : '';
    };

    const values = {
      employee_id: getVal('employee_id'),
      name: getVal('name'),
      email: getVal('email').toLowerCase(),
      department: getVal('department') || 'General',
      designation: getVal('designation') || 'Staff',
      status: (getVal('status') || 'ACTIVE').toUpperCase(),
      phone: getVal('phone') || '',
    };

    const errors = [];
    if (!values.employee_id) errors.push('Employee ID is required.');
    if (!values.name) errors.push('Full name is required.');
    if (!values.email) {
      errors.push('Official email is required.');
    } else if (!isValidEmail(values.email)) {
      errors.push('Invalid email format.');
    }

    if (seen.has(values.employee_id)) {
      errors.push(`Employee ID "${values.employee_id}" already exists or is repeated.`);
    }
    seen.add(values.employee_id);

    return { values, errors, row: index + 2 };
  });
}
