import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Space, Divider, App } from 'antd';
import dayjs from 'dayjs';
import employeeApi from '../../../services/employee/employeeApi';
import handleApiError from '../../../utils/handleApiError';
import EmployeeTabs from './EmployeeTabs';

// mode: 'create' | 'edit' | 'view'. Mirrors ManpowerRequestForm.jsx's
// shape (single Form instance, buildPayload, Save/Cancel). initialData is
// the employee record for edit/view, passed down from CreateEmployee.jsx /
// EditEmployee.jsx / ViewEmployee.jsx (router state — see those files for
// why there's no fetch-by-id here).
const EmployeeForm = ({ mode = 'create', initialData = null }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message: messageApi } = App.useApp();
  const [saving, setSaving] = useState(false);
  const readOnly = mode === 'view';

  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && initialData) {
      form.setFieldsValue({
        employee_code:     initialData.employee_code,
        last_name:         initialData.last_name,
        first_name:        initialData.first_name,
        middle_name:       initialData.middle_name,
        birth_date:        initialData.birth_date ? dayjs(initialData.birth_date) : (initialData.dob ? dayjs(initialData.dob) : null),
        gender:            initialData.gender,
        civil_status:      initialData.civil_status,
        contact:           initialData.contact,
        email:             initialData.email,
        address:           initialData.address,
        tin_no:            initialData.tin_no,
        pagibig_no:        initialData.pagibig_no,
        philhealth_no:     initialData.philhealth_no,
        sss_no:            initialData.sss_no,
        educ_attain:       initialData.educ_attain,
        school_year:       initialData.school_year,
        school_attended:   initialData.school_attended,
        course:            initialData.course,
        job_title_code:    initialData.job_title_code,
        position_id:       initialData.position_id,
        department_id:     initialData.department_id,
        branch_id:         initialData.branch_id,
        employment_type:   initialData.employment_type,
        date_employed:     initialData.date_employed ? dayjs(initialData.date_employed) : null,
        date_resigned:     initialData.date_resigned ? dayjs(initialData.date_resigned) : null,
        regularization_date: initialData.regularization_date ? dayjs(initialData.regularization_date) : null,
        application_source: initialData.application_source,
        active:             Boolean(initialData.active),
      });
    }
  }, [mode, initialData, form]);

  const buildPayload = (values) => ({
    employee_code:      values.employee_code,
    last_name:           values.last_name,
    first_name:          values.first_name,
    middle_name:         values.middle_name,
    birth_date:          values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
    gender:              values.gender,
    civil_status:        values.civil_status,
    contact:             values.contact,
    email:               values.email,
    address:             values.address,
    tin_no:              values.tin_no,
    pagibig_no:          values.pagibig_no,
    philhealth_no:       values.philhealth_no,
    sss_no:              values.sss_no,
    educ_attain:         values.educ_attain,
    school_year:         values.school_year,
    school_attended:     values.school_attended,
    course:              values.course,
    job_title_code:      values.job_title_code,
    position_id:         values.position_id,
    department_id:       values.department_id,
    branch_id:           values.branch_id,
    employment_type:     values.employment_type,
    date_employed:       values.date_employed ? values.date_employed.format('YYYY-MM-DD') : null,
    date_resigned:       values.date_resigned ? values.date_resigned.format('YYYY-MM-DD') : null,
    regularization_date: values.regularization_date ? values.regularization_date.format('YYYY-MM-DD') : null,
    application_source:  values.application_source,
    active:              Boolean(values.active),
  });

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = buildPayload(values);
      if (mode === 'create') {
        const { data } = await employeeApi.create(payload);
        // Resource key on the response ("employee"? "employee_master_data"?
        // per this backend's {success, message, <resource_key>} envelope
        // convention) is not confirmed against the live controller — fall
        // back to the submitted payload plus whatever id-bearing shape
        // comes back, rather than crashing on an unconfirmed field name.
        const saved = data.employee || data.employee_master_data || { ...payload, id: data.id };
        messageApi.success(data.message || 'Employee created.');
        navigate(`/employees/${saved.id}`, { state: { employee: saved } });
      } else {
        const { data } = await employeeApi.update(initialData.id, payload);
        // Same unconfirmed-resource-key caveat as create (above). The
        // fallback here additionally drops any nested relation object
        // (position/department/branch, used for the read-only Rank/
        // Division/Company display) whose FK actually changed in this
        // save — keeping `initialData`'s stale nested object would show
        // the employee's OLD rank/division/company on the page shown
        // immediately after the save. Real bug found and fixed 2026-09-15.
        const saved = data.employee || data.employee_master_data || {
          ...initialData,
          ...payload,
          position: payload.position_id === initialData.position_id ? initialData.position : undefined,
          department: payload.department_id === initialData.department_id ? initialData.department : undefined,
          branch: payload.branch_id === initialData.branch_id ? initialData.branch : undefined,
        };
        messageApi.success(data.message || 'Employee updated.');
        navigate(`/employees/${initialData.id}`, { state: { employee: saved } });
      }
    } catch (error) {
      if (!error.errorFields) handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={mode === 'create' ? 'Add Employee' : mode === 'edit' ? 'Edit Employee' : 'View Employee'}
    >
      <Form form={form} layout="vertical" disabled={readOnly}>
        <EmployeeTabs mode={mode} initialData={initialData} />

        <Divider />

        <Space>
          {!readOnly && (
            <Button type="primary" onClick={handleSave} loading={saving}>
              Save
            </Button>
          )}
          <Button onClick={() => navigate('/employees')} disabled={saving}>
            {readOnly ? 'Back to List' : 'Cancel'}
          </Button>
        </Space>
      </Form>
    </Card>
  );
};

export default EmployeeForm;
