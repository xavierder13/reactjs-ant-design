import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, Form, InputNumber, Button, Alert, Typography, Spin, Row, Col, App } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import sessionSettingApi from '../../services/auth/sessionSettingApi';
import handleApiError from '../../utils/handleApiError';
import { durationText, setSessionSettings } from '../../utils/session';

const { Text } = Typography;

// Session Settings (Administrator only): minutes of no activity before a
// user is logged out, and the hours a sign-in lasts at most. Saved in
// vueportal (SessionSetting); CheckSessionActivity enforces both for the
// React and Vue apps alike, and their idle timers read them at sign-in /
// on the next /auth/init.
const SessionSettingsPage = () => {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Administrator');
  const [form] = Form.useForm();
  const [setting, setSetting] = useState(null);
  const [saving, setSaving] = useState(false);
  const idle = Form.useWatch('idle_timeout_minutes', form);
  const lifetime = Form.useWatch('session_lifetime_hours', form);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const { data } = await sessionSettingApi.show();
        setSetting(data.session_setting);
        form.setFieldsValue(data.session_setting);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [isAdmin, form, message]);

  if (!isAdmin) return <Navigate to='/unauthorize' replace />;
  if (!setting) return <Spin style={{ display: 'block', margin: '48px auto' }} />;

  const { limits, defaults } = setting;

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const { data } = await sessionSettingApi.update(values);
      setSetting(data.session_setting);
      form.setFieldsValue(data.session_setting);
      setSessionSettings({ idle_timeout_minutes: values.idle_timeout_minutes, session_lifetime_hours: values.session_lifetime_hours });
      message.success(data.message || 'Session settings saved');
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title='Session Settings' style={{ maxWidth: 720 }}>
      <Alert
        type='info'
        showIcon
        style={{ marginBottom: 20 }}
        title='Applies to every user of the HRIS and the old portal, right away.'
        description='A new idle time counts from each user’s next action. A shorter session duration also ends sessions that are already older than it — they are asked to log in again.'
      />
      <Form form={form} layout='vertical' requiredMark={false}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name='idle_timeout_minutes'
              label='Idle time before logout'
              extra={`${limits.idle_min}–${limits.idle_max} minutes. Default ${durationText(defaults.idle_timeout_minutes)}.`}
              rules={[{ required: true, message: 'Give the idle time' }]}
            >
              <InputNumber min={limits.idle_min} max={limits.idle_max} precision={0} suffix='minutes' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='session_lifetime_hours'
              label='Session duration'
              extra={`${limits.lifetime_min}–${limits.lifetime_max} hours after signing in, even when active. Default ${defaults.session_lifetime_hours} hours.`}
              dependencies={['idle_timeout_minutes']}
              rules={[
                { required: true, message: 'Give the session duration' },
                ({ getFieldValue }) => ({
                  validator: (_, v) => (!v || !getFieldValue('idle_timeout_minutes') || getFieldValue('idle_timeout_minutes') <= v * 60
                    ? Promise.resolve()
                    : Promise.reject(new Error('Must be at least as long as the idle time'))),
                }),
              ]}
            >
              <InputNumber min={limits.lifetime_min} max={limits.lifetime_max} precision={0} suffix='hours' style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        {idle > 0 && lifetime > 0 && (
          <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>
            {`Users are logged out after ${durationText(idle)} without activity, and after ${lifetime} hour${lifetime === 1 ? '' : 's'} from signing in at most.`}
          </Text>
        )}
        <Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={save}>Save</Button>
        {setting.updated_at && (
          <Text type='secondary' style={{ marginLeft: 12, fontSize: 12 }}>
            {`Last changed ${setting.updated_at}${setting.updated_by ? ` by ${setting.updated_by}` : ''}`}
          </Text>
        )}
      </Form>
    </Card>
  );
};

export default SessionSettingsPage;
