import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Card, Form, Input, Switch, Select, Button, Space, Row, Col, Typography, InputNumber, Tag, Tooltip, Alert, Skeleton, App,
} from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, HolderOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import clearanceApi from '../../../services/clearance/clearanceApi';
import handleApiError from '../../../utils/handleApiError';
import { pesoInputProps, toNumber } from '../../payroll/payrollHelpers';
import { SIGNER_LABELS } from '../clearanceHelpers';

let seq = 0;
const key = () => `k${++seq}`;
const blankItem = () => ({ key: key(), id: null, clearance_item_category_id: undefined, name: '', is_required: true, standard_charge: null });
const blankComponent = () => ({ key: key(), id: null, name: '', signer_type: 'User', signer_user_id: undefined, asset_source: undefined, items: [blankItem()] });

// Add / edit a clearance template (/clearances/templates/new | :id), like
// the KPI template form: the name, the branches it covers (or default for
// every other branch), and its components in clearing order — drag a
// component by its handle — each with its in-charge (a specific employee,
// the employee's immediate head, or the branch manager of the employee's
// branch), the assets it lists and its checklist lines (category, item,
// required, standard charge). Saved as a whole; clearances already started
// keep their own copy.
const ClearanceTemplateForm = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [options, setOptions] = useState({ users: [], branches: [], categories: [], asset_sources: [], signer_types: [] });
  const [components, setComponents] = useState(isNew ? [blankComponent()] : []);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const isDefault = Form.useWatch('is_default', form);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await clearanceApi.setupOptions();
        setOptions(data);
        if (!isNew) {
          const { data: res } = await clearanceApi.template(id);
          const t = res.template;
          form.setFieldsValue({
            name: t.name, description: t.description, is_default: t.is_default, active: t.active,
            branch_ids: t.branches.map((b) => b.branch_id),
          });
          setComponents(t.components.map((c) => ({
            key: key(), id: c.id, name: c.name, signer_type: c.signer_type, signer_user_id: c.signer_user_id ?? undefined,
            asset_source: c.asset_source ?? undefined,
            items: c.items.map((i) => ({ key: key(), id: i.id, clearance_item_category_id: i.clearance_item_category_id, name: i.name, is_required: i.is_required, standard_charge: toNumber(i.standard_charge) })),
          })));
        } else {
          form.setFieldsValue({ active: true, is_default: false, branch_ids: [] });
        }
      } catch (error) {
        handleApiError(error, message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, form, message]);

  const patchComponent = (k, patch) => setComponents((list) => list.map((c) => (c.key === k ? { ...c, ...patch } : c)));
  const patchItem = (ck, ik, patch) => setComponents((list) => list.map((c) => (c.key === ck ? { ...c, items: c.items.map((i) => (i.key === ik ? { ...i, ...patch } : i)) } : c)));

  const onDragEnd = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    setComponents((list) => {
      const next = [...list];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      return next;
    });
  };

  const save = async () => {
    let header;
    try {
      header = await form.validateFields();
    } catch {
      return;
    }
    if (!components.length) { message.error('Add at least one component'); return; }
    const missing = components.findIndex((c) => !c.name.trim());
    if (missing >= 0) { message.error(`Component ${missing + 1} needs a name`); return; }
    for (const c of components) {
      if (c.items.some((i) => !i.name.trim() || !i.clearance_item_category_id)) {
        message.error(`${c.name}: every checklist line needs a category and an item`);
        return;
      }
    }
    const payload = {
      name: header.name,
      description: header.description || null,
      is_default: !!header.is_default,
      active: !!header.active,
      branch_ids: header.branch_ids || [],
      components: components.map((c) => ({
        id: c.id,
        name: c.name.trim(),
        signer_type: c.signer_type,
        signer_user_id: c.signer_type === 'User' ? c.signer_user_id ?? null : null,
        asset_source: c.asset_source ?? null,
        items: c.items.map((i) => ({
          id: i.id, clearance_item_category_id: i.clearance_item_category_id, name: i.name.trim(), is_required: !!i.is_required, standard_charge: i.standard_charge ?? null,
        })),
      })),
    };
    setSaving(true);
    try {
      const { data } = isNew ? await clearanceApi.createTemplate(payload) : await clearanceApi.updateTemplate(id, payload);
      message.success(data.message);
      navigate('/clearances/setup');
    } catch (error) {
      const bag = error.response?.status === 422 ? error.response.data : null;
      if (bag && !bag.message) {
        const first = Object.values(bag)[0];
        message.error([].concat(first)[0]);
        form.setFields(['name', 'branch_ids'].filter((f) => bag[f]).map((f) => ({ name: f, errors: [].concat(bag[f]) })));
      } else {
        handleApiError(error, message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card><Skeleton active /></Card>;

  const categoryOptions = options.categories.map((c) => ({ value: c.id, label: c.active ? c.name : `${c.name} (inactive)` }));

  return (
    <div>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clearances/setup')}>Clearance Setup</Button>
        <Button type='primary' icon={<SaveOutlined />} loading={saving} onClick={save}>Save Template</Button>
      </Space>

      <Card size='small' title={isNew ? 'New Clearance Template' : 'Edit Clearance Template'} style={{ marginBottom: 16 }}>
        <Form form={form} layout='vertical'>
          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item name='name' label='Template Name' rules={[{ required: true, whitespace: true, message: 'Template name is required' }]}>
                <Input maxLength={255} placeholder='e.g. Branch Clearance' />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name='description' label='Description'>
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col xs={12} md={2}>
              <Form.Item name='active' label='Active' valuePropName='checked'><Switch /></Form.Item>
            </Col>
            <Col xs={12} md={2}>
              <Form.Item name='is_default' label='Default' valuePropName='checked' tooltip='Used for every branch no other template covers (only one default)'><Switch /></Form.Item>
            </Col>
          </Row>
          <Form.Item
            name='branch_ids'
            label='Branches'
            extra={isDefault ? 'As the default it also covers every branch not listed in another template.' : 'The branches whose employees use this template (a branch can be in one template only).'}
          >
            <Select mode='multiple' allowClear showSearch={{ optionFilterProp: 'label' }} placeholder='e.g. ADMINISTRATION' options={options.branches.map((b) => ({ value: b.id, label: b.name }))} />
          </Form.Item>
        </Form>
      </Card>

      <Typography.Title level={5}>Components — in clearing order</Typography.Title>
      <Alert type='info' showIcon style={{ marginBottom: 12 }} title='Each component clears only after the one before it. Drag the handle to change the order. A component with no specific employee is assigned per clearance by HR (or cleared by HR).' />
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId='clearance-components'>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {components.map((c, index) => (
                <Draggable key={c.key} draggableId={c.key} index={index}>
                  {(drag) => (
                    <div ref={drag.innerRef} {...drag.draggableProps} style={{ ...drag.draggableProps.style, marginBottom: 12 }}>
                      <Card
                        size='small'
                        title={(
                          <Space>
                            <span {...drag.dragHandleProps} style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 16 }} aria-label='Drag to reorder'><HolderOutlined /></span>
                            <Tag color='blue'>{index + 1}</Tag>
                            <span>{c.name || 'New component'}</span>
                          </Space>
                        )}
                        extra={(
                          <Tooltip title='Remove component'>
                            <Button danger size='small' icon={<DeleteOutlined />} disabled={components.length === 1}
                              onClick={() => setComponents((list) => list.filter((x) => x.key !== c.key))} />
                          </Tooltip>
                        )}
                      >
                        <Row gutter={12}>
                          <Col xs={24} md={7}>
                            <Typography.Text type='secondary'>Component</Typography.Text>
                            <Input value={c.name} maxLength={255} placeholder='e.g. IT Department' onChange={(e) => patchComponent(c.key, { name: e.target.value })} status={c.name.trim() ? undefined : 'error'} />
                          </Col>
                          <Col xs={24} md={7}>
                            <Typography.Text type='secondary'>In-charge</Typography.Text>
                            <Select
                              value={c.signer_type}
                              onChange={(v) => patchComponent(c.key, { signer_type: v })}
                              options={options.signer_types.map((t) => ({ value: t, label: SIGNER_LABELS[t] || t }))}
                              style={{ width: '100%' }}
                            />
                          </Col>
                          <Col xs={24} md={6}>
                            <Typography.Text type='secondary'>{c.signer_type === 'User' ? 'Employee' : ' '}</Typography.Text>
                            {c.signer_type === 'User' ? (
                              <Select
                                allowClear
                                showSearch={{ optionFilterProp: 'label' }}
                                value={c.signer_user_id}
                                onChange={(v) => patchComponent(c.key, { signer_user_id: v })}
                                placeholder='None — HR assigns per clearance'
                                options={options.users.map((u) => ({ value: u.id, label: u.name }))}
                                style={{ width: '100%' }}
                              />
                            ) : <div style={{ paddingTop: 5, color: '#8c8c8c' }}>Found for each employee</div>}
                          </Col>
                          <Col xs={24} md={4}>
                            <Typography.Text type='secondary'>Lists assets</Typography.Text>
                            <Select allowClear value={c.asset_source} placeholder='None' onChange={(v) => patchComponent(c.key, { asset_source: v })}
                              options={options.asset_sources.map((s) => ({ value: s, label: s }))} style={{ width: '100%' }} />
                          </Col>
                        </Row>

                        <Typography.Text strong style={{ display: 'block', margin: '12px 0 6px' }}>Checklist</Typography.Text>
                        {c.items.map((i) => (
                          <Row key={i.key} gutter={8} align='middle' style={{ marginBottom: 6 }}>
                            <Col xs={24} md={6}>
                              <Select value={i.clearance_item_category_id} placeholder='Category' options={categoryOptions}
                                onChange={(v) => patchItem(c.key, i.key, { clearance_item_category_id: v })} style={{ width: '100%' }}
                                status={i.clearance_item_category_id ? undefined : 'error'} />
                            </Col>
                            <Col xs={24} md={9}>
                              <Input value={i.name} maxLength={255} placeholder='e.g. Laptop returned' onChange={(e) => patchItem(c.key, i.key, { name: e.target.value })}
                                status={i.name.trim() ? undefined : 'error'} />
                            </Col>
                            <Col xs={10} md={4}>
                              <Tooltip title='Required: Done, or charged when not returned. Optional: may be N/A.'>
                                <Space size={6}>
                                  <Switch size='small' checked={i.is_required} onChange={(v) => patchItem(c.key, i.key, { is_required: v })} />
                                  <span>{i.is_required ? 'Required' : 'Optional'}</span>
                                </Space>
                              </Tooltip>
                            </Col>
                            <Col xs={12} md={4}>
                              <InputNumber {...pesoInputProps} value={i.standard_charge} placeholder='Charge' onChange={(v) => patchItem(c.key, i.key, { standard_charge: v })} />
                            </Col>
                            <Col xs={2} md={1}>
                              <MinusCircleOutlined onClick={() => patchComponent(c.key, { items: c.items.filter((x) => x.key !== i.key) })} />
                            </Col>
                          </Row>
                        ))}
                        <Button type='dashed' block icon={<PlusOutlined />} onClick={() => patchComponent(c.key, { items: [...c.items, blankItem()] })}>Add Checklist Line</Button>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <Button type='dashed' block icon={<PlusOutlined />} onClick={() => setComponents((list) => [...list, blankComponent()])}>Add Component</Button>
    </div>
  );
};

export default ClearanceTemplateForm;
