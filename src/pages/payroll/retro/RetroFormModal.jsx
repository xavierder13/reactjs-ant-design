import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Radio, Row, Col, Alert, Switch, Typography, App } from 'antd';
import retroApi from '../../../services/payroll/retroApi';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors, cutoffOptions, pesoInputProps, toNumber } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';

// Add or edit a retro adjustment: type, earning / deduction, the period it
// covers, the amount and the cut-off that pays / recovers it. An Other
// Adjustment says what it is for (options.other_types): that fixes earning /
// deduction for most, and whether the payroll taxes it — from the type, the
// allowance picked, or the Taxable switch for Others (specify). `suggestion`
// prefills a new one from a back-dated salary change (its computation is
// kept with it); `retro` = edit (Open only).
const RetroFormModal = ({ open, retro, suggestion, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const retroType = Form.useWatch('retro_type', form);
  const otherTypeName = Form.useWatch('other_type', form);
  const allowanceTypeId = Form.useWatch('allowance_type_id', form);
  const isOther = retroType === 'Other Adjustment';
  const otherType = isOther ? (options.other_types || []).find((t) => t.name === otherTypeName) : null;
  const fixedAdjustment = isOther ? otherType?.adjustment : (retroType ? options.types?.[retroType] : null);
  const allowanceType = (options.allowance_types || []).find((t) => t.id === allowanceTypeId);
  const today = dayjs().format('YYYY-MM-DD');

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    const source = retro || suggestion;
    if (source) {
      form.setFieldsValue({
        retro_type: source.retro_type,
        other_type: retro?.other_type || undefined,
        allowance_type_id: retro?.allowance_type_id || undefined,
        other_specify: retro?.other_specify || null,
        taxable: retro ? !!retro.taxable : true,
        adjustment: source.adjustment,
        period: [dayjs(source.period_from), dayjs(source.period_to)],
        amount: toNumber(source.amount),
        payroll_cutoff_id: retro ? retro.payroll_cutoff_id : options.next_cutoff_id,
        computation: source.computation,
        reason: retro?.reason || null,
      });
    } else {
      form.setFieldsValue({ retro_type: 'Retro Salary', adjustment: 'Earning', taxable: true, payroll_cutoff_id: options.next_cutoff_id });
    }
  };

  const onTypeChange = (type) => {
    const only = options.types?.[type];
    if (only) form.setFieldsValue({ adjustment: only });
  };

  const onOtherTypeChange = (name) => {
    const only = (options.other_types || []).find((t) => t.name === name)?.adjustment;
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
      other_type: isOther ? values.other_type : null,
      allowance_type_id: isOther && otherType?.taxable === 'allowance' ? values.allowance_type_id : null,
      other_specify: isOther && values.other_type === 'Others (specify)' ? values.other_specify?.trim() || null : null,
      taxable: isOther && values.other_type === 'Others (specify)' ? !!values.taxable : null,
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
        {isOther && (
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name='other_type' label='Adjustment For' rules={[{ required: true, message: 'Pick what the adjustment is for' }]}>
                <Select
                  placeholder='Select'
                  options={(options.other_types || []).map((t) => ({ value: t.name, label: t.name }))}
                  onChange={onOtherTypeChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              {otherType?.taxable === 'allowance' && (
                <Form.Item name='allowance_type_id' label='Allowance' rules={[{ required: true, message: 'Pick the allowance' }]}>
                  <Select
                    placeholder='Select'
                    showSearch={{ optionFilterProp: 'label' }}
                    options={(options.allowance_types || [])
                      .filter((t) => t.active || t.id === retro?.allowance_type_id)
                      .map((t) => ({ value: t.id, label: t.name }))}
                  />
                </Form.Item>
              )}
              {otherTypeName === 'Others (specify)' && (
                <Form.Item name='other_specify' label='Specify' rules={[{ required: true, whitespace: true, message: 'Say what the adjustment is for' }]}>
                  <Input maxLength={150} placeholder='e.g. Sales incentive correction' />
                </Form.Item>
              )}
            </Col>
            <Col xs={24}>
              {otherTypeName === 'Others (specify)' ? (
                <Form.Item name='taxable' label='Taxable' valuePropName='checked' extra="Off only when the law exempts it (e.g. a refund of the employee's own money).">
                  <Switch checkedChildren='Taxable' unCheckedChildren='Non-taxable' />
                </Form.Item>
              ) : otherType && (
                <Typography.Paragraph type='secondary' style={{ marginTop: -8 }}>
                  {otherType.taxable === 'allowance'
                    ? (allowanceType ? `${allowanceType.taxable && !allowanceType.de_minimis ? 'Taxable' : 'Non-taxable'} — follows ${allowanceType.name}.` : 'Taxable or not follows the allowance picked.')
                    : (otherType.taxable ? 'Taxable.' : 'Non-taxable.')}
                </Typography.Paragraph>
              )}
            </Col>
          </Row>
        )}
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
