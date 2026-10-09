import { peso } from '../payrollHelpers';

// Right-aligned peso column.
export const money = (title, dataIndex, width = 120, extra = {}) => ({ title, dataIndex, width, align: 'right', render: peso, ...extra });

// The total of one numeric field over the rows (Table.Summary rows).
export const sumOf = (rows, key) => rows.reduce((t, r) => t + Number(r[key] || 0), 0);

// "Last, First Middle"
export const nameOf = (r) => r.full_name || `${r.last_name}, ${r.first_name}${r.middle_name ? ` ${r.middle_name}` : ''}`;
