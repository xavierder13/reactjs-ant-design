import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Row, Col, Typography, App } from 'antd';
import deductionApi from '../../../services/payroll/deductionApi';
import EmployeeSelect from '../../manpower_request/request/EmployeeSelect';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT } from '../../../utils/formatDate';
import { applyFormErrors, cutoffOptions, pesoInputProps, toNumber } from '../payrollHelpers';

// Add or edit a scheduled deduction: total amount, amount per cut-off, the
// first cut-off and which cut-offs of the month — or One-time (the whole
// total on the start cut-off). `deduction` = edit (the employee can't
// change); balance and status are handled on its details.
const DeductionFormModal = ({ open, deduction, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const total = Form.useWatch('total_amount', form);
  const perCutoff = Form.useWatch('amount_per_cutoff', form);
  const oneTime = Form.useWatch('schedule', form) === 'One-time';
  const typeId = Form.useWatch('deduction_type_id', form);
  const needsDescription = !!(options.types || []).find((t) => t.id === typeId)?.needs_description;

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (deduction) {
      form.setFieldsValue({
        deduction_type_id: deduction.deduction_type_id,
        reference_no: deduction.reference_no,
        description: deduction.description,
        date_granted: deduction.date_granted ? dayjs(deduction.date_granted) : null,
        total_amount: toNumber(deduction.total_amount),
        amount_per_cutoff: toNumber(deduction.amount_per_cutoff),
        start_cutoff_id: deduction.start_cutoff_id,
        schedule: deduction.schedule,
        remarks: deduction.remarks,
      });
    } else {
      const next = (options.cutoffs || []).find((c) => c.date_to >= dayjs().format('YYYY-MM-DD'));
      form.setFieldsValue({ schedule: 'Every cut-off', start_cutoff_id: next?.id });
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      deduction_type_id: values.deduction_type_id,
      reference_no: values.reference_no?.trim() || null,
      description: needsDescription ? values.description?.trim() || null : null,
      date_granted: values.date_granted ? values.date_granted.format('YYYY-MM-DD') : null,
      total_amount: values.total_amount,
      amount_per_cutoff: oneTime ? values.total_amount : values.amount_per_cutoff,
      start_cutoff_id: values.start_cutoff_id,
      schedule: values.schedule,
      remarks: values.remarks?.trim() || null,
    };
    setSaving(true);
    try {
      const { data } = deduction
        ? await deductionApi.update(deduction.id, payload)
        : await deductionApi.create({ ...payload, employee_id: values.employee_id });
      message.success(data.message);
      onSaved(data.deduction);
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  // active types, plus the deduction's own type when it was deactivated
  const typeOptions = (options.types || [])
    .filter((t) => t.active || t.id === deduction?.deduction_type_id)
    .map((t) => ({ value: t.id, label: `${t.name}${t.active ? '' : ' (inactive)'}`, category: t.category }));
  const installments = !oneTime && total > 0 && perCutoff > 0 ? Math.ceil(total / perCutoff) : null;

  return (
    <Modal
      keyboard={false}
      open={open}
      title={deduction ? 'Edit Deduction' : 'Add Deduction'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', md: 680 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        {deduction ? (
          <Form.Item label='Employee'>
            <Input readOnly value={`${deduction.employee?.employee_code} - ${deduction.employee?.full_name}`} />
          </Form.Item>
        ) : (
          <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Select an employee' }]}>
            <EmployeeSelect placeholder='Search employee' activeOnly />
          </Form.Item>
        )}
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name='deduction_type_id' label='Deduction Type' rules={[{ required: true, message: 'Select the type' }]}>
              <Select options={typeOptions} placeholder='Select' showSearch={{ optionFilterProp: 'label' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name='reference_no' label='Reference No.' extra='Loan / voucher no. — unique per type'>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
        {needsDescription && (
          <Form.Item
            name='description'
            label='Description'
            rules={[{ required: true, whitespace: true, message: 'Say what this deduction is for' }]}
            extra='Shown on the payslip after the type.'
          >
            <Input maxLength={150} placeholder='e.g. Damaged company phone' />
          </Form.Item>
        )}
        <Row gutter={12}>
          <Col xs={24} sm={8}>
            <Form.Item name='date_granted' label='Date Granted'>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item name='total_amount' label='Total Amount' rules={[{ required: true, message: 'Total amount is required' }]}>
              <InputNumber {...pesoInputProps} min={0.01} />
            </Form.Item>
          </Col>
          {!oneTime && (
          <Col xs={12} sm={8}>
            <Form.Item
              name='amount_per_cutoff'
              label='Amount per Cut-off'
              dependencies={['total_amount']}
              rules={[
                { required: true, message: 'Amount per cut-off is required' },
                ({ getFieldValue }) => ({
                  validator: (_, v) => (v && getFieldValue('total_amount') && v > getFieldValue('total_amount')
                    ? Promise.reject(new Error('More than the total amount'))
                    : Promise.resolve()),
                }),
              ]}
            >
              <InputNumber {...pesoInputProps} min={0.01} />
            </Form.Item>
          </Col>
          )}
        </Row>
        {oneTime && (
          <Typography.Paragraph type='secondary' style={{ marginTop: -8 }}>
            The whole amount is deducted on the start cut-off (or the next one, if it isn't taken there).
          </Typography.Paragraph>
        )}
        {installments && (
          <Typography.Paragraph type='secondary' style={{ marginTop: -8 }}>
            About {installments} deduction{installments === 1 ? '' : 's'} to pay it off.
          </Typography.Paragraph>
        )}
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name='start_cutoff_id' label='Start Cut-off' rules={[{ required: true, message: 'Select the first cut-off' }]}>
              <Select options={cutoffOptions(options.cutoffs)} placeholder='Select' showSearch={{ optionFilterProp: 'label' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name='schedule' label='Deduct On' rules={[{ required: true, message: 'Select the schedule' }]}>
              <Select options={(options.schedules || []).map((s) => ({ value: s, label: s }))} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='remarks' label='Remarks'>
          <Input.TextArea rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DeductionFormModal;
