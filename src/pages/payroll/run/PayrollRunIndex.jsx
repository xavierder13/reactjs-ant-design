import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Table, Tag, Button, Space, Select, Tooltip, Modal, Form, Input, Radio, Typography, Alert, App } from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import payrollRunApi from '../../../services/payroll/payrollRunApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { tablePagination } from '../../../utils/tablePagination';
import { cutoffLabel, peso } from '../payrollHelpers';
import { RUN_STATUS_COLORS, PICKER_MODAL_WIDTH } from './runHelpers';
import EmployeePickerTable from './EmployeePickerTable';
import PaidFromSummary from './PaidFromSummary';

const YEARS = Array.from({ length: 4 }, (_, i) => dayjs().year() + 1 - i);
const ALL = 'all'; // the Company select's "All companies"
const RUN_NOTE = { Draft: 'draft', Approved: 'approved (add employees)', Pending: 'waiting for approval' };

// the cut-off's run for this scope (companyId null = all companies)
const runOf = (cutoff, companyId) => (cutoff?.runs || []).find((r) => (r.company_id ?? null) === (companyId ?? null));

// " — draft" (all companies) or " — 2 company payrolls"
const runsNote = (c) => {
  if (!c.runs?.length) return '';
  const all = runOf(c, null);
  if (all) return ` — ${RUN_NOTE[all.status]}`;
  return ` — ${c.runs.length} company payroll${c.runs.length === 1 ? '' : 's'}`;
};

// Payroll runs per cut-off — for All companies or one company (one
// generation, one approval each; a cut-off has one All-companies run or one
// run per company, never both — the backend refuses a mix): Generate makes
// (or re-makes) the scope's Draft from
// Salary History, the DTR, allowances, payroll adjustments, contributions /
// tax and scheduled deductions — for everyone, or only the employees chosen
// (cutoff_candidates; approved payslips can't be chosen). An approved
// cut-off takes only employees not in it (Selected employees only): they
// are added and the run is approved again as its next round, the approved
// payslips stay as they are. View opens its page (/payroll-runs/:id —
// pay register, payslips, approval). Permissions payroll-run-list /
// -generate / -approve / -cancel (Administrator bypasses).
const PayrollRunIndex = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { hasPermission, hasRole } = useAuth();
  const canGenerate = hasRole('Administrator') || hasPermission('payroll-run-generate');

  const [year, setYear] = useState(dayjs().year());
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [cutoffs, setCutoffs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [candidates, setCandidates] = useState(null); // the picked cut-off's, for "Selected employees"
  const [form] = Form.useForm();
  const pickedId = Form.useWatch('payroll_cutoff_id', form);
  const companyValue = Form.useWatch('company_id', form);
  const scope = Form.useWatch('scope', form);
  const picked = cutoffs.find((c) => c.id === pickedId);
  const companyId = companyValue && companyValue !== ALL ? companyValue : null;
  const companyName = (id) => companies.find((c) => c.id === id)?.name || `Company #${id}`;
  // the picked cut-off's run of this scope, and a run of the other kind blocking it
  const scopeRun = runOf(picked, companyId);
  const blocked = picked && !scopeRun && (companyId
    ? (picked.runs.some((r) => r.company_id === null) ? 'This cut-off’s payroll is generated for all companies — generate the employees there.' : null)
    : (picked.runs.length ? `This cut-off is generated per company (${picked.runs.map((r) => companyName(r.company_id)).join(', ')}) — choose a company.` : null));
  const adding = scopeRun?.status === 'Approved'; // approved: only employees not in it can be added
  // …until its pay date: a paid payroll takes no one (a missed employee goes on a later cut-off)
  const paidOut = adding && !!picked?.pay_date && dayjs().format('YYYY-MM-DD') >= picked.pay_date;
  const pending = scopeRun?.status === 'Pending';

  const loadCandidates = async (cutoffId, company) => {
    setCandidates(null);
    if (!cutoffId) return;
    try {
      const { data } = await payrollRunApi.cutoffCandidates(cutoffId, company);
      setCandidates(data.employees);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const handleValuesChange = (changed, all) => {
    let scopeNow = all.scope;
    if ('payroll_cutoff_id' in changed || 'company_id' in changed) {
      const c = cutoffs.find((x) => x.id === all.payroll_cutoff_id);
      const company = all.company_id && all.company_id !== ALL ? all.company_id : null;
      if (runOf(c, company)?.status === 'Approved') scopeNow = 'selected'; // an approved payroll: add employees only
      form.setFieldsValue({ employee_ids: [], scope: scopeNow });
    }
    if (scopeNow === 'selected' && ('payroll_cutoff_id' in changed || 'company_id' in changed || 'scope' in changed)) {
      loadCandidates(all.payroll_cutoff_id, all.company_id && all.company_id !== ALL ? all.company_id : null);
    }
  };

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const { data } = await payrollRunApi.getAll({ year });
      setRuns(data.runs);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchRuns(); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const openGenerate = async () => {
    form.resetFields();
    setCandidates(null);
    setGenOpen(true);
    try {
      const { data } = await payrollRunApi.options();
      setCutoffs(data.cutoffs);
      setCompanies(data.companies || []);
      // the latest cut-off that has ended (else the current one) with no approved / pending payroll
      const today = dayjs().format('YYYY-MM-DD');
      const open = data.cutoffs.filter((c) => c.runs.every((r) => r.status === 'Draft'));
      const pick = open.find((c) => c.date_to < today) || open.find((c) => c.date_from <= today);
      if (pick) form.setFieldsValue({ payroll_cutoff_id: pick.id });
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const generate = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setGenerating(true);
    try {
      const { data } = await payrollRunApi.generate({
        payroll_cutoff_id: values.payroll_cutoff_id,
        company_id: values.company_id && values.company_id !== ALL ? values.company_id : null,
        remarks: values.remarks?.trim() || null,
        ...(values.scope === 'selected' ? { employee_ids: values.employee_ids } : {}),
      });
      message.success(data.message);
      setGenOpen(false);
      navigate(`/payroll-runs/${data.run.id}`);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    { title: 'Cut-off', key: 'cutoff', width: 250, render: (_, r) => cutoffLabel(r.cutoff) },
    { title: 'Company', key: 'company', width: 200, render: (_, r) => r.company?.name || <Typography.Text type='secondary'>All companies</Typography.Text> },
    { title: 'Pay Date', key: 'pay', width: 110, render: (_, r) => (r.cutoff?.pay_date ? formatDate(r.cutoff.pay_date) : '—') },
    { title: 'Status', dataIndex: 'status', width: 100, render: (v) => <Tag color={RUN_STATUS_COLORS[v]}>{v}</Tag> },
    { title: 'Employees', dataIndex: 'employee_count', width: 100, align: 'right' },
    { title: 'Gross', dataIndex: 'gross_pay', width: 130, align: 'right', render: peso },
    { title: 'Deductions', dataIndex: 'total_deductions', width: 130, align: 'right', render: peso },
    { title: 'Net Pay', dataIndex: 'net_pay', width: 140, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
    {
      title: 'Paid From',
      key: 'paid_from',
      width: 280,
      render: (_, r) => (r.paid_from_summary?.length
        ? <PaidFromSummary summary={r.paid_from_summary} compact />
        : <Typography.Text type='secondary'>{r.status === 'Cancelled' ? '—' : 'on approval'}</Typography.Text>),
    },
    {
      title: 'Last Generated',
      key: 'generated',
      width: 190,
      render: (_, r) => (
        <div>
          <div>{r.generator?.name || '—'}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{r.generated_at ? dayjs(r.generated_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`) : '—'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title='View payroll'>
            <Button color='blue' variant='outlined' size='small' icon={<EyeOutlined />} onClick={() => navigate(`/payroll-runs/${r.id}`)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Select value={year} onChange={setYear} options={YEARS.map((y) => ({ value: y, label: y }))} style={{ width: 110 }} />
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchRuns} loading={loading}>Refresh</Button>
          {canGenerate && <Button type='primary' icon={<PlusOutlined />} onClick={openGenerate}>Generate Payroll</Button>}
        </Space>
      </Space>
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={runs}
        loading={loading}
        scroll={{ x: 1730 }}
        pagination={tablePagination(20)}
        locale={{ emptyText: `No payroll for ${year} yet` }}
      />
      <Modal
        keyboard={false}
        open={genOpen}
        title='Generate Payroll'
        okText={adding ? 'Add Employees' : scopeRun?.status === 'Draft' ? 'Regenerate' : 'Generate'}
        okButtonProps={{ disabled: !!blocked || pending || paidOut }}
        onOk={generate}
        confirmLoading={generating}
        onCancel={() => setGenOpen(false)}
        width={scope === 'selected' ? PICKER_MODAL_WIDTH : 520}
        forceRender
      >
        <Form form={form} layout='vertical' initialValues={{ scope: 'all', company_id: ALL }} onValuesChange={handleValuesChange} disabled={generating}>
          <Form.Item name='payroll_cutoff_id' label='Cut-off' rules={[{ required: true, message: 'Choose the cut-off' }]}>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={cutoffs.map((c) => ({ value: c.id, label: `${cutoffLabel(c)}${runsNote(c)}` }))}
              placeholder='Cut-off'
            />
          </Form.Item>
          <Form.Item name='company_id' label='Company' extra='One generation and one approval for the companies chosen — All companies, or one company at a time.'>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={[
                { value: ALL, label: 'All companies' },
                ...companies.map((c) => {
                  const r = runOf(picked, c.id);
                  return { value: c.id, label: `${c.name}${r ? ` — ${RUN_NOTE[r.status]}` : ''}` };
                }),
              ]}
            />
          </Form.Item>
          {blocked && <Alert type='error' showIcon style={{ marginBottom: 12 }} title={blocked} />}
          {paidOut && <Alert type='error' showIcon style={{ marginBottom: 12 }} title={`This payroll was paid on ${formatDate(picked.pay_date)} — no employee can be added. Pay a missed employee with a payroll adjustment on a later cut-off.`} />}
          {pending && <Alert type='warning' showIcon style={{ marginBottom: 12 }} title='This payroll is waiting for approval — an approver must return it before it can be generated again.' />}
          {picked && picked.date_to >= dayjs().format('YYYY-MM-DD') && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title='This cut-off hasn’t ended — dates from today on are paid as worked. Regenerate after it ends.'
            />
          )}
          {adding && !paidOut && (
            <Alert
              type='info'
              showIcon
              style={{ marginBottom: 12 }}
              title='This payroll is approved — only employees not in it can be added.'
              description='They are computed now and the payroll goes back to Draft; submit it so they are approved as its next round. The approved payslips stay exactly as they are.'
            />
          )}
          {scopeRun?.status === 'Draft' && (
            <Alert
              type='info'
              showIcon
              style={{ marginBottom: 12 }}
              title={scope === 'selected'
                ? 'A draft already exists — only the chosen employees are computed again; the others keep their figures.'
                : 'A draft already exists — generating again replaces its figures (approved payslips are kept).'}
            />
          )}
          <Form.Item name='scope' label='Employees'>
            <Radio.Group
              options={[
                { value: 'all', label: 'All employees', disabled: adding },
                { value: 'selected', label: adding ? 'Selected employees (not in the payroll yet)' : 'Selected employees' },
              ]}
            />
          </Form.Item>
          {scope === 'selected' && (
            <Form.Item name='employee_ids' rules={[{ required: true, message: 'Choose the employees' }]}>
              <EmployeePickerTable
                candidates={pickedId ? candidates && candidates.filter((c) => (adding ? c.eligible && !c.in_run : c.eligible || c.in_run)) : []}
                disabled={!pickedId || !!blocked}
                busy={generating}
                showRunStatus={scopeRun?.status === 'Draft'}
              />
            </Form.Item>
          )}
          <Form.Item name='remarks' label='Remarks'>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
            Pays every active employee with a salary saved: basic pay, absences / late / undertime, holiday and rest-day pay, approved overtime and night differential (premium rates), allowances, payroll adjustments of the cut-off, contributions and withholding tax (Payroll Settings schedule), and scheduled deductions due.
          </Typography.Paragraph>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollRunIndex;
