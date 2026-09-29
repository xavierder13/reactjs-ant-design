import { useState } from 'react';
import { Modal, Form, Input, Select, Switch, Transfer, Row, Col, App } from 'antd';
import userApi from '../../services/user/userApi';
import useAuthStore from '../../store/authStore';
import handleApiError from '../../utils/handleApiError';

const PASSWORD_MIN = 8;

// Create/edit modal for a user account. `user` = null for create, else the
// list row being edited (already carries roles/branch/position, so no extra
// fetch). Options (roles/branches/positions) come from /user/index via the
// list page — see userApi.js for why not /user/create.
const UserFormModal = ({ open, user, roles, branches, positions, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const setAuth     = useAuthStore((state) => state.setAuth);

  const isEdit = !!user;

  // Roles are assigned by name (Spatie assignRole) — keys are role names.
  const roleItems = roles.map((r) => ({ key: r.name, title: r.name }));

  // Populate only once the Modal has opened (destroyOnHidden — the Form
  // isn't mounted before that; see PermissionIndex.jsx).
  // Always reset first: the form store outlives the modal content, so values
  // typed in an earlier Create (e.g. a password) would otherwise ride along
  // into this Edit and silently change the user's password.
  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    if (user) {
      form.setFieldsValue({
        name:        user.name,
        email:       user.email,
        branch_id:   user.branch_id,
        position_id: user.position_id ?? undefined,
        active:      user.active !== 'N',
        roles:       (user.roles || []).map((r) => r.name),
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
      name:        values.name,
      branch_id:   values.branch_id,
      position_id: values.position_id ?? null,
      active:      values.active ? 'Y' : 'N',
      roles:       values.roles || [],
    };
    if (!isEdit) payload.email = values.email;
    // On edit a blank password means "keep the current one"; the backend
    // only validates/changes it when password or confirm_password is sent.
    if (!isEdit || values.password) {
      payload.password = values.password;
      payload.confirm_password = values.confirm_password;
    }

    setSaving(true);
    try {
      const { data } = isEdit
        ? await userApi.update(user.id, payload)
        : await userApi.create(payload);

      // HTTP 200 on validation failure too — `success` is the only signal.
      if (data.success) {
        // Editing your own account: apply the new roles/permissions now
        // instead of on the next reload.
        if (isEdit && currentUser?.id === user.id && data.user_roles) {
          setAuth({ ...currentUser, name: data.user.name }, data.user_roles, data.user_permissions);
        }
        message.success(data.success);
        onSaved();
      } else {
        form.setFields(Object.entries(data).map(([name, errors]) => ({ name, errors: [].concat(errors) })));
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit User' : 'Create User'}
      okText='Save'
      onOk={handleSave}
      confirmLoading={saving}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={820}
    >
      <Form form={form} layout='vertical' initialValues={{ active: true, roles: [] }}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name='name' label='Full Name' rules={[{ required: true, whitespace: true, message: 'Full name is required' }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='email'
              label='E-mail'
              extra={isEdit ? 'The e-mail is the login and can’t be changed.' : null}
              rules={isEdit ? [] : [
                { required: true, message: 'E-mail is required' },
                { type: 'email', message: 'Enter a valid e-mail' },
              ]}
            >
              <Input disabled={isEdit} autoComplete='off' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='password'
              label={isEdit ? 'New Password' : 'Password'}
              extra={isEdit ? 'Leave blank to keep the current password.' : null}
              rules={[
                { required: !isEdit, message: 'Password is required' },
                { min: PASSWORD_MIN, message: `Password must be at least ${PASSWORD_MIN} characters` },
              ]}
            >
              <Input.Password autoComplete='new-password' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='confirm_password'
              label='Confirm Password'
              dependencies={['password']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const password = getFieldValue('password');
                    if (!password && !value) return Promise.resolve();
                    if (!value) return Promise.reject(new Error('Please confirm the password'));
                    return value === password ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete='new-password' />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name='branch_id' label='Branch' rules={[{ required: true, message: 'Branch is required' }]}>
              <Select
                options={branches.map((b) => ({ label: b.name, value: b.id }))}
                showSearch={{ optionFilterProp: 'label' }}
                placeholder='Select branch'
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name='position_id' label='Position'>
              <Select
                options={positions.map((p) => ({ label: p.name, value: p.id }))}
                showSearch={{ optionFilterProp: 'label' }}
                allowClear
                placeholder='Select position'
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name='active' label='Status' valuePropName='checked'>
              <Switch checkedChildren='Active' unCheckedChildren='Inactive' />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='roles' label='Roles' valuePropName='targetKeys'>
          <Transfer
            dataSource={roleItems}
            titles={['Available Roles', 'Assigned']}
            showSearch
            filterOption={(input, item) => item.title.toLowerCase().includes(input.toLowerCase())}
            render={(item) => item.title}
            styles={{ section: { width: 'calc(50% - 20px)', height: 300 } }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;
