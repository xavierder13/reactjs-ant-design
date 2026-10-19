import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Modal, Form, Input, Select, DatePicker, Row, Col, Alert, Button, App,
} from 'antd';
import clearanceApi from '../../services/clearance/clearanceApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate, toDayjs } from '../../utils/formatDate';
import EmployeeSelect from '../manpower_request/request/EmployeeSelect';
import { applyLeaveErrors } from '../leave/leaveHelpers';
import { EMPLOYEE_FORM_MODAL_WIDTH } from '../../utils/modalWidths';

// Start a clearance (clearance = null) or edit an open one's header. New:
// pick a recent separation (an offboarding record with no clearance yet) —
// its last day of work fills in; "Not listed" picks any employee instead.
// Template: the one covering the separation's branch (else the default)
// is picked for HR; blank = the server picks the same. Its components
// become the clearance's sign-offs, in order, when it's saved.
const ClearanceFormModal = ({ open, clearance, separationTypes, templates = [], onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [anyEmployee, setAnyEmployee] = useState(false);
  const editing = !!clearance;
  const separationType = Form.useWatch('separation_type', form);

  const handleAfterOpenChange = (isOpen) => {
    form.resetFields();
    setAnyEmployee(false);
    setSearch('');
    if (!isOpen) return;
    if (clearance) {
      form.setFieldsValue({
        separation_type: clearance.separation_type,
        separation_specify: clearance.separation_specify,
        last_day_of_work: toDayjs(clearance.last_day_of_work),
        due_date: toDayjs(clearance.due_date),
        remarks: clearance.remarks,
      });
    } else {
      form.setFieldsValue({ separation_type: 'Resignation' });
    }
  };

  useEffect(() => {
    if (!open || editing) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingCandidates(true);
      try {
        const { data } = await clearanceApi.candidates(search || undefined);
        if (!cancelled) setCandidates(data.candidates);
      } catch (error) {
        if (!cancelled) handleApiError(error, message);
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, editing, search, message]);

  const pickCandidate = (offboardingId) => {
    const c = candidates.find((x) => x.offboarding_id === offboardingId);
    const template = templates.find((t) => (t.branch_ids || []).includes(c?.branch_id)) || templates.find((t) => t.is_default);
    form.setFieldsValue({
      employee_id: c?.employee_id,
      last_day_of_work: toDayjs(c?.last_day_of_work),
      clearance_template_id: template?.id,
    });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      separation_type: values.separation_type,
      separation_specify: values.separation_type === 'Other' ? values.separation_specify.trim() : null,
      last_day_of_work: values.last_day_of_work.format('YYYY-MM-DD'),
      due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
      remarks: values.remarks || null,
    };
    setSaving(true);
    try {
      const { data } = editing
        ? await clearanceApi.update(clearance.id, payload)
        : await clearanceApi.create({
          ...payload,
          employee_id: values.employee_id,
          offboarding_id: anyEmployee ? null : values.offboarding_id,
          clearance_template_id: values.clearance_template_id || null,
        });
      message.success(data.message);
      onSaved(data.clearance);
    } catch (error) {
      applyLeaveErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={editing ? `Edit Clearance ${clearance.clearance_no}` : 'Start Clearance'}
      okText={editing ? 'Save' : 'Start Clearance'}
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={EMPLOYEE_FORM_MODAL_WIDTH}
    >
      <Form form={form} layout='vertical'>
        {editing ? (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
            title={`${clearance.employee?.employee_code} - ${clearance.employee?.full_name}`}
          />
        ) : (
          <>
            {!anyEmployee ? (
              <Form.Item
                name='offboarding_id'
                label='Separation'
                extra={(
                  <span>
                    Offboarding records with a last day in the past 120 days and no clearance yet.{' '}
                    <Button type='link' size='small' style={{ padding: 0 }} onClick={() => { setAnyEmployee(true); form.setFieldsValue({ offboarding_id: undefined, employee_id: undefined }); }}>
                      Not listed?
                    </Button>
                  </span>
                )}
                rules={[{ required: true, message: 'Choose the separation' }]}
              >
                <Select
                  showSearch={{ filterOption: false, onSearch: setSearch }}
                  loading={loadingCandidates}
                  placeholder='Search employee code or name'
                  onChange={pickCandidate}
                  notFoundContent={loadingCandidates ? 'Loading…' : 'No separation without a clearance'}
                  options={candidates.map((c) => ({
                    value: c.offboarding_id,
                    label: `${c.employee_code} - ${c.employee_name} · ${c.branch || '—'} · last day ${formatDate(c.last_day_of_work)}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <Form.Item
                name='employee_id'
                label='Employee'
                extra={(
                  <span>
                    No offboarding record is linked.{' '}
                    <Button type='link' size='small' style={{ padding: 0 }} onClick={() => { setAnyEmployee(false); form.setFieldsValue({ employee_id: undefined }); }}>
                      Pick a separation instead
                    </Button>
                  </span>
                )}
                rules={[{ required: true, message: 'Employee is required' }]}
              >
                <EmployeeSelect />
              </Form.Item>
            )}
            {/* set from the separation picked */}
            {!anyEmployee && <Form.Item name='employee_id' hidden><Input /></Form.Item>}
            <Form.Item
              name='clearance_template_id'
              label='Clearance Template'
              extra="The components to clear, in order. Blank = the template for the employee's branch, else the default."
            >
              <Select
                allowClear
                placeholder="Automatic — by the employee's branch"
                options={templates.map((t) => ({ value: t.id, label: `${t.name}${t.is_default ? ' (default)' : ''}` }))}
              />
            </Form.Item>
          </>
        )}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name='separation_type' label='Separation Type' rules={[{ required: true, message: 'Separation type is required' }]}>
              <Select options={separationTypes.map((t) => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
          {separationType === 'Other' && (
            <Col xs={24} sm={12}>
              <Form.Item
                name='separation_specify'
                label='Specify'
                rules={[{ required: true, whitespace: true, message: 'Specify the separation type' }]}
              >
                <Input maxLength={255} placeholder='e.g. Transferred to a sister company' />
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12}>
            <Form.Item name='last_day_of_work' label='Last Day of Work' rules={[{ required: true, message: 'Last day of work is required' }]}>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='due_date'
              label='Clear By'
              extra='Blank = the last day of work. Final pay is due within 30 days of separation.'
              dependencies={['last_day_of_work']}
              rules={[({ getFieldValue }) => ({
                validator(_, v) {
                  const last = getFieldValue('last_day_of_work');
                  return !v || !last || !v.isBefore(last, 'day')
                    ? Promise.resolve()
                    : Promise.reject(new Error('The due date can\'t be before the last day of work'));
                },
              })]}
            >
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} disabledDate={(d) => {
                const last = form.getFieldValue('last_day_of_work');
                return !!last && d.isBefore(dayjs(last), 'day');
              }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ClearanceFormModal;
