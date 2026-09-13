import { useEffect, useState } from 'react';
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

// Must match ManpowerRequestController::REPLACEMENT_REASONS exactly.
const REPLACEMENT_REASON_OPTIONS = [
  { label: 'Resignation',       value: 'Resignation' },
  { label: 'Transferred',       value: 'Transferred' },
  { label: 'Promoted',          value: 'Promoted' },
  { label: 'Demoted',           value: 'Demoted' },
  { label: 'AWOL',              value: 'AWOL' },
  { label: 'Terminated',        value: 'Terminated' },
  { label: 'End of Probation',  value: 'End of Probation' },
  { label: 'Retirement',        value: 'Retirement' },
  { label: 'Death',             value: 'Death' },
  { label: 'Others',            value: 'Others' },
];

const GENDER_OPTIONS = [
  { label: 'Male',              value: 'Male' },
  { label: 'Female',             value: 'Female' },
  { label: 'Without Preference', value: 'Without Preference' },
];

const PRC_LICENSE_STATUS_OPTIONS = [
  { label: 'Required',       value: 'Required' },
  { label: 'Not Required',   value: 'Not Required' },
  { label: 'Not Applicable', value: 'Not Applicable' },
];

const DRIVERS_LICENSE_STATUS_OPTIONS = [
  { label: 'Professional',     value: 'Professional' },
  { label: 'Non-Professional', value: 'Non-Professional' },
  { label: 'Not Required',     value: 'Not Required' },
];

// Must match ManpowerRequestController::DRIVERS_LICENSE_CODES exactly.
const DRIVERS_LICENSE_CODE_OPTIONS = ['A', 'A1', 'B', 'B1', 'B2', 'BE', 'C', 'CE', 'D']
  .map((code) => ({ label: code, value: code }));

// mode: 'create' | 'edit'
const ManpowerRequestForm = ({ mode = 'create', initialData = null }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  // 'draft' | 'submit' | false — which action is in flight, so the two
  // buttons can show their own loading state and disable each other
  const [saving, setSaving] = useState(false);

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
          replacement_reason:          d.replacement_reason,
          replacement_reason_other:    d.replacement_reason_other,
          last_working_day:           d.last_working_day ? dayjs(d.last_working_day) : null,
          qualifications:              d.qualifications,
          experience:                  d.experience,
          education:                   d.education,
          salary_grade:                d.salary_grade,
          gender:                      d.gender,
          age_min:                     d.age_min,
          age_max:                     d.age_max,
          experience_required:         d.experience_required,
          experience_years:            d.experience_years,
          prc_license_status:          d.prc_license_status,
          prc_license_type:            d.prc_license_type,
          drivers_license_status:      d.drivers_license_status,
          drivers_license_code:        d.drivers_license_code,
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
    details:               (values.details || []).map((d) => ({
      ...d,
      last_working_day: d.last_working_day ? d.last_working_day.format('YYYY-MM-DD') : null,
    })),
  });

  // Resubmit and Submit share the same backend action — only the label
  // differs, same convention as the Index/View pages.
  const isResubmit = mode === 'edit' && ['Disapproved', 'Cancelled', 'Returned'].includes(initialData?.status);

  const saveRequest = async (values) => {
    const payload = buildPayload(values);
    if (mode === 'create') {
      const { data } = await manpowerRequestApi.create(payload);
      return { id: data.manpower_request.id, message: data.message };
    }
    const { data } = await manpowerRequestApi.update(initialData.id, payload);
    return { id: initialData.id, message: data.message };
  };

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields();
      setSaving('draft');
      const { id, message: savedMessage } = await saveRequest(values);
      messageApi.success(savedMessage);
      navigate(`/manpower-requests/${id}`);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving('submit');
      const { id } = await saveRequest(values);

      // the save already succeeded at this point — a failure here means
      // it's sitting as a Draft, not lost, so this gets its own message
      // rather than falling into the generic error handler below
      try {
        const { data } = await manpowerRequestApi.submit(id);
        messageApi.success(data.message);
      } catch (submitError) {
        messageApi.warning('Saved, but could not submit for approval automatically — you can submit it from the request page.');
      }

      navigate(`/manpower-requests/${id}`);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {contextHolder}

      <Form form={form} layout="vertical">
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
                {fields.map(({ key, name, ...restField }) => (
                  <Card
                    key={key}
                    size="small"
                    style={{ marginBottom: 16, background: '#fafafa' }}
                    extra={fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                    )}
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Position"
                          name={[name, 'position_id']}
                          rules={[{ required: true, message: 'Position is required' }]}
                        >
                          <Select placeholder="Select position" options={positionOptions} showSearch optionFilterProp="label" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Employment Type"
                          name={[name, 'employment_type']}
                        >
                          <Select placeholder="Select type" options={EMPLOYMENT_TYPE_OPTIONS} allowClear />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Quantity"
                          name={[name, 'quantity']}
                          rules={[{ required: true, message: 'Quantity is required' }]}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Replacement / Additional"
                          name={[name, 'replacement_or_additional']}
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
                            prev.details?.[name]?.replacement_or_additional !==
                            curr.details?.[name]?.replacement_or_additional
                          }
                        >
                          {({ getFieldValue }) =>
                            getFieldValue(['details', name, 'replacement_or_additional']) === 'Replacement' && (
                              <Form.Item
                                {...restField}
                                label="Replacement Employee"
                                name={[name, 'replacement_employee_id']}
                                rules={[{ required: true, message: 'Select the employee being replaced' }]}
                              >
                                <EmployeeSelect placeholder="Search employee to replace" />
                              </Form.Item>
                            )
                          }
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...restField} label="Salary Grade" name={[name, 'salary_grade']}>
                          <Input placeholder="e.g. SG-5" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) =>
                        prev.details?.[name]?.replacement_or_additional !==
                        curr.details?.[name]?.replacement_or_additional
                      }
                    >
                      {({ getFieldValue }) =>
                        getFieldValue(['details', name, 'replacement_or_additional']) === 'Replacement' && (
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item
                                {...restField}
                                label="Reason for Replacement"
                                name={[name, 'replacement_reason']}
                                rules={[{ required: true, message: 'Reason for replacement is required' }]}
                              >
                                <Select placeholder="Select reason" options={REPLACEMENT_REASON_OPTIONS} allowClear />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                noStyle
                                shouldUpdate={(prev, curr) =>
                                  prev.details?.[name]?.replacement_reason !==
                                  curr.details?.[name]?.replacement_reason
                                }
                              >
                                {({ getFieldValue: getFieldValue2 }) =>
                                  getFieldValue2(['details', name, 'replacement_reason']) === 'Others' && (
                                    <Form.Item
                                      {...restField}
                                      label="Please Specify"
                                      name={[name, 'replacement_reason_other']}
                                      rules={[{ required: true, message: 'Please specify the reason' }]}
                                    >
                                      <Input.TextArea rows={1} placeholder="Specify the reason for replacement" />
                                    </Form.Item>
                                  )
                                }
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item
                                {...restField}
                                label="Last Working Day"
                                name={[name, 'last_working_day']}
                              >
                                <DatePicker style={{ width: '100%' }} format="MM-DD-YYYY" />
                              </Form.Item>
                            </Col>
                          </Row>
                        )
                      }
                    </Form.Item>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...restField} label="Qualifications" name={[name, 'qualifications']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...restField} label="Experience" name={[name, 'experience']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...restField} label="Education" name={[name, 'education']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider titlePlacement="left" plain style={{ margin: '8px 0' }}>Job Specifications</Divider>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...restField} label="Gender" name={[name, 'gender']}>
                          <Select placeholder="Select" options={GENDER_OPTIONS} allowClear />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...restField} label="Age Range (Min)" name={[name, 'age_min']}>
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="Min age" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Age Range (Max)"
                          name={[name, 'age_max']}
                          dependencies={[['details', name, 'age_min']]}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const min = getFieldValue(['details', name, 'age_min']);
                                if (value == null || min == null || value >= min) return Promise.resolve();
                                return Promise.reject(new Error('Max age must be ≥ min age'));
                              },
                            }),
                          ]}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="Max age" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...restField} label="Relevant Work Experience Required" name={[name, 'experience_required']}>
                          <Select
                            placeholder="Select"
                            allowClear
                            options={[{ label: 'Required', value: true }, { label: 'Not Required', value: false }]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) =>
                            prev.details?.[name]?.experience_required !== curr.details?.[name]?.experience_required
                          }
                        >
                          {({ getFieldValue }) =>
                            getFieldValue(['details', name, 'experience_required']) === true && (
                              <Form.Item
                                {...restField}
                                label="No. of Years"
                                name={[name, 'experience_years']}
                                rules={[{ required: true, message: 'No. of years is required' }]}
                              >
                                <InputNumber min={0} style={{ width: '100%' }} />
                              </Form.Item>
                            )
                          }
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...restField} label="PRC License" name={[name, 'prc_license_status']}>
                          <Select placeholder="Select" options={PRC_LICENSE_STATUS_OPTIONS} allowClear />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) =>
                            prev.details?.[name]?.prc_license_status !== curr.details?.[name]?.prc_license_status
                          }
                        >
                          {({ getFieldValue }) =>
                            getFieldValue(['details', name, 'prc_license_status']) === 'Required' && (
                              <Form.Item
                                {...restField}
                                label="Specify PRC License Type"
                                name={[name, 'prc_license_type']}
                                rules={[{ required: true, message: 'Please specify the PRC license type' }]}
                              >
                                <Input placeholder="e.g. Certified Public Accountant" />
                              </Form.Item>
                            )
                          }
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item {...restField} label="Driver's License" name={[name, 'drivers_license_status']}>
                          <Select placeholder="Select" options={DRIVERS_LICENSE_STATUS_OPTIONS} allowClear />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) =>
                            prev.details?.[name]?.drivers_license_status !== curr.details?.[name]?.drivers_license_status
                          }
                        >
                          {({ getFieldValue }) => {
                            const status = getFieldValue(['details', name, 'drivers_license_status']);
                            return (status === 'Professional' || status === 'Non-Professional') && (
                              <Form.Item
                                {...restField}
                                label="Code"
                                name={[name, 'drivers_license_code']}
                                rules={[{ required: true, message: "Driver's license code is required" }]}
                              >
                                <Select placeholder="Select code" options={DRIVERS_LICENSE_CODE_OPTIONS} />
                              </Form.Item>
                            );
                          }}
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
          <Button
            onClick={handleSaveDraft}
            loading={saving === 'draft'}
            disabled={saving === 'submit'}
          >
            Save as Draft
          </Button>
          <Button
            type="primary"
            onClick={handleSaveAndSubmit}
            loading={saving === 'submit'}
            disabled={saving === 'draft'}
          >
            {isResubmit ? 'Save & Resubmit' : 'Save & Submit'}
          </Button>
          <Button onClick={() => navigate('/manpower-requests')} disabled={saving !== false}>
            Cancel
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default ManpowerRequestForm;