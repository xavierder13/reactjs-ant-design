import { useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Row, Col, Card, Button, Space, Typography, App } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import payrollAssistantApi from '../../../services/payroll/payrollAssistantApi';
import handleApiError from '../../../utils/handleApiError';
import { applyFormErrors } from '../payrollHelpers';

// A step line: "text" or "text [Button label](/page)".
const STEP_LINK = /^(.*?)\s*\[([^\]]+)\]\((\/[^)\s]*)\)\s*$/;
const stepsToText = (steps = []) => steps.map((s) => (s.link ? `${s.text} [${s.link_label || 'Open page'}](${s.link})` : s.text)).join('\n');
const textToSteps = (text = '') => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const m = l.match(STEP_LINK);
  return m ? { text: m[1], link_label: m[2], link: m[3] } : { text: l };
});

// tree { start, nodes: { id: node } } ⇄ the form's node list
const treeToForm = (tree) => ({
  start: tree?.start,
  nodes: Object.entries(tree?.nodes || {}).map(([id, n]) => (n.q !== undefined
    ? { id, kind: 'question', q: n.q, options: n.options || [] }
    : { id, kind: 'answer', title: n.title, steps: stepsToText(n.steps), note: n.note })),
});
const formToTree = (values) => ({
  start: values.start,
  nodes: Object.fromEntries((values.nodes || []).map((n) => [n.id, n.kind === 'question'
    ? { q: n.q, options: (n.options || []).map((o) => ({ label: o.label, next: o.next })) }
    : { title: n.title, steps: textToSteps(n.steps), ...(n.note ? { note: n.note } : {}) }])),
});

// Create / edit a Payroll Assistant topic (payroll-assistant-manage): search
// words, the question → answer nodes, and an optional case check whose
// results each open an answer. `topic` = null for create.
const AssistantTopicFormModal = ({ open, topic, options, onClose, onSaved }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const nodes = Form.useWatch('nodes', form) || [];
  const checkCode = Form.useWatch('check', form);
  const check = (options.checks || []).find((c) => c.code === checkCode);
  const nodeOptions = nodes.filter((n) => n?.id).map((n) => ({ value: n.id, label: `${n.id} — ${n.kind === 'question' ? (n.q || 'question') : (n.title || 'answer')}` }));
  const answerOptions = nodeOptions.filter((o) => nodes.find((n) => n?.id === o.value)?.kind === 'answer');

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) return;
    form.resetFields();
    form.setFieldsValue(topic
      ? { ...topic, ...treeToForm(topic.tree), outcomes: topic.outcomes || {} }
      : { active: true, sort_order: 100, start: 'a1', nodes: [{ id: 'a1', kind: 'answer', steps: '' }] });
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code.trim(), title: values.title.trim(), category: values.category,
      keywords: values.keywords?.trim() || null, summary: values.summary?.trim() || null,
      tree: formToTree(values), check: values.check || null,
      outcomes: values.check ? Object.fromEntries(Object.entries(values.outcomes || {}).filter(([, v]) => v)) : null,
      active: !!values.active, sort_order: values.sort_order ?? 0,
    };
    setSaving(true);
    try {
      const { data } = topic ? await payrollAssistantApi.update(topic.id, payload) : await payrollAssistantApi.create(payload);
      message.success(data.message);
      onSaved();
    } catch (error) {
      applyFormErrors(error, form, message, handleApiError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      keyboard={false}
      open={open}
      title={topic ? 'Edit Topic' : 'New Topic'}
      okText='Save'
      onOk={handleSave}
      onCancel={onClose}
      confirmLoading={saving}
      afterOpenChange={handleAfterOpenChange}
      width={860}
      destroyOnHidden
    >
      <Form form={form} layout='vertical'>
        <Row gutter={12}>
          <Col xs={24} md={14}>
            <Form.Item name='title' label='Title' rules={[{ required: true, whitespace: true, message: 'Title is required' }]}>
              <Input maxLength={255} placeholder='e.g. The employee paid a loan in cash' />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name='code' label='Code' rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'lowercase, digits and -' }]}>
              <Input maxLength={60} placeholder='loan-cash' />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name='sort_order' label='Order'>
              <InputNumber min={0} max={9999} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name='category' label='Category' rules={[{ required: true, message: 'Choose the category' }]}>
              <Select options={(options.categories || []).map((c) => ({ value: c, label: c }))} />
            </Form.Item>
          </Col>
          <Col xs={12} md={10}>
            <Form.Item name='check' label='Check my case' tooltip='The assistant looks the case up and opens the answer you pick for each result.'>
              <Select allowClear placeholder='None' options={(options.checks || []).map((c) => ({ value: c.code, label: c.label }))} />
            </Form.Item>
          </Col>
          <Col xs={12} md={4}>
            <Form.Item name='active' label='Active' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name='keywords' label='Words people may use' extra='Comma or line separated, any language — synonyms and Taglish help the search (e.g. "nadoble, double deduction, deducted twice").'>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} maxLength={5000} />
        </Form.Item>
        <Form.Item name='summary' label='Summary'>
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} maxLength={2000} />
        </Form.Item>

        <Typography.Text strong>Questions and answers</Typography.Text>
        <Typography.Paragraph type='secondary' style={{ marginBottom: 8 }}>
          A question offers choices that lead to another question or an answer. Answer steps: one per line; end a line with [Button label](/page) to add a button that opens that page.
        </Typography.Paragraph>
        <Form.Item name='start' label='Opens with' rules={[{ required: true, message: 'Choose the first question or answer' }]}>
          <Select options={nodeOptions} />
        </Form.Item>
        <Form.List name='nodes'>
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => {
                const kind = nodes[field.name]?.kind;
                return (
                  <Card key={field.key} size='small' style={{ marginBottom: 8 }}>
                    <Row gutter={8} align='middle'>
                      <Col xs={10} md={5}>
                        <Form.Item name={[field.name, 'id']} label='Id' rules={[{ required: true, pattern: /^[a-z0-9_]{1,40}$/, message: 'a–z, 0–9, _' }]} style={{ marginBottom: 8 }}>
                          <Input placeholder='q1' />
                        </Form.Item>
                      </Col>
                      <Col xs={12} md={6}>
                        <Form.Item name={[field.name, 'kind']} label='Kind' rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                          <Select options={[{ value: 'question', label: 'Question' }, { value: 'answer', label: 'Answer' }]} />
                        </Form.Item>
                      </Col>
                      <Col flex='auto' style={{ textAlign: 'right' }}>
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      </Col>
                    </Row>
                    {kind === 'question' ? (
                      <>
                        <Form.Item name={[field.name, 'q']} label='Question' rules={[{ required: true, whitespace: true, message: 'Write the question' }]} style={{ marginBottom: 8 }}>
                          <Input />
                        </Form.Item>
                        <Form.List name={[field.name, 'options']}>
                          {(opts, { add: addOpt, remove: removeOpt }) => (
                            <>
                              {opts.map((o) => (
                                <Space key={o.key} align='baseline' style={{ display: 'flex' }}>
                                  <Form.Item name={[o.name, 'label']} rules={[{ required: true, message: 'Choice' }]} style={{ marginBottom: 6, width: 300 }}>
                                    <Input placeholder='Choice' />
                                  </Form.Item>
                                  <Form.Item name={[o.name, 'next']} rules={[{ required: true, message: 'Leads to' }]} style={{ marginBottom: 6, width: 300 }}>
                                    <Select placeholder='Leads to' options={nodeOptions} />
                                  </Form.Item>
                                  <MinusCircleOutlined onClick={() => removeOpt(o.name)} />
                                </Space>
                              ))}
                              <Button type='dashed' size='small' icon={<PlusOutlined />} onClick={() => addOpt({})}>Add choice</Button>
                            </>
                          )}
                        </Form.List>
                      </>
                    ) : (
                      <>
                        <Form.Item name={[field.name, 'title']} label='Answer title' rules={[{ required: true, whitespace: true, message: 'Title' }]} style={{ marginBottom: 8 }}>
                          <Input />
                        </Form.Item>
                        <Form.Item name={[field.name, 'steps']} label='Steps' rules={[{ required: true, whitespace: true, message: 'At least one step' }]} style={{ marginBottom: 8 }}>
                          <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder={'Open the payroll and click Roll Back Selected. [Open Payroll Runs](/payroll-runs)\nGenerate Selected, then Submit for Approval.'} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'note']} label='Note' style={{ marginBottom: 0 }}>
                          <Input />
                        </Form.Item>
                      </>
                    )}
                  </Card>
                );
              })}
              <Space>
                <Button type='dashed' icon={<PlusOutlined />} onClick={() => add({ id: `q${fields.length + 1}`, kind: 'question', options: [{}] })}>Add question</Button>
                <Button type='dashed' icon={<PlusOutlined />} onClick={() => add({ id: `a${fields.length + 1}`, kind: 'answer' })}>Add answer</Button>
              </Space>
            </>
          )}
        </Form.List>

        {check && (
          <Card size='small' title='Check results → answer' style={{ marginTop: 12 }}>
            {check.outcomes.map((o) => (
              <Form.Item key={o} name={['outcomes', o]} label={o.replace(/_/g, ' ')} style={{ marginBottom: 6 }}>
                <Select allowClear placeholder='No answer for this result' options={answerOptions} />
              </Form.Item>
            ))}
          </Card>
        )}
      </Form>
    </Modal>
  );
};

export default AssistantTopicFormModal;
