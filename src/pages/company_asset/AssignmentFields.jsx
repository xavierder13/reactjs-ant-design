import { Form, Input, Select, Radio, Row, Col } from 'antd';
import AssetEmployeeSelect from './AssetEmployeeSelect';

// The assignment part of a form (Assign / Add Asset): an employee (branch and
// department come from the employee) or an area (location, optional branch
// / department). `allowNone`: Add Asset may leave it unassigned.
const AssignmentFields = ({ form, options, allowNone = false }) => {
  const type = Form.useWatch('assignment_type', form);

  return (
    <>
      <Form.Item name='assignment_type' label='Assign To' rules={allowNone ? [] : [{ required: true, message: 'Choose employee or area' }]}>
        <Radio.Group
          options={[
            ...(allowNone ? [{ value: '', label: 'Not assigned' }] : []),
            { value: 'Employee', label: 'Employee' },
            { value: 'Area', label: 'Area / location' },
          ]}
        />
      </Form.Item>
      {type === 'Employee' && (
        <Form.Item name='employee_id' label='Employee' extra='Branch and department are taken from the employee.' rules={[{ required: true, message: 'Employee is required' }]}>
          <AssetEmployeeSelect />
        </Form.Item>
      )}
      {type === 'Area' && (
        <>
          <Form.Item name='location' label='Location' rules={[{ required: true, whitespace: true, message: 'Location is required' }]}>
            <Input maxLength={255} placeholder='e.g. Stock room, 2nd floor' />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name='branch_id' label='Branch'>
                <Select allowClear showSearch={{ optionFilterProp: 'label' }} options={options.branches.map((b) => ({ value: b.id, label: b.name }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='department_id' label='Department'>
                <Select allowClear showSearch={{ optionFilterProp: 'label' }} options={options.departments.map((d) => ({ value: d.id, label: d.name }))} />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};

export default AssignmentFields;
