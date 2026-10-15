import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Alert, Button, Card, Divider, Form, InputNumber, Select, Space, Spin, Tag, Typography, App } from 'antd';
import { ArrowLeftOutlined, ExportOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import payrollAssistantApi from '../../services/payroll/payrollAssistantApi';
import handleApiError from '../../utils/handleApiError';
import EmployeeSelect from '../../pages/manpower_request/request/EmployeeSelect';

const LEVEL_COLORS = { ok: 'green', warn: 'orange', bad: 'red', info: 'blue' };

// One topic, walked like a conversation: each question's choices lead to
// the next node; an answer lists its steps (a step may open a page). A topic
// with a check offers "Check my case": the facts it finds and the answer for
// that outcome (topic.outcomes). `onBack` returns to the search.
const AssistantTopicView = ({ topicId, options, onBack, onNavigate }) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [topic, setTopic] = useState(null);
  const [path, setPath] = useState([]); // node ids walked so far
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await payrollAssistantApi.show(topicId);
        setTopic(data.topic);
        setPath([data.topic.tree.start]);
        setResult(null);
      } catch (error) {
        handleApiError(error, message);
      }
    };
    load();
  }, [topicId, message]);

  if (!topic) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;

  const nodes = topic.tree.nodes || {};
  const current = nodes[path[path.length - 1]];
  const check = topic.check ? (options.checks || []).find((c) => c.code === topic.check) : null;

  const go = (next) => setPath((p) => [...p, next]);
  const openPage = (link) => { navigate(link); onNavigate?.(); };

  const runCheck = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setChecking(true);
    try {
      const { data } = await payrollAssistantApi.check({ check: topic.check, ...values });
      setResult(data.result);
      const node = topic.outcomes?.[data.result.outcome];
      if (node && nodes[node]) setPath([topic.tree.start, node]);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 8 }} wrap>
        <Button size='small' icon={<ArrowLeftOutlined />} onClick={onBack}>All topics</Button>
        {path.length > 1 && <Button size='small' icon={<ReloadOutlined />} onClick={() => { setPath([topic.tree.start]); setResult(null); }}>Start over</Button>}
      </Space>
      <Typography.Title level={5} style={{ marginTop: 4 }}>{topic.title}</Typography.Title>
      {topic.summary && <Typography.Paragraph type='secondary'>{topic.summary}</Typography.Paragraph>}

      {check && (
        <Card size='small' title='Check my case' style={{ marginBottom: 12 }}>
          <Typography.Paragraph type='secondary' style={{ marginTop: 0 }}>
            {`${check.label}: the assistant looks it up (read-only) and opens the answer that fits.`}
          </Typography.Paragraph>
          <Form form={form} layout='vertical' initialValues={{ year: dayjs().year() }}>
            <Form.Item name='employee_id' label='Employee' rules={[{ required: true, message: 'Choose the employee' }]} style={{ marginBottom: 8 }}>
              <EmployeeSelect placeholder='Search employee' />
            </Form.Item>
            {check.needs === 'year' ? (
              <Form.Item name='year' label='Year' rules={[{ required: true, message: 'Year' }]} style={{ marginBottom: 8 }}>
                <InputNumber min={2000} max={2100} precision={0} style={{ width: 140 }} />
              </Form.Item>
            ) : (
              <Form.Item name='payroll_cutoff_id' label='Cut-off' rules={[{ required: true, message: 'Choose the cut-off' }]} style={{ marginBottom: 8 }}>
                <Select
                  showSearch={{ optionFilterProp: 'label' }}
                  placeholder='Choose the cut-off'
                  options={(options.cutoffs || []).map((c) => ({ value: c.id, label: `${c.code} (${dayjs(c.date_from).format('MM/DD')} – ${dayjs(c.date_to).format('MM/DD/YYYY')})` }))}
                />
              </Form.Item>
            )}
            <Button type='primary' icon={<SearchOutlined />} loading={checking} onClick={runCheck}>Check</Button>
          </Form>
          {result && (
            <div style={{ marginTop: 12 }}>
              {result.facts.map((f) => (
                <div key={`${f.label}-${f.value}`} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <Tag color={LEVEL_COLORS[f.level]} style={{ flex: 'none' }}>{f.label}</Tag>
                  <span>{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {current?.q && (
        <Card size='small'>
          <Typography.Text strong>{current.q}</Typography.Text>
          <Space orientation='vertical' style={{ width: '100%', marginTop: 10 }}>
            {current.options.map((o) => (
              <Button key={o.label} block style={{ textAlign: 'left', height: 'auto', whiteSpace: 'normal' }} onClick={() => go(o.next)}>{o.label}</Button>
            ))}
          </Space>
        </Card>
      )}

      {current?.steps && (
        <Card size='small' title={current.title}>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {current.steps.map((s, i) => (
              <li key={`${i}-${s.text}`} style={{ marginBottom: 8 }}>
                <div>{s.text}</div>
                {s.link && (
                  <Button size='small' type='link' icon={<ExportOutlined />} style={{ paddingLeft: 0 }} onClick={() => openPage(s.link)}>
                    {s.link_label || 'Open page'}
                  </Button>
                )}
              </li>
            ))}
          </ol>
          {current.note && <Alert type='info' showIcon style={{ marginTop: 8 }} title={current.note} />}
        </Card>
      )}

      {path.length > 1 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Button size='small' onClick={() => setPath((p) => p.slice(0, -1))}>Back one step</Button>
        </>
      )}
    </div>
  );
};

export default AssistantTopicView;
