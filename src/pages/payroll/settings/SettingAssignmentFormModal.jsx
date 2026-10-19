import { useEffect, useMemo, useState } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, Radio, Row, Col, Transfer, Space, Alert, DatePicker, TimePicker, Typography, App,
} from 'antd';
import payrollSettingApi from '../../../services/payroll/payrollSettingApi';
import handleApiError from '../../../utils/handleApiError';
import dayjs from 'dayjs';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors, cutoffOptions, toNumber, FACTOR_HINTS, ASSIGN_SCOPES, assignScopeLabel } from '../payrollHelpers';
import { EMPLOYEE_BULK_MODAL_WIDTH, EMPLOYEE_FORM_MODAL_WIDTH } from '../../../utils/modalWidths';
import EmployeeTransferItem from '../../../components/EmployeeTransferItem';

const AGENCIES = [
  { key: 'sss_deduction', label: 'SSS' },
  { key: 'philhealth_deduction', label: 'PhilHealth' },
  { key: 'pagibig_deduction', label: 'Pag-IBIG' },
  { key: 'tax_deduction', label: 'Withholding Tax' },
];
const FOLLOW = 'Follow the next level';
const toTime = (t) => (t ? dayjs(`2000-01-01 ${String(t).slice(0, 5)}`) : undefined);
const MAX_BULK = 500;

// Assign (record = null) or change the payroll settings of an employee /
// position / branch / company for a coverage: Cut-offs (From – To; To follows
// From, so one cut-off = that payroll period only) or Dates (the cut-offs
// ending in them, as the payroll reports' date filter). After it the next
// level applies again. Only the settings filled in apply; the rest follow the
// next level. Who it applies to can't change.
// Employees: one, or Bulk — many at once like Group Shift Allocation (branch /
// search → pick); each gets their own assignment, all or nothing, and the
// preview names anyone who can't take it.
const SettingAssignmentFormModal = ({ open, record, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [branchId, setBranchId] = useState(null);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [needsFilter, setNeedsFilter] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [preview, setPreview] = useState(null);

  const scope = Form.useWatch('scope', form) || 'branch'; // unset while the form is not mounted
  const mode = Form.useWatch('mode', form) || 'one';
  const bulk = !record && scope === 'employee' && mode === 'bulk';
  const watchedIds = Form.useWatch('employee_ids', form);
  const employeeIds = useMemo(() => watchedIds || [], [watchedIds]);
  const coverage = Form.useWatch('coverage', form) || 'cutoffs';
  const cutoffId = Form.useWatch('start_cutoff_id', form);
  const endCutoffId = Form.useWatch('end_cutoff_id', form);
  const dates = Form.useWatch('dates', form);
  const watched = Form.useWatch([], form);
  const nightOff = watched?.night_diff_enabled === false;
  const fieldsKey = JSON.stringify({
    ...Object.fromEntries(['coverage', 'start_cutoff_id', 'end_cutoff_id', 'daily_rate_factor', 'hours_per_day', 'night_diff_enabled', ...AGENCIES.map((a) => a.key)].map((k) => [k, watched?.[k] ?? null])),
    night_diff_from: watched?.night_diff_from?.format('HH:mm') ?? null,
    night_diff_to: watched?.night_diff_to?.format('HH:mm') ?? null,
  });

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) {
      form.resetFields();
      setBranchId(null);
      setSearch('');
      setCandidates([]);
      setPreview(null);
      return;
    }
    form.resetFields();
    if (record) {
      form.setFieldsValue({
        scope: record.scope,
        scope_id: record.scope_id,
        coverage: record.coverage,
        start_cutoff_id: record.start_cutoff_id || undefined,
        end_cutoff_id: record.end_cutoff_id || undefined,
        dates: record.coverage === 'dates' ? [dayjs(record.effective_date), dayjs(record.end_date)] : undefined,
        daily_rate_factor: record.daily_rate_factor === null ? undefined : Number(record.daily_rate_factor),
        hours_per_day: toNumber(record.hours_per_day),
        night_diff_enabled: record.night_diff_enabled ?? undefined,
        night_diff_from: toTime(record.night_diff_from),
        night_diff_to: toTime(record.night_diff_to),
        sss_deduction: record.sss_deduction || undefined,
        philhealth_deduction: record.philhealth_deduction || undefined,
        pagibig_deduction: record.pagibig_deduction || undefined,
        tax_deduction: record.tax_deduction || undefined,
        reason: record.reason,
      });
    }
  };

  // bulk: candidates for the branch / search; picked ones stay listed
  useEffect(() => {
    if (!open || !bulk) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingCandidates(true);
      try {
        const { data } = await payrollSettingApi.assignmentCandidates({ branch_id: branchId || undefined, search: search || undefined });
        if (cancelled) return;
        setNeedsFilter(data.needs_filter);
        setCandidates((prev) => {
          const picked = prev.filter((e) => (form.getFieldValue('employee_ids') || []).includes(e.id));
          const ids = new Set(picked.map((e) => e.id));
          return [...picked, ...data.employees.filter((e) => !ids.has(e.id))];
        });
      } catch (error) {
        if (!cancelled) handleApiError(error, message);
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, bulk, branchId, search, form, message]);

  // the coverage as the API takes it
  const coverageOf = (values) => (values.coverage === 'dates'
    ? { coverage: 'dates', date_from: values.dates?.[0]?.format('YYYY-MM-DD') ?? null, date_to: values.dates?.[1]?.format('YYYY-MM-DD') ?? null }
    : { coverage: 'cutoffs', start_cutoff_id: values.start_cutoff_id ?? null, end_cutoff_id: values.end_cutoff_id ?? null });

  // the cut-offs it covers (ending inside its dates); null until complete
  const covered = useMemo(() => {
    const cutoffs = options?.cutoffs || [];
    let from;
    let to;
    if (coverage === 'dates') {
      if (!dates?.[0] || !dates?.[1]) return null;
      from = dates[0].format('YYYY-MM-DD');
      to = dates[1].format('YYYY-MM-DD');
    } else {
      const a = cutoffs.find((c) => c.id === cutoffId);
      const b = cutoffs.find((c) => c.id === endCutoffId);
      if (!a || !b) return null;
      from = a.date_from;
      to = b.date_to;
    }
    return cutoffs.filter((c) => c.date_to >= from && c.date_to <= to);
  }, [options, coverage, dates, cutoffId, endCutoffId]);

  const settingsOf = (values) => ({
    daily_rate_factor: values.daily_rate_factor ?? null,
    hours_per_day: values.hours_per_day ?? null,
    night_diff_enabled: values.night_diff_enabled ?? null,
    night_diff_from: values.night_diff_from?.format('HH:mm') ?? null,
    night_diff_to: values.night_diff_to?.format('HH:mm') ?? null,
    ...Object.fromEntries(AGENCIES.map((a) => [a.key, values[a.key] || null])),
  });

  // bulk: who can't take it (already assigned from that cut-off …)
  const ready = !!(bulk && employeeIds.length && covered !== null && employeeIds.length <= MAX_BULK);
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await payrollSettingApi.assignmentBulkPreview({
          employee_ids: employeeIds, ...coverageOf(form.getFieldsValue()), ...settingsOf(form.getFieldsValue()),
        });
        if (!cancelled) setPreview(data);
      } catch (error) {
        if (!cancelled && error.response?.status !== 422) handleApiError(error, message);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, employeeIds, dates, fieldsKey, message]);

  const errors = (ready && preview?.errors) || {};
  const errorCount = Object.keys(errors).length;
  const nameOf = (id) => {
    const e = candidates.find((c) => c.id === Number(id));
    return e ? `${e.employee_code} ${e.full_name}` : `#${id}`;
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const common = { ...coverageOf(values), ...settingsOf(values), reason: values.reason?.trim() || null };
      let data;
      if (bulk) {
        ({ data } = await payrollSettingApi.assignmentBulkStore({ employee_ids: values.employee_ids, ...common }));
      } else {
        const payload = { scope: values.scope, scope_id: values.scope_id, ...common };
        ({ data } = record ? await payrollSettingApi.assignmentUpdate(record.id, payload) : await payrollSettingApi.assignmentStore(payload));
      }
      message.success(data.message);
      onSaved();
    } catch (error) {
      if (bulk && error.response?.data?.errors) {
        setPreview((p) => ({ ...(p || {}), errors: error.response.data.errors }));
        message.error(error.response.data.message);
      } else {
        applyFormErrors(error, form, message, handleApiError, (k) => (k === 'date_from' || k === 'date_to' ? 'dates' : k));
      }
    } finally {
      setSaving(false);
    }
  };

  const groupOptions = ({
    company: options?.companies,
    branch: options?.branches,
    position: options?.positions,
  }[scope] || []).map((g) => ({ value: g.id, label: g.name }));
  const factorOptions = (options?.daily_rate_factors || []).map((f) => ({ value: f, label: `${f} days${FACTOR_HINTS[f] ? ` — ${FACTOR_HINTS[f]}` : ''}` }));
  const scheduleOptions = (options?.deduction_schedules || []).map((s) => ({ value: s, label: s }));

  return (
    <Modal
      keyboard={false}
      open={open}
      title={record ? 'Change Assigned Settings' : 'Assign Settings'}
      okText={bulk && employeeIds.length ? `Assign to ${employeeIds.length}` : 'Save'}
      onOk={handleSave}
      okButtonProps={{ disabled: bulk && (!employeeIds.length || errorCount > 0 || (ready && !!preview?.error) || employeeIds.length > MAX_BULK) }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={bulk ? EMPLOYEE_BULK_MODAL_WIDTH : EMPLOYEE_FORM_MODAL_WIDTH}
    >
      <Form form={form} layout='vertical' initialValues={{ scope: 'branch', mode: 'one', coverage: 'cutoffs' }}>
        {/* solid buttons like Coverage, so the chosen level stands out; on
            change it is fixed — kept as a hidden field and shown as one
            read-only line below instead */}
        {record ? <Form.Item name='scope' hidden><Input /></Form.Item> : (
          <Space wrap align='start'>
            <Form.Item name='scope' label='Applies to'>
              <Radio.Group
                optionType='button' buttonStyle='solid'
                options={ASSIGN_SCOPES}
                onChange={() => form.setFieldsValue({ scope_id: undefined, employee_ids: [] })}
              />
            </Form.Item>
            {scope === 'employee' && (
              <Form.Item name='mode' label='Employees'>
                <Radio.Group
                  optionType='button' buttonStyle='solid'
                  options={[{ value: 'one', label: 'One' }, { value: 'bulk', label: 'Bulk' }]}
                  onChange={() => form.setFieldsValue({ scope_id: undefined, employee_ids: [] })}
                />
              </Form.Item>
            )}
          </Space>
        )}
        {record && (
          <Form.Item label='Applies to'>
            <Input readOnly value={`${assignScopeLabel(scope)}: ${record.scope_name || ''}`} />
          </Form.Item>
        )}
        {!record && !bulk && (
          <Form.Item name='scope_id' label={assignScopeLabel(scope)} rules={[{ required: true, message: `${assignScopeLabel(scope)} is required` }]}>
            {scope === 'employee'
              ? <EmployeeSelect placeholder='Search employee' activeOnly />
              : <Select options={groupOptions} showSearch={{ optionFilterProp: 'label' }} placeholder={`Select the ${assignScopeLabel(scope).toLowerCase()}`} />}
          </Form.Item>
        )}
        {bulk && (
          <>
            {/* its own row above the lists (a block, so it never sits beside
                the fields above it) */}
            <Form.Item label='Find employees' style={{ marginBottom: 8 }}>
              <Space wrap>
                <Select
                  allowClear
                  placeholder='Branch'
                  value={branchId}
                  onChange={(v) => setBranchId(v ?? null)}
                  options={(options?.branches || []).map((b) => ({ value: b.id, label: b.name }))}
                  showSearch={{ optionFilterProp: 'label' }}
                  style={{ width: 220 }}
                />
                <Input.Search placeholder='Code or name' allowClear onSearch={(v) => setSearch(v.trim())} style={{ width: 220 }} />
              </Space>
            </Form.Item>
            <Form.Item
              name='employee_ids'
              valuePropName='targetKeys'
              rules={[{ required: true, type: 'array', min: 1, message: 'Select at least one employee' }]}
            >
              <Transfer
                dataSource={candidates.map((e) => ({
                  key: e.id,
                  title: `${e.employee_code} - ${e.full_name}`,
                  description: `${e.position?.name || 'No position'} · ${e.branch?.name || ''}`,
                }))}
                titles={['Employees', 'Assign to']}
                showSearch
                filterOption={(input, item) => `${item.title} ${item.description}`.toLowerCase().includes(input.toLowerCase())}
                className='employee-transfer'
                render={(item) => <EmployeeTransferItem item={item} error={!!errors[item.key]} />}
                styles={{ section: { width: 'calc(50% - 20px)', height: 340 } }}
                locale={{ notFoundContent: [needsFilter ? 'Pick a branch or search to list employees.' : (loadingCandidates ? 'Loading…' : 'No employees'), 'None selected yet'] }}
              />
            </Form.Item>
          </>
        )}
        <Form.Item name='coverage' label='Coverage'>
          <Radio.Group
            optionType='button' buttonStyle='solid'
            options={[{ value: 'cutoffs', label: 'Cut-offs' }, { value: 'dates', label: 'Dates' }]}
          />
        </Form.Item>
        {coverage === 'cutoffs' ? (
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name='start_cutoff_id' label='From Cut-off' rules={[{ required: true, message: 'Start cut-off is required' }]}>
                <Select
                  options={cutoffOptions(options?.cutoffs)}
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder='Select the cut-off'
                  onChange={(v) => {
                    // To follows From: one cut-off = that payroll period only
                    const cutoffs = options?.cutoffs || [];
                    const from = cutoffs.find((c) => c.id === v);
                    const to = cutoffs.find((c) => c.id === form.getFieldValue('end_cutoff_id'));
                    if (!to || (from && to.date_from < from.date_from)) form.setFieldValue('end_cutoff_id', v);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='end_cutoff_id' label='To Cut-off' rules={[{ required: true, message: 'End cut-off is required' }]}>
                <Select options={cutoffOptions(options?.cutoffs)} showSearch={{ optionFilterProp: 'label' }} placeholder='Same as From' />
              </Form.Item>
            </Col>
          </Row>
        ) : (
          <Form.Item name='dates' label='Dates Covered' rules={[{ required: true, message: 'Dates covered are required' }]}>
            <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
        )}
        <Typography.Paragraph type='secondary' style={{ marginTop: -8 }}>
          {covered === null
            ? 'Applies only to the cut-offs covered; after them the next level (General) applies again. The first cut-off covered can’t have an approved or pending payroll.'
            : (covered.length
              ? `Covers ${covered.length} cut-off${covered.length === 1 ? '' : 's'}: ${covered.map((c) => c.code).join(', ')}${coverage === 'dates' ? ' (the cut-offs ending in these dates)' : ''} — after that, the next level applies again.`
              : 'No cut-off ends in these dates yet — it will cover the cut-offs made later that end inside them.')}
        </Typography.Paragraph>
        <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>
          Fill in only what differs — a blank setting follows the next level (position, branch, company, then the General tab).
        </Typography.Text>
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Form.Item name='daily_rate_factor' label='Working days a year (daily-rate factor)'>
              <Select allowClear options={factorOptions} placeholder={FOLLOW} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='hours_per_day' label='Hours per day'>
              <InputNumber min={1} max={24} precision={2} style={{ width: '100%' }} placeholder={FOLLOW} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='night_diff_enabled' label='Night differential'>
              <Select
                allowClear
                options={[{ value: true, label: 'On' }, { value: false, label: 'Off' }]}
                placeholder={FOLLOW}
                onChange={(v) => { if (v === false) form.setFieldsValue({ night_diff_from: undefined, night_diff_to: undefined }); }}
              />
            </Form.Item>
          </Col>
          {/* both or neither; at least 10 PM – 6 AM (Labor Code Art. 86) */}
          <Col xs={12} md={6}>
            <Form.Item
              name='night_diff_from'
              label='Night diff. from'
              dependencies={['night_diff_to']}
              rules={[{ validator: (_, v) => (!v && form.getFieldValue('night_diff_to') ? Promise.reject(new Error('Enter both, or neither')) : Promise.resolve()) }]}
            >
              <TimePicker format='HH:mm' disabled={nightOff} placeholder='Next level' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item
              name='night_diff_to'
              label='to'
              dependencies={['night_diff_from']}
              rules={[{ validator: (_, v) => (!v && form.getFieldValue('night_diff_from') ? Promise.reject(new Error('Enter both, or neither')) : Promise.resolve()) }]}
            >
              <TimePicker format='HH:mm' disabled={nightOff} placeholder='Next level' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {!nightOff && (
          <Typography.Text type='secondary' style={{ display: 'block', marginTop: -16, marginBottom: 12 }}>
            Night differential hours: only to widen them for these employees — they must cover at least 10:00 PM – 6:00 AM.
          </Typography.Text>
        )}
        {nightOff && (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 12 }}
            title='Night differential is required by law for most employees'
            description='Turn it off only for exempt employees (e.g. managerial employees, field personnel) and give the reason below.'
          />
        )}
        <Row gutter={16}>
          {AGENCIES.map((a) => (
            <Col xs={24} md={12} key={a.key}>
              <Form.Item name={a.key} label={`${a.label} deducted`}>
                <Select allowClear options={scheduleOptions} placeholder={FOLLOW} />
              </Form.Item>
            </Col>
          ))}
        </Row>
        <Form.Item
          name='reason'
          label='Reason / Memo'
          rules={nightOff ? [{ required: true, whitespace: true, message: 'Give the reason for turning night differential off (e.g. managerial — exempt)' }] : []}
        >
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
      {bulk && employeeIds.length > MAX_BULK && <Alert type='error' showIcon title={`At most ${MAX_BULK} employees at once.`} style={{ marginBottom: 8 }} />}
      {ready && preview?.error && <Alert type='error' showIcon title={preview.error} style={{ marginBottom: 8 }} />}
      {errorCount > 0 && (
        <Alert
          type='error'
          showIcon
          title={`${errorCount} employee(s) can't take these settings — remove them to continue`}
          description={(
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {Object.entries(errors).map(([id, msg]) => <li key={id}>{`${nameOf(id)}: ${msg}`}</li>)}
            </ul>
          )}
        />
      )}
    </Modal>
  );
};

export default SettingAssignmentFormModal;
