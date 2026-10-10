import { useState } from 'react';
import { Modal, Form, Input, Select, Switch, Row, Col, Alert, App } from 'antd';
import careersPositionApi from '../../../../services/recruitment/careersPositionApi';
import saveRecord from '../../../record_management/saveRecord';
import RichTextEditor from '../../../../components/RichTextEditor';
import { showGatewayError } from '../setupHelpers';

// CKEditor's "empty" document.
const isBlankHtml = (html) => !html || !html.replace(/<[^>]*>|&nbsp;/g, '').trim();

// The portal's own form posts FormData, and browsers send multipart text
// with CRLF line breaks — so portal-saved HTML is CKEditor 4 output with
// \r\n (and Laravel's TrimStrings drops the trailing break). An edited field
// is sent the same way; an untouched one goes back exactly as stored.
const asPortalSaves = (html, stored) => {
  if (isBlankHtml(html)) return '';
  if (html === (stored || '')) return html;
  return html.replace(/\r?\n/g, '\r\n').trim();
};

// Create/edit a careers position — portal PositionIndex.vue dialog. Rules
// from the portal's PositionController: name (unique), rank and department
// required; description required on update only; status Active/Inactive.
// The portal's "Level of Position" isn't saved by its controller and the
// Job Offer PDF has no column in production, so neither is here.
const CareersPositionFormModal = ({ open, position, departments, ranks, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState([]);
  const departmentId = Form.useWatch('department_id', form);

  const division = departments.find((d) => d.id === departmentId)?.division?.name;

  // A stored id with no matching option (31 portal positions point to
  // departments that no longer exist) would show as a bare number in the
  // Select — leave it empty instead so a current one must be picked (the
  // portal's own dialog shows these empty too).
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    setMissing([]);
    if (position) {
      const rankId = ranks.some((r) => r.id === position.rank_id) ? position.rank_id : undefined;
      const deptId = departments.some((d) => d.id === position.department_id) ? position.department_id : undefined;
      setMissing([
        position.department_id && deptId === undefined ? 'department' : null,
        position.rank_id && rankId === undefined ? 'rank' : null,
      ].filter(Boolean));
      form.setFieldsValue({
        name:           position.name,
        rank_id:        rankId,
        department_id:  deptId,
        status:         Number(position.status) === 1,
        description:    position.description || '',
        qualifications: position.qualifications || '',
      });
    }
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = {
      name:           values.name.trim(),
      rank_id:        values.rank_id,
      department_id:  values.department_id,
      status:         values.status ? 1 : 0,
      description:    asPortalSaves(values.description, position?.description),
      qualifications: asPortalSaves(values.qualifications, position?.qualifications),
    };

    setSaving(true);
    await saveRecord({
      request: () => (position ? careersPositionApi.update(position.id, payload) : careersPositionApi.create(payload)),
      form,
      message,
      onSaved,
      onError: showGatewayError,
    });
    setSaving(false);
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={position ? 'Edit Careers Position' : 'Create Careers Position'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={1000}
    >
      {missing.length > 0 && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
          title={`This position's saved ${missing.join(' and ')} no longer exists in the careers portal — choose one before saving.`}
        />
      )}
      <Form form={form} layout='vertical' initialValues={{ status: true, description: '', qualifications: '' }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name='name' label='Position' rules={[{ required: true, whitespace: true, message: 'Please enter position' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='rank_id' label='Rank' rules={[{ required: true, message: 'Please select a rank.' }]}>
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                placeholder='Select rank'
                options={ranks.map((r) => ({ label: r.name, value: r.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name='department_id' label='Department' rules={[{ required: true, message: 'Department is required' }]}>
              <Select
                showSearch={{ optionFilterProp: 'label' }}
                placeholder='Select department'
                options={departments.map((d) => ({ label: d.name, value: d.id }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label='Division'>
              <Input value={division || ''} placeholder='From the department' readOnly />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name='status' label='Status' valuePropName='checked'>
              <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='description'
          label='Description'
          rules={position ? [{ validator: (_, v) => (isBlankHtml(v) ? Promise.reject(new Error('The description field is required.')) : Promise.resolve()) }] : []}
          required={!!position}
        >
          <RichTextEditor />
        </Form.Item>
        <Form.Item name='qualifications' label='Qualifications'>
          <RichTextEditor />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CareersPositionFormModal;
