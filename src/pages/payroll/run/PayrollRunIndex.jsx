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

const YEARS = Array.from({ length: 4 }, (_, i) => dayjs().year() + 1 - i);

// Payroll runs, one per cut-off: Generate makes (or re-makes) the Draft from
// Salary History, the DTR, allowances, retro adjustments, contributions /
// tax and scheduled deductions — for everyone, or only the employees chosen
// (cutoff_candidates; approved payslips can't be chosen); View opens its page (/payroll-runs/:id —
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
  const [candidates, setCandidates] = useState(null); // the picked cut-off's, for "Selected employees"
  const [form] = Form.useForm();
  const pickedId = Form.useWatch('payroll_cutoff_id', form);
  const scope = Form.useWatch('scope', form);
  const picked = cutoffs.find((c) => c.id === pickedId);

  const loadCandidates = async (cutoffId) => {
    setCandidates(null);
    if (!cutoffId) return;
    try {
      const { data } = await payrollRunApi.cutoffCandidates(cutoffId);
      setCandidates(data.employees);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const handleValuesChange = (changed, all) => {
    if ('payroll_cutoff_id' in changed) form.setFieldsValue({ employee_ids: [] });
    if (all.scope === 'selected' && ('payroll_cutoff_id' in changed || 'scope' in changed)) loadCandidates(all.payroll_cutoff_id);
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
      // the latest cut-off that has ended (else the current one)
      const today = dayjs().format('YYYY-MM-DD');
      const pick = data.cutoffs.find((c) => c.date_to < today) || data.cutoffs.find((c) => c.date_from <= today);
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
    { title: 'Pay Date', key: 'pay', width: 110, render: (_, r) => (r.cutoff?.pay_date ? formatDate(r.cutoff.pay_date) : '—') },
    { title: 'Status', dataIndex: 'status', width: 100, render: (v) => <Tag color={RUN_STATUS_COLORS[v]}>{v}</Tag> },
    { title: 'Employees', dataIndex: 'employee_count', width: 100, align: 'right' },
    { title: 'Gross', dataIndex: 'gross_pay', width: 130, align: 'right', render: peso },
    { title: 'Deductions', dataIndex: 'total_deductions', width: 130, align: 'right', render: peso },
    { title: 'Net Pay', dataIndex: 'net_pay', width: 140, align: 'right', render: (v) => <strong>{peso(v)}</strong> },
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
        scroll={{ x: 1250 }}
        pagination={tablePagination(20)}
        locale={{ emptyText: `No payroll for ${year} yet` }}
      />
      <Modal
        keyboard={false}
        open={genOpen}
        title='Generate Payroll'
        okText={picked?.draft_run_id ? 'Regenerate' : 'Generate'}
        onOk={generate}
        confirmLoading={generating}
        onCancel={() => setGenOpen(false)}
        width={scope === 'selected' ? PICKER_MODAL_WIDTH : 520}
        forceRender
      >
        <Form form={form} layout='vertical' initialValues={{ scope: 'all' }} onValuesChange={handleValuesChange} disabled={generating}>
          <Form.Item name='payroll_cutoff_id' label='Cut-off' rules={[{ required: true, message: 'Choose the cut-off' }]}>
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              options={cutoffs.map((c) => ({ value: c.id, label: `${cutoffLabel(c)}${c.draft_run_id ? ' — draft' : ''}` }))}
              placeholder='Cut-off without an approved payroll'
            />
          </Form.Item>
          {picked && picked.date_to >= dayjs().format('YYYY-MM-DD') && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title='This cut-off hasn’t ended — dates from today on are paid as worked. Regenerate after it ends.'
            />
          )}
          {picked?.draft_run_id && (
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
                { value: 'all', label: 'All employees' },
                { value: 'selected', label: 'Selected employees' },
              ]}
            />
          </Form.Item>
          {scope === 'selected' && (
            <Form.Item name='employee_ids' rules={[{ required: true, message: 'Choose the employees' }]}>
              <EmployeePickerTable
                candidates={pickedId ? candidates && candidates.filter((c) => c.eligible || c.in_run) : []}
                disabled={!pickedId}
                busy={generating}
                showRunStatus={!!picked?.draft_run_id}
              />
            </Form.Item>
          )}
          <Form.Item name='remarks' label='Remarks'>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Typography.Paragraph type='secondary' style={{ marginBottom: 0 }}>
            Pays every active employee with a salary saved: basic pay, absences / late / undertime, holiday and rest-day pay, approved overtime and night differential (premium rates), allowances, retro adjustments of the cut-off, contributions and withholding tax (Payroll Settings schedule), and scheduled deductions due.
          </Typography.Paragraph>
        </Form>
      </Modal>
    </div>
  );
};

export default PayrollRunIndex;
