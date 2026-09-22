import { useState } from 'react';
import {
  Card, Row, Col, Button, Form, Input,
  Transfer, Breadcrumb, Typography, App,
} from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';

import roleApi from '../../services/role/roleApi';

// The seeded Administrator role always has id 1 — vueportal's RoleController
// forbids updating/deleting it (403). Opening it here is view-only.
const ADMINISTRATOR_ROLE_ID = 1;

// ── Props ──────────────────────────────────────────────────────────────────
// mode            : 'create' | 'edit'
// role            : existing role (edit mode only) — { id, name }
// permissions     : full permission catalog — [{ id, name }]
// rolePermissions : ids of permissions currently assigned to the role (edit mode only)
// ─────────────────────────────────────────────────────────────────────────
const RoleForm = ({ mode = 'create', role = null, permissions = [], rolePermissions = [] }) => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const readOnly = mode === 'edit' && role?.id === ADMINISTRATOR_ROLE_ID;

  // No effect needed to seed these from `role`/`rolePermissions` — both
  // callers only ever mount this component once that data is already
  // settled (EditRole.jsx shows its own Spin until roleApi.getById
  // resolves; CreateRole.jsx has no async data at all), so a plain lazy
  // initializer is correct and avoids a redundant extra render.
  const [targetKeys, setTargetKeys] = useState(() => rolePermissions.map(String));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD shows inline field errors
    }

    const payload = { name: values.name, permission: targetKeys.map(Number) };

    setSaving(true);
    try {
      // vueportal returns HTTP 200 on both success and validation failure
      // (e.g. duplicate name) — `data.success` is the only reliable signal.
      const { data } = mode === 'create'
        ? await roleApi.create(payload)
        : await roleApi.update(role.id, payload);

      if (data.success) {
        message.success(data.success);
        navigate('/roles');
      } else {
        const [field, fieldErrors] = Object.entries(data)[0] || ['name', ['Invalid input.']];
        form.setFields([{ name: field, errors: [].concat(fieldErrors) }]);
      }
    } catch (error) {
      message.error(error.response?.data?.message || `Failed to ${mode === 'create' ? 'create' : 'update'} role.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: <Link to='/roles'>Roles</Link> },
          { title: mode === 'create' ? 'Create Role' : (readOnly ? 'View Role' : 'Edit Role') },
        ]}
      />

      <Card
        title={
          <Row align='middle' gutter={8}>
            <Col>
              <Button icon={<ArrowLeftOutlined />} type='text' onClick={() => navigate('/roles')} />
            </Col>
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {mode === 'create' ? 'Create Role' : (readOnly ? 'View Role' : 'Edit Role')}
              </Typography.Title>
            </Col>
          </Row>
        }
        extra={
          !readOnly && (
            <Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              {mode === 'create' ? 'Save Role' : 'Update Role'}
            </Button>
          )
        }
      >
        <Form form={form} layout='vertical' initialValues={{ name: role?.name }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={8}>
              <Form.Item
                name='name'
                label='Role'
                rules={[{ required: true, message: 'Please enter a role name.' }]}
              >
                <Input placeholder='e.g. HR Manager' readOnly={readOnly} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
          Permissions
        </Typography.Text>
        <Transfer
          dataSource={permissions.map((p) => ({ key: String(p.id), title: p.name }))}
          titles={['Available', 'Assigned']}
          targetKeys={targetKeys}
          onChange={(keys) => setTargetKeys(keys)}
          disabled={readOnly}
          showSearch
          filterOption={(input, option) => option.title.toLowerCase().includes(input.toLowerCase())}
          listStyle={{ width: 'calc(50% - 60px)', height: 400 }}
          render={(item) => item.title}
          pagination
        />
      </Card>
    </>
  );
};

export default RoleForm;
