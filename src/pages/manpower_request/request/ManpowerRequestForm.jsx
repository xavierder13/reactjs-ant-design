import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, InputNumber, Button, Card,
  Space, Divider, Row, Col, message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useManpowerRequestStore from '../../../store/manpowerRequestStore';
import manpowerRequestApi from '../../../services/manpower_request/manpowerRequestApi';
import handleApiError from '../../../utils/handleApiError';
import EmployeeSelect from './EmployeeSelect';

const PRIORITY_OPTIONS = [
  { label: 'Low',    value: 'Low' },
  { label: 'Normal', value: 'Normal' },
  { label: 'High',   value: 'High' },
  { label: 'Urgent', value: 'Urgent' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'Regular',      value: 'Regular' },
  { label: 'Probationary', value: 'Probationary' },
  { label: 'Contractual',  value: 'Contractual' },
];

// mode: 'create' | 'edit'
const ManpowerRequestForm = ({ mode = 'create', initialData = null }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const branches   = useManpowerRequestStore((state) => state.branches);
  const positions  = useManpowerRequestStore((state) => state.positions);
  const fetchFormData = useManpowerRequestStore((state) => state.fetchFormData);

  useEffect(() => { fetchFormData(); }, []);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.setFieldsValue({
        branch_id:           initialData.branch_id,
        request_date:        initialData.request_date ? dayjs(initialData.request_date) : null,
        reason:              initialData.reason,
        target_hiring_date:  initialData.target_hiring_date ? dayjs(initialData.target_hiring_date) : null,
        priority:            initialData.priority,
        details: (initialData.details || []).map((d) => ({
          id:                          d.id,
          position_id:                 d.position_id,
          employment_type:             d.employment_type,
          quantity:                    d.quantity,
          replacement_or_additional:   d.replacement_or_additional,
          replacement_employee_id:     d.replacement_employee_id,
          qualifications:              d.qualifications,
          experience:                  d.experience,
          education:                   d.education,
          salary_grade:                d.salary_grade,
        })),
      });
    }
  }, [mode, initialData, form]);

  const positionOptions = positions.map((p) => ({ label: p.name, value: p.id }));
  const branchOptions   = branches.map((b) => ({ label: b.name, value: b.id }));

  const buildPayload = (values) => ({
    branch_id:            values.branch_id,
    request_date:         values.request_date ? values.request_date.format('YYYY-MM-DD') : null,
    reason:                values.reason,
    target_hiring_date:   values.target_hiring_date ? values.target_hiring_date.format('YYYY-MM-DD') : null,
    priority:              values.priority,
    details:               values.details,
  });

  const handleFinish = async (values) => {
    const payload = buildPayload(values);

    try {
      if (mode === 'create') {
        const { data } = await manpowerRequestApi.create(payload);
        messageApi.success(data.message);
        navigate(`/manpower-requests/${data.manpower_request.id}`);
      } else {
        const { data } = await manpowerRequestApi.update(initialData.id, payload);
        messageApi.success(data.message);
        navigate(`/manpower-requests/${initialData.id}`);
      }
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  return (
    <div>
      {contextHolder}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Card title="Request Details" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Branch"
                name="branch_id"
                rules={[{ required: true, message: 'Branch is required' }]}
              >
                <Select placeholder="Select branch" options={branchOptions} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Request Date" name="request_date">
                <DatePicker style={{ width: '100%' }} format="MM-DD-YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Priority" name="priority">
                <Select placeholder="Select priority" options={PRIORITY_OPTIONS} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Target Hiring Date" name="target_hiring_date">
                <DatePicker style={{ width: '100%' }} format="MM-DD-YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Reason / Justification"
            name="reason"
            rules={[{ required: true, message: 'Reason is required' }]}
          >
            <Input.TextArea rows={3} placeholder="Explain why this manpower is needed" />
          </Form.Item>
        </Card>

        <Card title="Position Requirements">
          <Form.List
            name="details"
            initialValue={[{}]}
            rules={[{
              validator: async (_, details) => {
                if (!details || details.length < 1) {
                  return Promise.reject(new Error('At least one position is required'));
                }
              },
            }]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 16, background: '#fafafa' }}
                    extra={fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(field.name)} style={{ color: '#ff4d4f' }} />
                    )}
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          label="Position"
                          name={[field.name, 'position_id']}
                          rules={[{ required: true, message: 'Position is required' }]}
                        >
                          <Select placeholder="Select position" options={positionOptions} showSearch optionFilterProp="label" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          label="Employment Type"
                          name={[field.name, 'employment_type']}
                        >
                          <Select placeholder="Select type" options={EMPLOYMENT_TYPE_OPTIONS} allowClear />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          label="Quantity"
                          name={[field.name, 'quantity']}
                          rules={[{ required: true, message: 'Quantity is required' }]}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...field}
                          label="Replacement / Additional"
                          name={[field.name, 'replacement_or_additional']}
                        >
                          <Select
                            placeholder="Select"
                            allowClear
                            options={[
                              { label: 'Replacement', value: 'Replacement' },
                              { label: 'Additional',  value: 'Additional' },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) =>
                            prev.details?.[field.name]?.replacement_or_additional !==
                            curr.details?.[field.name]?.replacement_or_additional
                          }
                        >
                          {({ getFieldValue }) =>
                            getFieldValue(['details', field.name, 'replacement_or_additional']) === 'Replacement' && (
                              <Form.Item
                                {...field}
                                label="Replacement Employee"
                                name={[field.name, 'replacement_employee_id']}
                                rules={[{ required: true, message: 'Select the employee being replaced' }]}
                              >
                                {/* TODO: wire to an employee search/select once the Employee master data endpoint is confirmed */}
                                <EmployeeSelect placeholder="Search employee to replace" />
                              </Form.Item>
                            )
                          }
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...field} label="Salary Grade" name={[field.name, 'salary_grade']}>
                          <Input placeholder="e.g. SG-5" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...field} label="Qualifications" name={[field.name, 'qualifications']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...field} label="Experience" name={[field.name, 'experience']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...field} label="Education" name={[field.name, 'education']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}

                <Form.Item>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                    Add Another Position
                  </Button>
                </Form.Item>

                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>
        </Card>

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit">
            {mode === 'create' ? 'Save as Draft' : 'Save Changes'}
          </Button>
          <Button onClick={() => navigate('/manpower-requests')}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
};

export default ManpowerRequestForm;