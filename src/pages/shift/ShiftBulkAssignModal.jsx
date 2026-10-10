import { useEffect, useMemo, useState } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, Transfer, Alert, Space, Typography, App,
} from 'antd';
import shiftAssignmentApi from '../../services/shift/shiftAssignmentApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { patternSummary, applyErrors } from './shiftHelpers';

// Group Shift Allocation: one shift and period for many employees at once (e.g. a branch's
// inventory week). Employees come from the ones the user manages, filtered
// by branch / search; the preview names anyone who can't take it (overlap,
// inactive…) and Save stays off until they're removed — all or nothing,
// each employee gets their own shifting and history.
const ShiftBulkAssignModal = ({ open, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [branchId, setBranchId] = useState(null);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [needsFilter, setNeedsFilter] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const watchedIds = Form.useWatch('employee_ids', form);
  const employeeIds = useMemo(() => watchedIds || [], [watchedIds]);
  const shiftId = Form.useWatch('shift_id', form);
  const dates = Form.useWatch('dates', form);
  const ready = !!(open && employeeIds.length && shiftId && dates?.[0] && dates?.[1]);
  const shift = (options?.shifts || []).find((s) => s.id === shiftId);

  // Reset on close (not on open — the candidates of a new open may already
  // have arrived before the open animation ends).
  const handleAfterOpenChange = (isOpen) => {
    if (isOpen) return;
    form.resetFields();
    setBranchId(null);
    setSearch('');
    setCandidates([]);
    setPreview(null);
    setPreviewError(null);
  };

  // Candidates for the current filters; picked ones stay listed.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingCandidates(true);
      try {
        const { data } = await shiftAssignmentApi.candidates({ branch_id: branchId || undefined, search: search || undefined });
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
  }, [open, branchId, search, form, message]);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await shiftAssignmentApi.bulkPreview({
          employee_ids: employeeIds,
          shift_id: shiftId,
          date_from: dates[0].format('YYYY-MM-DD'),
          date_to: dates[1].format('YYYY-MM-DD'),
        });
        if (!cancelled) { setPreview(data); setPreviewError(null); }
      } catch (error) {
        if (cancelled) return;
        if (error.response?.status === 422) {
          // e.g. over 500 employees or a period over a year
          const first = Object.values(error.response.data || {})[0];
          setPreviewError([].concat(first)[0] || 'Check the selection.');
        } else {
          handleApiError(error, message);
        }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [ready, employeeIds, shiftId, dates, message]);

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
      const { data } = await shiftAssignmentApi.bulkStore({
        employee_ids: values.employee_ids,
        shift_id: values.shift_id,
        date_from: values.dates[0].format('YYYY-MM-DD'),
        date_to: values.dates[1].format('YYYY-MM-DD'),
        reason: values.reason?.trim() || null,
      });
      message.success(data.message);
      onSaved();
    } catch (error) {
      if (error.response?.data?.errors) {
        setPreview((p) => ({ ...(p || {}), errors: error.response.data.errors }));
        message.error(error.response.data.message);
      } else {
        applyErrors(error, form, message, handleApiError, (key) => (key.startsWith('date') ? 'dates' : key));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title='Group Shift Allocation'
      okText={employeeIds.length ? `Assign to ${employeeIds.length}` : 'Assign'}
      onOk={handleSave}
      okButtonProps={{ disabled: !employeeIds.length || errorCount > 0 || employeeIds.length > 500 }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={860}
    >
      <Form form={form} layout='vertical'>
        <Space wrap style={{ marginBottom: 8 }}>
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
          {needsFilter && <Typography.Text type='secondary'>Pick a branch or search to list employees.</Typography.Text>}
        </Space>
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
            render={(item) => (
              <span style={errors[item.key] ? { color: '#cf1322' } : undefined}>
                {item.title}
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>{` — ${item.description}`}</Typography.Text>
              </span>
            )}
            styles={{ section: { width: 'calc(50% - 20px)', height: 300 } }}
            locale={{ notFoundContent: loadingCandidates ? 'Loading…' : 'No employees' }}
          />
        </Form.Item>
        <Space wrap align='start' style={{ width: '100%' }}>
          <Form.Item
            name='shift_id'
            label='Shift'
            extra={shift ? patternSummary(shift.days) : null}
            rules={[{ required: true, message: 'Shift is required' }]}
            style={{ minWidth: 300 }}
          >
            <Select
              options={(options?.shifts || []).map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
              showSearch={{ optionFilterProp: 'label' }}
            />
          </Form.Item>
          <Form.Item name='dates' label='Period' rules={[{ required: true, message: 'Period is required' }]}>
            <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
        </Space>
        <Form.Item name='reason' label='Reason'>
          <Input.TextArea rows={2} maxLength={2000} placeholder='e.g. Inventory week' />
        </Form.Item>
      </Form>
      {employeeIds.length > 500 && <Alert type='error' showIcon title='At most 500 employees at once.' style={{ marginBottom: 8 }} />}
      {ready && previewError && <Alert type='error' showIcon title={previewError} style={{ marginBottom: 8 }} />}
      {preview?.warnings?.map((w) => <Alert key={w} type='warning' showIcon title={w} style={{ marginBottom: 8 }} />)}
      {errorCount > 0 && (
        <Alert
          type='error'
          showIcon
          title={`${errorCount} employee(s) can't take this shifting — remove them to continue`}
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

export default ShiftBulkAssignModal;
