import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Button, Tooltip, Alert, Radio, DatePicker, Select, Space, App } from 'antd';
import { EyeOutlined, ReloadOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import myPayslipApi from '../../../services/payroll/myPayslipApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import printDocument, { escapeHtml } from '../../../utils/printDocument';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { tablePagination } from '../../../utils/tablePagination';
import { cutoffLabel, peso } from '../payrollHelpers';
import { payslipHtml } from '../reports/printTemplates';
import PayslipModal from '../run/PayslipModal';

// The printed pay sheet's columns (one line per cut-off).
const SHEET_COLUMNS = [
  ['gross', 'Gross Pay'], ['sss_ee', 'SSS'], ['philhealth_ee', 'PhilHealth'], ['pagibig_ee', 'Pag-IBIG'],
  ['tax', 'Tax'], ['loans', 'Loans'], ['other_deductions', 'Other Ded.'], ['total_deductions', 'Total Ded.'], ['net', 'Net Pay'],
];
const money = (v) => Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// My Payslips (/my-payslips, My Workspace / user menu — any signed-in user):
// the payslips of the employee linked to the account, from approved payrolls
// only, newest first; View opens the payslip (Print for a copy). A date or
// cut-off range (the cut-offs of their own payslips) narrows the list and
// drives Print Pay Sheet / Export Pay Sheet (Excel) / Print Payslips.
const MyPayslipsIndex = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [data, setData] = useState({ linked: true, payslips: [] });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [payslip, setPayslip] = useState(null);
  const [range, setRange] = useState({ mode: 'dates', dates: [dayjs().startOf('year'), dayjs()], cutoffFrom: null, cutoffTo: null });

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const { data: res } = await myPayslipApi.getAll();
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchPayslips(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the cut-offs of the employee's own approved payslips, oldest first
  const cutoffs = useMemo(() => data.payslips.map((p) => p.cutoff).filter(Boolean)
    .sort((a, b) => (a.date_from < b.date_from ? -1 : 1)), [data.payslips]);

  // { date_from, date_to } of the range, or null while incomplete
  const params = useMemo(() => {
    if (range.mode === 'cutoffs') {
      const a = cutoffs.find((c) => c.id === range.cutoffFrom);
      const b = cutoffs.find((c) => c.id === range.cutoffTo);
      if (!a || !b) return null;
      return a.date_from <= b.date_from ? { date_from: a.date_from, date_to: b.date_to } : { date_from: b.date_from, date_to: a.date_to };
    }
    if (!range.dates?.[0] || !range.dates?.[1]) return null;
    return { date_from: range.dates[0].format('YYYY-MM-DD'), date_to: range.dates[1].format('YYYY-MM-DD') };
  }, [range, cutoffs]);

  // the list shows the payslips whose cut-off ends in the range
  const shown = params
    ? data.payslips.filter((p) => p.cutoff && p.cutoff.date_to >= params.date_from && p.cutoff.date_to <= params.date_to)
    : data.payslips;

  const paramsOrWarn = () => {
    if (!params) message.warning('Choose the range first.');
    return params;
  };
  const period = (p) => `${dayjs(p.date_from).format(DISPLAY_DATE_FORMAT)} – ${dayjs(p.date_to).format(DISPLAY_DATE_FORMAT)}`;

  const printPaySheet = async () => {
    const p = paramsOrWarn();
    if (!p) return;
    setBusy('sheet');
    try {
      const { data: res } = await myPayslipApi.paySheet(p);
      if (!res.lines.length) { message.info('No approved payslip in this range.'); return; }
      const head = SHEET_COLUMNS.map(([, label]) => `<th class="right">${label}</th>`).join('');
      const row = (l, first) => `<tr${first ? '' : ' class="total"'}>${first}${SHEET_COLUMNS.map(([k]) => `<td class="right">${money(l[k])}</td>`).join('')}</tr>`;
      const body = `
        <div class="head"><div><h1>Pay Sheet</h1><div>${escapeHtml(user?.name)}</div></div><div class="right muted">${escapeHtml(period(p))}<br/>Approved payrolls only</div></div>
        <table class="grid"><thead><tr><th>Cut-off</th><th>Pay Date</th>${head}</tr></thead><tbody>
        ${res.lines.map((l) => row(l, `<td>${escapeHtml(cutoffLabel(l.cutoff))}</td><td>${escapeHtml(formatDate(l.cutoff.pay_date))}</td>`)).join('')}
        ${row(res.totals, '').replace('<tr class="total">', `<tr class="total"><td colspan="2">TOTAL (${res.lines.length} cut-off${res.lines.length === 1 ? '' : 's'})</td>`)}
        </tbody></table>`;
      if (!printDocument(`Pay Sheet ${p.date_from} – ${p.date_to}`, body)) message.error('Allow pop-ups to print the pay sheet');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const exportPaySheet = async () => {
    const p = paramsOrWarn();
    if (!p) return;
    setBusy('export');
    try {
      const response = await myPayslipApi.paySheetDownload(p);
      if (await downloadBlobResponse(response, `MyPaySheet_${p.date_from}_${p.date_to}.xls`, message)) message.success('Pay sheet downloaded.');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const printPayslips = async () => {
    const p = paramsOrWarn();
    if (!p) return;
    setBusy('payslips');
    try {
      const { data: res } = await myPayslipApi.payslips(p);
      if (!res.payslips.length) { message.info('No approved payslip in this range.'); return; }
      const body = res.payslips
        .map((x, i) => `<div${i < res.payslips.length - 1 ? ' style="page-break-after:always"' : ''}>${payslipHtml(x.payslip, x.run, res.employer)}</div>`)
        .join('');
      if (!printDocument(`Payslips ${p.date_from} – ${p.date_to}`, body)) message.error('Allow pop-ups to print the payslips');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setBusy(null);
    }
  };

  const cutoffOpts = cutoffs.map((c) => ({ value: c.id, label: cutoffLabel(c) }));

  const columns = [
    { title: 'Cut-off', key: 'cutoff', render: (_, r) => cutoffLabel(r.cutoff) },
    { title: 'Pay Date', key: 'pay', width: 120, render: (_, r) => (r.cutoff?.pay_date ? formatDate(r.cutoff.pay_date) : '—') },
    { title: 'Gross', dataIndex: 'gross_pay', width: 130, align: 'right', render: peso },
    { title: 'Deductions', dataIndex: 'total_deductions', width: 130, align: 'right', render: peso },
    { title: 'Net Pay', dataIndex: 'net_pay', width: 140, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Tooltip title='View payslip'>
          <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => setPayslip({ id: r.id, full_name: r.cutoff?.code })} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      {!data.linked && (
        <Alert type='info' showIcon style={{ marginBottom: 12 }} title='Your account is not linked to an employee record — ask HR to link it to see your payslips.' />
      )}
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Radio.Group
            optionType='button'
            value={range.mode}
            onChange={(e) => setRange((r) => ({ ...r, mode: e.target.value }))}
            options={[{ value: 'dates', label: 'Dates' }, { value: 'cutoffs', label: 'Cut-offs' }]}
          />
          {range.mode === 'dates' ? (
            <DatePicker.RangePicker value={range.dates} onChange={(v) => setRange((r) => ({ ...r, dates: v }))} format={DISPLAY_DATE_FORMAT} allowClear={false} />
          ) : (
            <>
              <Select style={{ width: 230 }} placeholder='From cut-off' value={range.cutoffFrom} onChange={(v) => setRange((r) => ({ ...r, cutoffFrom: v }))} options={cutoffOpts} showSearch={{ optionFilterProp: 'label' }} />
              <Select style={{ width: 230 }} placeholder='To cut-off' value={range.cutoffTo} onChange={(v) => setRange((r) => ({ ...r, cutoffTo: v }))} options={cutoffOpts} showSearch={{ optionFilterProp: 'label' }} />
            </>
          )}
        </Space>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchPayslips} loading={loading}>Refresh</Button>
          <Button icon={<PrinterOutlined />} onClick={printPaySheet} loading={busy === 'sheet'} disabled={!data.linked}>Print Pay Sheet</Button>
          <Button icon={<DownloadOutlined />} onClick={exportPaySheet} loading={busy === 'export'} disabled={!data.linked}>Export Pay Sheet</Button>
          <Button icon={<PrinterOutlined />} onClick={printPayslips} loading={busy === 'payslips'} disabled={!data.linked}>Print Payslips</Button>
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={shown}
        loading={loading}
        scroll={{ x: 760 }}
        pagination={tablePagination(10)}
        locale={{ emptyText: 'No payslips yet — they appear once a payroll is approved' }}
      />
      <PayslipModal target={payslip} onClose={() => setPayslip(null)} loadPayslip={myPayslipApi.show} selfService />
    </div>
  );
};

export default MyPayslipsIndex;
