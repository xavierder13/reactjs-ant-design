import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, InputNumber, Button, Card,
  Space, Divider, Row, Col, Upload, Typography, message,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import useManpowerRequestStore from '../../../store/manpowerRequestStore';
import manpowerRequestApi from '../../../services/manpower_request/manpowerRequestApi';
import handleApiError from '../../../utils/handleApiError';
import useAuth from '../../../hooks/useAuth';
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

  // Newly-picked attachment per line, keyed by the Form.List item's
  // stable `key` (not `name`/index, which shifts when rows are added or
  // removed) — kept outside AntD's own Form state, same as every other
  // file-picker in this app, since a raw File object doesn't round-trip
  // cleanly through Form.Item/fileList. An existing attachment (edit
  // mode) lives in the form itself as plain file_name/file_path/file_type/
  // file_date_upload values instead — see the pre-fill effect above and
  // resolveLineFile() on the backend for why both paths exist.
  const [detailFiles, setDetailFiles] = useState({});
  // Synced from Form.List's own `fields` array on every render (see the
  // render-prop body below) — the only place `field.key` <-> array index
  // is known, needed at submit time to map `detailFiles` (keyed by
  // `field.key`) onto `details[i][file]` (keyed by index) in the outgoing
  // payload.
  const fieldKeysRef = useRef([]);

  const branches   = useManpowerRequestStore((state) => state.branches);
  const positions  = useManpowerRequestStore((state) => state.positions);
  const fetchFormData = useManpowerRequestStore((state) => state.fetchFormData);

  const { user, hasRole } = useAuth();
  // Administrator always retains full control even if also a Manpower
  // Requestor, matching the hasRole('Administrator')-bypasses pattern used
  // elsewhere for this module (see ownership checks in
  // ManpowerRequestIndex.jsx/ViewManpowerRequest.jsx).
  const isBranchLocked = hasRole('Manpower Requestor') && !hasRole('Administrator');

  useEffect(() => { fetchFormData(); }, []);

  // Requestors can only ever file for their own branch — auto-fill it on
  // create so the (disabled) field still has a value to submit.
  useEffect(() => {
    if (mode === 'create' && isBranchLocked && user?.branch_id) {
      form.setFieldsValue({ branch_id: user.branch_id });
    }
  }, [mode, isBranchLocked, user, form]);

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
          // Carried forward as plain values (not re-uploaded) so an
          // unchanged attachment survives update()'s delete-and-recreate
          // of every line on every save — see
          // ManpowerRequestService::resolveLineFile(). Cleared via
          // form.setFieldValue when the user removes an attachment in
          // this form; replaced outright when they pick a new file (the
          // backend prioritizes a fresh upload over these carried-forward
          // values regardless of what's still sitting in these fields).
          file_name:                   d.file_name,
          file_path:                   d.file_path,
          file_type:                   d.file_type,
          file_date_upload:            d.file_date_upload,
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

  // Any line with a freshly-picked (not-yet-uploaded) file at all means
  // the whole request needs to go out as multipart instead of JSON — see
  // manpowerRequestApi.js's create/update for why plain-JSON stays the
  // default otherwise.
  const hasNewFiles = () => fieldKeysRef.current.some((key) => Boolean(detailFiles[key]));

  const buildFormData = (payload) => {
    const formData = new FormData();
    const append = (key, value) => {
      if (value === null || value === undefined) return;
      formData.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
    };

    Object.entries(payload).forEach(([key, value]) => {
      if (key !== 'details') append(key, value);
    });

    payload.details.forEach((detail, i) => {
      Object.entries(detail).forEach(([key, value]) => append(`details[${i}][${key}]`, value));
      const newFile = detailFiles[fieldKeysRef.current[i]];
      if (newFile) formData.append(`details[${i}][file]`, newFile);
    });

    return formData;
  };

  // Resubmit and Submit share the same backend action — only the label
  // differs, same convention as the Index/View pages.
  const isResubmit = mode === 'edit' && ['Disapproved', 'Cancelled', 'Returned'].includes(initialData?.status);

  // Client-side mirror of ManpowerRequestService::submit()'s own check —
  // immediate feedback without a round trip, but the backend remains the
  // real enforcement (a direct API call could still skip this). Only
  // called from handleSaveAndSubmit, never handleSaveDraft — a Draft can
  // always be saved without the attachment yet, matching the
  // user-confirmed rule (only *submitting* is blocked, not saving).
  const findMissingAttachmentLines = (values) => (values.details || [])
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => ['Additional', 'New Position'].includes(d.replacement_or_additional))
    .filter(({ d, i }) => !detailFiles[fieldKeysRef.current[i]] && !d.file_name)
    .map(({ i }) => i + 1);

  const saveRequest = async (values) => {
    const payload = buildPayload(values);
    const body = hasNewFiles() ? buildFormData(payload) : payload;
    if (mode === 'create') {
      const { data } = await manpowerRequestApi.create(body);
      return { id: data.manpower_request.id, message: data.message };
    }
    const { data } = await manpowerRequestApi.update(initialData.id, body);
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

      const missingLines = findMissingAttachmentLines(values);
      if (missingLines.length) {
        messageApi.error(
          `Attach a supporting file for line ${missingLines.length > 1 ? 's' : ''} ${missingLines.join(', ')} before submitting (required for Additional/New Position).`
        );
        return;
      }

      setSaving('submit');
      const { id } = await saveRequest(values);

      // the save already succeeded at this point — a failure here means
      // it's sitting as a Draft, not lost, so this gets its own message
      // rather than falling into the generic error handler below. Surfaces
      // the backend's actual message (e.g. ManpowerRequestService::submit()'s
      // missing-attachment error) rather than a generic fallback — the
      // client-side check above should normally catch that case first,
      // but a direct API call bypassing this form, or a race with another
      // edit, could still reach it here.
      try {
        const { data } = await manpowerRequestApi.submit(id);
        messageApi.success(data.message);
      } catch (submitError) {
        messageApi.warning(
          submitError.response?.data?.message
            ? `Saved, but could not submit for approval: ${submitError.response.data.message}`
            : 'Saved, but could not submit for approval automatically — you can submit it from the request page.'
        );
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
                <Select
                  placeholder="Select branch"
                  options={branchOptions}
                  showSearch={!isBranchLocked}
                  optionFilterProp="label"
                  // Locked look without AntD's `disabled` gray-out: force the
                  // dropdown closed, drop the arrow affordance, and block
                  // pointer/keyboard interaction directly — the field stays
                  // "enabled" so its normal (non-darkened) styling applies.
                  {...(isBranchLocked ? {
                    open: false,
                    suffixIcon: null,
                    tabIndex: -1,
                    style: { pointerEvents: 'none' },
                  } : {})}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Request Date"
                name="request_date"
                rules={[{ required: true, message: 'Request date is required' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="MM-DD-YYYY"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Priority"
                name="priority"
                rules={[{ required: true, message: 'Priority is required' }]}
              >
                <Select placeholder="Select priority" options={PRIORITY_OPTIONS} allowClear />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Target Hiring Date"
                name="target_hiring_date"
                rules={[{ required: true, message: 'Target hiring date is required' }]}
              >
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
            {(fields, { add, remove }, { errors }) => {
              // Kept in sync every render — see fieldKeysRef's own comment
              // above for why saveRequest/findMissingAttachmentLines need
              // this key-to-index mapping at submit time.
              fieldKeysRef.current = fields.map((f) => f.key);

              return (
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
                          rules={[{ required: true, message: 'Employment type is required' }]}
                        >
                          <Select placeholder="Select type" options={EMPLOYMENT_TYPE_OPTIONS} allowClear />
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
                          {({ getFieldValue }) => {
                            const isReplacement =
                              getFieldValue(['details', name, 'replacement_or_additional']) === 'Replacement';
                            return (
                              <Form.Item
                                {...restField}
                                label="Quantity"
                                name={[name, 'quantity']}
                                rules={[{ required: true, message: 'Quantity is required' }]}
                              >
                                {/* A Replacement line is always for exactly the one
                                    departing employee — locked to 1, matching the
                                    Branch field's readOnly-not-disabled styling
                                    (see the branch-lock note above). */}
                                <InputNumber min={1} readOnly={isReplacement} style={{ width: '100%' }} />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Replacement / Additional / New Position"
                          name={[name, 'replacement_or_additional']}
                          rules={[{ required: true, message: 'This field is required' }]}
                        >
                          <Select
                            placeholder="Select"
                            allowClear
                            options={[
                              { label: 'Replacement',  value: 'Replacement' },
                              { label: 'Additional',   value: 'Additional' },
                              { label: 'New Position', value: 'New Position' },
                            ]}
                            onChange={(val) => {
                              // Force-reset to 1 the moment Replacement is chosen —
                              // the InputNumber above only goes readOnly, it doesn't
                              // clamp an existing higher value on its own.
                              if (val === 'Replacement') {
                                form.setFieldValue(['details', name, 'quantity'], 1);
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) =>
                            prev.details?.[name]?.replacement_or_additional !==
                              curr.details?.[name]?.replacement_or_additional ||
                            prev.details?.[name]?.position_id !== curr.details?.[name]?.position_id ||
                            prev.branch_id !== curr.branch_id
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
                                <EmployeeSelect
                                  placeholder="Search employee to replace"
                                  branchId={getFieldValue('branch_id')}
                                  positionId={getFieldValue(['details', name, 'position_id'])}
                                />
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
                                rules={[{ required: true, message: 'Last working day is required' }]}
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
                        <Form.Item
                          {...restField}
                          label="Qualifications"
                          name={[name, 'qualifications']}
                          rules={[{ required: true, message: 'Qualifications is required' }]}
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item {...restField} label="Experience" name={[name, 'experience']}>
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Education"
                          name={[name, 'education']}
                          rules={[{ required: true, message: 'Education is required' }]}
                        >
                          <Input.TextArea rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider titlePlacement="left" plain style={{ margin: '8px 0' }}>Job Specifications</Divider>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Gender"
                          name={[name, 'gender']}
                          rules={[{ required: true, message: 'Gender is required' }]}
                        >
                          <Select placeholder="Select" options={GENDER_OPTIONS} allowClear />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          {...restField}
                          label="Age Range (Min)"
                          name={[name, 'age_min']}
                          rules={[{ required: true, message: 'Min age is required' }]}
                        >
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
                            { required: true, message: 'Max age is required' },
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
                        <Form.Item
                          {...restField}
                          label="Relevant Work Experience Required"
                          name={[name, 'experience_required']}
                          rules={[{ required: true, message: 'This field is required' }]}
                        >
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
                        <Form.Item
                          {...restField}
                          label="PRC License"
                          name={[name, 'prc_license_status']}
                          rules={[{ required: true, message: 'PRC license status is required' }]}
                        >
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
                        <Form.Item
                          {...restField}
                          label="Driver's License"
                          name={[name, 'drivers_license_status']}
                          rules={[{ required: true, message: "Driver's license status is required" }]}
                        >
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

                    {/* Always available regardless of type — required only
                        for Additional/New Position before Submit (see
                        findMissingAttachmentLines/ManpowerRequestService::submit()),
                        optional for Replacement. `file_name` etc. carry an
                        existing attachment forward across edits (see the
                        pre-fill effect's own comment); picking a new file
                        here takes priority over whatever's still in those
                        fields, matching resolveLineFile() on the backend. */}
                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) =>
                        prev.details?.[name]?.replacement_or_additional !== curr.details?.[name]?.replacement_or_additional ||
                        prev.details?.[name]?.file_name !== curr.details?.[name]?.file_name
                      }
                    >
                      {({ getFieldValue }) => {
                        const isAttachmentRequired = ['Additional', 'New Position'].includes(
                          getFieldValue(['details', name, 'replacement_or_additional'])
                        );
                        const existingFileName = getFieldValue(['details', name, 'file_name']);
                        const pendingFile = detailFiles[key];

                        const clearAttachment = () => {
                          form.setFieldValue(['details', name, 'file_name'], null);
                          form.setFieldValue(['details', name, 'file_path'], null);
                          form.setFieldValue(['details', name, 'file_type'], null);
                          form.setFieldValue(['details', name, 'file_date_upload'], null);
                          setDetailFiles((prev) => {
                            const next = { ...prev };
                            delete next[key];
                            return next;
                          });
                        };

                        return (
                          <Row gutter={16} style={{ marginTop: 12 }}>
                            <Col span={24}>
                              <Typography.Text strong={isAttachmentRequired}>
                                Supporting Attachment {isAttachmentRequired ? '(required before submitting)' : '(optional)'}
                              </Typography.Text>
                              <div style={{ marginTop: 4 }}>
                                {pendingFile || existingFileName ? (
                                  <Space>
                                    <Typography.Text>{pendingFile?.name || existingFileName}</Typography.Text>
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={clearAttachment}>
                                      Remove
                                    </Button>
                                  </Space>
                                ) : (
                                  <Upload
                                    accept=".jpeg,.jpg,.png,.docs,.docx,.pdf"
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                      setDetailFiles((prev) => ({ ...prev, [key]: file }));
                                      return false;
                                    }}
                                  >
                                    <Button size="small" icon={<UploadOutlined />}>Attach File</Button>
                                  </Upload>
                                )}
                              </div>
                            </Col>
                          </Row>
                        );
                      }}
                    </Form.Item>
                  </Card>
                ))}

                <Form.Item>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                    Add Another Position
                  </Button>
                </Form.Item>

                <Form.ErrorList errors={errors} />
              </>
              );
            }}
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