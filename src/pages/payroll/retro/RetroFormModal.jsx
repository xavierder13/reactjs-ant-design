import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Radio, Row, Col, Alert, App } from 'antd';
import retroApi from '../../../services/payroll/retroApi';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors, cutoffOptions, pesoInputProps, toNumber } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';

// Add or edit a retro adjustment: type, earning / deduction, the period it
// covers, the amount and the cut-off that pays / recovers it. `suggestion`
// prefills a new one from a back-dated salary change (its computation is
// kept with it); `retro` = edit (Open only).
const RetroFormModal = ({ open, retro, suggestion, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const retroType = Form.useWatch('retro_type', form);
  const fixedAdjustment = retroType ? options.types?.[retroType] : null;
  const today = dayjs().format('YYYY-MM-DD');

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    const source = retro || suggestion;
    if (source) {
      form.setFieldsValue({
        retro_type: source.retro_type,
        adjustment: source.adjustment,
        period: [dayjs(source.period_from), dayjs(source.period_to)],
        amount: toNumber(source.amount),
        payroll_cutoff_id: retro ? retro.payroll_cutoff_id : options.next_cutoff_id,
        computation: source.computation,
        reason: retro?.reason || null,
      });
    } else {
      form.setFieldsValue({ retro_type: 'Retro Salary', adjustment: 'Earning', payroll_cutoff_id: options.next_cutoff_id });
    }
  };

  const onTypeChange = (type) => {
    const only = options.types?.[type];
    if (only) form.setFieldsValue({ adjustment: only });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      retro_type: values.retro_type,
      adjustment: values.adjustment,
      period_from: values.period[0].format('YYYY-MM-DD'),
      period_to: values.period[1].format('YYYY-MM-DD'),
      amount: values.amount,
      payroll_cutoff_id: values.payroll_cutoff_id,
      computation: values.computation?.trim() || null,
      reason: values.reason?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = retro
        ? await retroApi.update(retro.id, payload)
        : await retroApi.create({
          ...payload,
          employee_id: suggestion ? suggestion.employee.id : values.employee_id,
          compensation_id: suggestion?.compensation_id || null,
        });
      message.success(data.message);
      onSaved(data.retro);
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError, (k) => (k === 'period_from' || k === 'period_to' ? 'period' : k));
    } finally {
      setSaving(false);
    }
  };

  // a cut-off that has ended can't be picked (the saved one stays visible)
  const cutoffChoices = cutoffOptions(options.cutoffs).map((o) => {
    const c = options.cutoffs.find((x) => x.id === o.value);
    return { ...o, disabled: c.date_to < today && o.value !== retro?.payroll_cutoff_id };
  });
  const employee = retro?.employee || suggestion?.employee;

  return (
    <Modal
      open={open}
      title={retro ? 'Edit Retro Adjustment' : 'Add Retro Adjustment'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 720 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        {employee ? (
          <Form.Item label='Employee'>
            <Input readOnly value={`${employee.employee_code} - ${employee.full_name}`} />
          </Form.Item>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Select an employee' }]}>
            <EmployeeSelect placeholder='Search employee' />
          </Form.Item>
        )}
        {suggestion && (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 16 }}
            title={`From the salary change ${rateLabel(suggestion.previous.pay_basis, suggestion.previous.basic_rate)} → ${rateLabel(suggestion.version.pay_basis, suggestion.version.basic_rate)} effective ${dayjs(suggestion.version.effective_date).format(DISPLAY_DATE_FORMAT)}, saved ${dayjs(suggestion.version.created_at).format(DISPLAY_DATE_FORMAT)}.`}
          />
        )}
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name='retro_type' label='Type' rules={[{ required: true, message: 'Select the type' }]}>
              <Select options={Object.keys(options.types || {}).map((t) => ({ value: t, label: t }))} onChange={onTypeChange} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name='adjustment' label='Adjustment' rules={[{ required: true, message: 'Select earning or deduction' }]}>
              <Radio.Group
                optionType='button'
                disabled={!!fixedAdjustment}
                options={[{ value: 'Earning', label: 'Earning (+)' }, { value: 'Deduction', label: 'Deduction (−)' }]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name='period' label='Period Covered' rules={[{ required: true, message: 'Select the period' }]}>
              <DatePicker.RangePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name='amount' label='Amount' rules={[{ required: true, message: 'Amount is required' }]}>
              <InputNumber {...pesoInputProps} min={0.01} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='payroll_cutoff_id'
          label='Pay / Deduct on Cut-off'
          rules={[{ required: true, message: 'Select the cut-off' }]}
          extra={!options.next_cutoff_id ? 'No cut-off ahead — generate this year\'s cut-offs (Time & Leave → Setup → Payroll Cut-offs).' : null}
        >
          <Select options={cutoffChoices} placeholder='Select' showSearch={{ optionFilterProp: 'label' }} />
        </Form.Item>
        <Form.Item name='computation' label='Computation'>
          <Input.TextArea rows={4} maxLength={5000} placeholder='How the amount was computed' />
        </Form.Item>
        <Form.Item name='reason' label='Reason / Reference'>
          <Input.TextArea rows={2} maxLength={1000} placeholder='e.g. memo no.' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RetroFormModal;
