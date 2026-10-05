import { Tooltip, Typography } from 'antd';

const { Text } = Typography;

// Table rows/columns for BranchManpowerReport, built from a
// /branch_manpower/report response.

const ROW_STYLES = {
  area:     { background: '#e2efda', fontWeight: 600 },
  subtotal: { background: '#f5f5f5', fontWeight: 600 },
  grand:    { background: '#fff2cc', fontWeight: 600 },
  percent:  { background: '#fff2cc', fontWeight: 600 },
};

export const formatRate = (rate) => (rate === null || rate === undefined ? '—' : `${(rate * 100).toFixed(2)}%`);

// Negative vacancy = more existing than required.
const renderVacant = (vacant) => (vacant < 0 ? <Text type='warning'>{vacant}</Text> : vacant);

const groupTitle = (group) => (group.type === 'hr_head' && group.id
  ? `HR HEAD: ${group.name.toUpperCase()}${group.description ? ` (${group.description})` : ''}`
  : group.name);

// Flattens report groups into table rows: group header, branches, group
// subtotal (only with more than one group — one would repeat the grand
// total); then grand total and the per-position percentage row. The same
// branch can sit under several HR heads, so row keys include the group.
export const buildRows = (report) => {
  const rows = [];
  const withSubtotals = report.groups.length > 1;

  report.groups.forEach((group, index) => {
    rows.push({ key: `area-${index}`, type: 'area', name: groupTitle(group) });
    group.branches.forEach((branch) => rows.push({
      key: `branch-${index}-${branch.branch_id}`, type: 'branch', name: branch.branch_name, cells: branch.cells, total: branch.total,
    }));
    if (withSubtotals) {
      rows.push({
        key: `subtotal-${index}`, type: 'subtotal', name: `SUB TOTAL - ${group.name}`,
        cells: group.subtotal.cells, total: group.subtotal.total,
      });
    }
  });

  // Per HR head, the grand total counts each branch once (server-side).
  const grand = report.grand_total;
  const grandLabel = report.group_by === 'hr_head' ? 'GRAND TOTAL (each branch once)' : 'GRAND TOTAL';
  rows.push({ key: 'grand', type: 'grand', name: grandLabel, cells: grand.cells, total: grand.total });
  rows.push({ key: 'percent', type: 'percent', name: 'PERCENTAGE', cells: grand.cells, total: grand.total });

  return rows;
};

export const buildColumns = (report) => {
  const columnCount = 1 + report.positions.length * 3 + 3 + 2;
  const style = (row) => ROW_STYLES[row.type];
  const hiddenOnArea = (row) => ({ style: style(row), colSpan: row.type === 'area' ? 0 : 1 });
  // AntD still calls render() for a colSpan-0 cell, and group header rows
  // carry no cells/total — render nothing there.
  const valueCell = (fn) => (_, row) => (row.type === 'area' ? null : fn(row));

  // Req/Exst/Vac triple; on the percentage row the Req cell spans all
  // three and shows the fill rate.
  const triple = (key, title, tooltip, pick) => ({
    key,
    title: tooltip ? <Tooltip title={tooltip}>{title}</Tooltip> : title,
    align: 'center',
    children: [
      {
        key: `${key}-req`, title: 'Req', width: 56, align: 'center',
        render: valueCell((row) => (row.type === 'percent' ? formatRate(pick(row).fill_rate) : pick(row).required)),
        onCell: (row) => ({ style: style(row), colSpan: row.type === 'area' ? 0 : row.type === 'percent' ? 3 : 1 }),
      },
      {
        key: `${key}-exst`, title: 'Exst', width: 56, align: 'center',
        render: valueCell((row) => pick(row).existing),
        onCell: (row) => ({ style: style(row), colSpan: row.type === 'area' || row.type === 'percent' ? 0 : 1 }),
      },
      {
        key: `${key}-vac`, title: 'Vac', width: 56, align: 'center',
        render: valueCell((row) => renderVacant(pick(row).vacant)),
        onCell: (row) => ({ style: style(row), colSpan: row.type === 'area' || row.type === 'percent' ? 0 : 1 }),
      },
    ],
  });

  return [
    {
      key: 'branch', title: 'BRANCH', dataIndex: 'name', fixed: 'left', width: 220,
      onCell: (row) => ({ style: style(row), colSpan: row.type === 'area' ? columnCount : 1 }),
    },
    // Exst is the report's Ending headcount.
    ...report.positions.map((position) => triple(
      `pos-${position.name}`, position.label, position.name,
      (row) => {
        const cell = row.cells[position.name];
        return { ...cell, existing: cell.ending };
      },
    )),
    triple('total', 'TOTAL', null, (row) => row.total),
    {
      key: 'fill_rate', title: 'FILL-IN RATE', width: 96, align: 'center', fixed: 'right',
      render: valueCell((row) => (row.type === 'percent' ? null : formatRate(row.total.fill_rate))),
      onCell: hiddenOnArea,
    },
    {
      key: 'vacancy_rate', title: 'VAC. RATE', width: 96, align: 'center', fixed: 'right',
      render: valueCell((row) => (row.type === 'percent' ? null : formatRate(row.total.vacancy_rate))),
      onCell: hiddenOnArea,
    },
  ];
};
