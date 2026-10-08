import { useState } from 'react';
import { Modal, Form, Input, Select, App } from 'antd';
import hiringOfficerApi from '../../../../services/recruitment/hiringOfficerApi';
import handleApiError from '../../../../utils/handleApiError';

// Create/edit a hiring officer: pick the employee (Employee Master Data —
// only active ADMINISTRATION employees in a Managerial-rank position, from
// the module's own `create` endpoint); Position is the employee's, read-only.
// `hiringOfficer` = null for create, else the list row. Employees already
// an officer are listed but disabled. Validation failures are HTTP 422
// bags → inline on the field.
const HiringOfficerFormModal = ({ open, hiringOfficer, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [rule, setRule] = useState({ branch: null, rank: null });

  const loadOptions = async () => {
    setEmployees([]); // never offer the previous open's list (taken flags)
    setLoadingOptions(true);
    try {
      const { data } = await hiringOfficerApi.getCreate();
      setEmployees(data.employees);
      setRule({ branch: data.branch, rank: data.rank });
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (hiringOfficer) {
      form.setFieldsValue({ employee_id: hiringOfficer.employee_id, position: hiringOfficer.employee?.position?.name });
    }
    loadOptions();
  };

  const handleValuesChange = (changed) => {
    if ('employee_id' in changed) {
      form.setFieldsValue({ position: employees.find((e) => e.id === changed.employee_id)?.position || null });
    }
  };

  // The saved employee stays labelled while the list loads, and after it if
  // they no longer qualify (left, transferred) until another is picked.
  const options = [
    ...employees.map((e) => ({
      value: e.id,
      label: `${e.employee_code} — ${e.last_name}, ${e.first_name}`,
      disabled: !!e.hiring_officer_id && e.hiring_officer_id !== hiringOfficer?.id,
    })),
    ...(hiringOfficer?.employee && !employees.some((e) => e.id === hiringOfficer.employee_id) ? [{
      value: hiringOfficer.employee_id,
      label: `${hiringOfficer.employee.employee_code} — ${hiringOfficer.employee.full_name}${loadingOptions ? '' : ' (no longer eligible)'}`,
    }] : []),
  ];

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    setSaving(true);
    try {
      const payload = { employee_id: values.employee_id };
      const { data } = hiringOfficer
        ? await hiringOfficerApi.update(hiringOfficer.id, payload)
        : await hiringOfficerApi.create(payload);
      message.success(data.message || 'Hiring officer has been saved.');
      onSaved();
    } catch (error) {
      const bag = error.response?.status === 422 && !error.response.data?.message ? error.response.data : null;
      if (bag) form.setFields(Object.entries(bag).map(([name, errors]) => ({ name, errors: [].concat(errors) })));
      else handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={hiringOfficer ? 'Edit Hiring Officer' : 'Create Hiring Officer'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
    >
      <Form form={form} layout='vertical' onValuesChange={handleValuesChange}>
        <Form.Item
          name='employee_id'
          label='Hiring Officer Name'
          extra={rule.branch && `Active ${rule.branch} employees in a ${rule.rank} position.`}
          rules={[{ required: true, message: 'Employee is required' }]}
        >
          <Select
            options={options}
            loading={loadingOptions}
            showSearch={{ optionFilterProp: 'label' }}
            placeholder='Search employee code or name'
          />
        </Form.Item>
        <Form.Item name='position' label='Hiring Officer Position'>
          <Input readOnly placeholder='Based on the employee' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default HiringOfficerFormModal;
