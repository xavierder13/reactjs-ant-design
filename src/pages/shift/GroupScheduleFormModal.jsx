import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Form, Input, Select, DatePicker, Radio, Segmented, Alert, Collapse, Typography, App,
} from 'antd';
import groupScheduleApi from '../../services/shift/groupScheduleApi';
import shiftApi from '../../services/shift/shiftApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { GROUP_KINDS, GROUP_SCOPES, patternSummary, applyErrors, scopeLabel } from './shiftHelpers';

// Set (record = null) or change a default schedule for a company / branch /
// position: a Default Work Schedule from a date, or a Group Shifting for a
// period. Takes effect directly. The preview says how many active employees
// follow it on its first day — the rest keep their own Work Schedule /
// shifting, or a more specific default (position over branch over company).
const GroupScheduleFormModal = ({ open, record, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const kind = Form.useWatch('kind', form);
  const scope = Form.useWatch('scope', form) || 'branch'; // unset while the form is not mounted
  const scopeId = Form.useWatch('scope_id', form);
  const shiftId = Form.useWatch('shift_id', form);
  const dateFrom = Form.useWatch('date_from', form);
  const dates = Form.useWatch('dates', form);
  const period = kind === 'shifting' ? (dates?.[0] && dates?.[1] ? [dates[0], dates[1]] : null) : (dateFrom ? [dateFrom, null] : null);
  const ready = !!(open && kind && scope && scopeId && shiftId && period);
  // the edited default's own shift may be inactive (not in the options)
  const shift = shifts.find((s) => s.id === shiftId) || (record && record.shift_id === shiftId ? record.shift : undefined);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setPreview(null);
    if (record) {
      form.setFieldsValue({
        kind: record.kind,
        scope: record.scope,
        scope_id: record.scope_id,
        shift_id: record.shift_id,
        date_from: dayjs(record.date_from),
        dates: record.date_to ? [dayjs(record.date_from), dayjs(record.date_to)] : undefined,
        reason: record.reason,
      });
    }
    try {
      const { data } = await shiftApi.options();
      setShifts(data.shifts || []);
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const payloadOf = (values) => ({
    kind: values.kind,
    scope: values.scope,
    scope_id: values.scope_id,
    shift_id: values.shift_id,
    date_from: (values.kind === 'shifting' ? values.dates?.[0] : values.date_from)?.format('YYYY-MM-DD'),
    date_to: values.kind === 'shifting' ? values.dates?.[1]?.format('YYYY-MM-DD') : null,
    reason: values.reason?.trim() || null,
  });

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const { data } = await groupScheduleApi.preview({
          kind, scope, scope_id: scopeId, shift_id: shiftId,
          date_from: period[0].format('YYYY-MM-DD'),
          date_to: period[1] ? period[1].format('YYYY-MM-DD') : null,
          id: record?.id,
        });
        if (!cancelled) setPreview(data);
      } catch (error) {
        if (!cancelled) {
          setPreview(null);
          if (error.response?.status !== 422) handleApiError(error, message);
        }
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, kind, scope, scopeId, shiftId, dateFrom, dates, record, message]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload = payloadOf(values);
      const { data } = record ? await groupScheduleApi.update(record.id, payload) : await groupScheduleApi.create(payload);
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyErrors(error, form, message, handleApiError, (key) => {
        if (kind === 'shifting' && (key === 'date_from' || key === 'date_to')) return 'dates';
        return key;
      });
    } finally {
      setSaving(false);
    }
  };

  const groupOptions = ({
    company: options?.companies,
    branch: options?.branches,
    position: options?.positions,
  }[scope] || []).map((g) => ({ value: g.id, label: g.name }));
  const shiftOptions = shifts.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  if (record?.shift && !shiftOptions.some((o) => o.value === record.shift_id)) {
    shiftOptions.push({ value: record.shift_id, label: `${record.shift.code} — ${record.shift.name} (inactive)` });
  }

  const reach = preview?.reach;
  const own = kind === 'shifting' ? 'their own shifting in this period' : 'their own Work Schedule';

  return (
    <Modal
      keyboard={false}
      open={open}
      title={record ? 'Change Default Schedule' : 'Set Default Schedule'}
      okText='Save'
      onOk={handleSave}
      okButtonProps={{ disabled: ready && (!!preview?.error || previewing) }}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={640}
    >
      <Form form={form} layout='vertical' initialValues={{ kind: 'schedule', scope: 'branch' }}>
        <Form.Item
          name='kind'
          label='Type'
          extra={kind === 'shifting'
            ? 'Temporary: for the period it replaces everyone\'s Work Schedule — only an employee\'s own shifting comes first.'
            : 'Permanent from the date: used by employees who have no Work Schedule of their own.'}
        >
          <Radio.Group options={GROUP_KINDS} optionType='button' disabled={!!record} />
        </Form.Item>
        <Form.Item name='scope' label='Applies to'>
          <Segmented options={GROUP_SCOPES} disabled={!!record} onChange={() => form.setFieldValue('scope_id', undefined)} />
        </Form.Item>
        <Form.Item name='scope_id' label={scopeLabel(scope)} rules={[{ required: true, message: `${scopeLabel(scope)} is required` }]}>
          <Select options={groupOptions} showSearch={{ optionFilterProp: 'label' }} disabled={!!record} placeholder={`Select the ${scopeLabel(scope).toLowerCase()}`} />
        </Form.Item>
        <Form.Item
          name='shift_id'
          label='Shift'
          extra={shift ? patternSummary(shift.days) : null}
          rules={[{ required: true, message: 'Shift is required' }]}
        >
          <Select options={shiftOptions} showSearch={{ optionFilterProp: 'label' }} />
        </Form.Item>
        {kind === 'shifting' ? (
          <Form.Item name='dates' label='Period' rules={[{ required: true, message: 'Period is required' }]}>
            <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
        ) : (
          <Form.Item name='date_from' label='Effective Date' rules={[{ required: true, message: 'Effective date is required' }]}>
            <DatePicker format={DISPLAY_DATE_FORMAT} />
          </Form.Item>
        )}
        <Form.Item name='reason' label='Reason / Memo'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>

      {ready && preview && (
        <>
          {preview.error && <Alert type='error' showIcon title={preview.error} style={{ marginBottom: 12 }} />}
          {reach && (
            <Alert
              type={reach.follow ? 'info' : 'warning'}
              showIcon
              title={`${reach.follow} of ${reach.employees} active employee${reach.employees === 1 ? '' : 's'} will follow this on ${period[0].format(DISPLAY_DATE_FORMAT)}.`}
              description={(reach.own || reach.more_specific) ? (
                <Collapse
                  ghost
                  size='small'
                  items={[
                    reach.own && {
                      key: 'own',
                      label: `${reach.own} keep ${own}`,
                      children: <Typography.Text type='secondary'>{reach.own_names.join('; ')}{reach.own > reach.own_names.length ? ' …' : ''}</Typography.Text>,
                    },
                    reach.more_specific && {
                      key: 'specific',
                      label: `${reach.more_specific} follow a more specific default (position over branch over company)`,
                      children: <Typography.Text type='secondary'>{reach.specific_names.join('; ')}{reach.more_specific > reach.specific_names.length ? ' …' : ''}</Typography.Text>,
                    },
                  ].filter(Boolean)}
                />
              ) : null}
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default GroupScheduleFormModal;
