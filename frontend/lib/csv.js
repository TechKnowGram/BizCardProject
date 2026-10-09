import { validateEmployee } from './validation';

export const employeeHeaders = ['employee_id', 'name', 'designation', 'department', 'email', 'phone'];

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
  const headers = rows.shift() || [];
  const missing = employeeHeaders.filter(key => !headers.includes(key));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`);
  if (new Set(headers).size !== headers.length) throw new Error('Duplicate column headers are not allowed.');
  if (!rows.length) throw new Error('The CSV has no employee rows.');
  const seen = new Set(existingIds);
  return rows.map((cells, index) => {
    const values = Object.fromEntries(employeeHeaders.map(key => [key, (cells[headers.indexOf(key)] || '').trim()]));
    const errors = Object.entries(validateEmployee(values)).map(([key, message]) => `${key}: ${message}`);
    if (cells.length !== headers.length) errors.push('Column count does not match the header.');
    if (seen.has(values.employee_id)) errors.push('Employee ID already exists or is repeated in this file.');
    seen.add(values.employee_id);
    return { values, errors, row: index + 2 };
  });
}
