import { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Segmented, Button, Space, Typography, Table, Tag, Alert, App } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';

import useAuth from '../../../../hooks/useAuth';
import recruitmentApi from '../../../../services/recruitment/recruitmentApi';
import { errorMessage } from '../../applicants/requirements';

// Recruitment → Setup → Online Exam (careers-online-exam-settings): how long
// a new exam link stays valid — in hours or days (careers portal
// ExamSetting; links already sent keep their own expiry) — and the exams
// that can be sent (sample MPQ / MDQ from the portal's OnlineExamSeeder).
const MAX = { hours: 720, days: 30 };
const KIND = { personality: 'Personality (no pass / fail)', aptitude: 'Aptitude (scored)' };

export default function OnlineExamSettings() {
  const { message } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const canEdit = hasRole('Administrator') || hasPermission('careers-online-exam-settings');
  const [form] = Form.useForm();
  const unit = Form.useWatch('link_expiry_unit', form) || 'hours';
  const [settings, setSettings] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await recruitmentApi.getOnlineExamSettings();
      if (!data?.success) throw Object.assign(new Error(), { response: { data } });
      setSettings(data.settings);
      setExams(data.exams || []);
      form.setFieldsValue({ link_expiry_value: data.settings.link_expiry_value, link_expiry_unit: data.settings.link_expiry_unit });
    } catch (err) {
      setError(errorMessage(err, 'The online exam settings could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => { await load(); };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { data } = await recruitmentApi.updateOnlineExamSettings(values);
      if (!data?.success) throw Object.assign(new Error(), { response: { data } });
      setSettings(data.settings);
      message.success(data.message || 'Saved.');
    } catch (err) {
      const bag = err?.response?.data?.error;
      if (bag && typeof bag === 'object') form.setFields(Object.entries(bag).map(([name, errors]) => ({ name, errors: [].concat(errors) })));
      message.error(errorMessage(err, 'The settings could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const hours = (settings?.link_expiry_unit === 'days' ? 24 : 1) * (settings?.link_expiry_value || 0);

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {error && <Alert type="error" showIcon title={error} />}
      <Card
        title="Exam link expiry"
        loading={loading && !settings}
        extra={<Button icon={<ReloadOutlined />} onClick={load} disabled={loading}>Refresh</Button>}
      >
        <Typography.Paragraph type="secondary">
          A new exam link stays valid for this long after it is created. Links already sent keep their own expiry.
          An exam started before its link expires can still be finished within its time limit.
        </Typography.Paragraph>
        <Form form={form} layout="inline" disabled={!canEdit} initialValues={{ link_expiry_unit: 'hours', link_expiry_value: 48 }}>
          <Form.Item
            name="link_expiry_value"
            rules={[{ required: true, message: 'Required.' }, { type: 'number', min: 1, max: MAX[unit], message: `1 – ${MAX[unit]} ${unit}.` }]}
          >
            <InputNumber min={1} max={MAX[unit]} precision={0} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="link_expiry_unit">
            <Segmented options={[{ label: 'Hours', value: 'hours' }, { label: 'Days', value: 'days' }]} />
          </Form.Item>
          {canEdit && (
            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} onClick={save} loading={saving}>Save</Button>
            </Form.Item>
          )}
        </Form>
        {settings && (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
            Now: {settings.link_expiry_value} {settings.link_expiry_unit}{settings.link_expiry_unit === 'days' ? ` (${hours} hours)` : ''}
            {settings.updated_at ? ` · changed ${settings.updated_at}${settings.updated_by_email ? ` by ${settings.updated_by_email}` : ''}` : ''}
          </Typography.Text>
        )}
      </Card>
      <Card title="Exams">
        <Table
          rowKey="id"
          size="small"
          loading={loading}
          pagination={false}
          dataSource={exams}
          columns={[
            { title: 'Code', dataIndex: 'code', width: 90, render: (v) => <Tag>{v}</Tag> },
            { title: 'Exam', dataIndex: 'title', render: (v, r) => <><div>{v}</div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Typography.Text></> },
            { title: 'Type', dataIndex: 'kind', render: (v) => KIND[v] || v },
            { title: 'Items', dataIndex: 'questions_count', align: 'center', width: 80 },
            { title: 'Time Limit', dataIndex: 'time_limit_minutes', width: 110, render: (v) => `${v} min` },
            { title: 'Passing', dataIndex: 'passing_percent', width: 90, render: (v) => (v === null ? '—' : `${v}%`) },
          ]}
          locale={{ emptyText: 'No active exams — run the careers portal OnlineExamSeeder.' }}
        />
      </Card>
    </Space>
  );
}
