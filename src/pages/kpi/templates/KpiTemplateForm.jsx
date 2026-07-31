import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Card, Row, Col, Typography, Input,
  Button, Space, Form, Divider,
  Select, App, Tag, Breadcrumb,
  Skeleton,
} from 'antd';
import { PlusOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';

import kpiTemplateApi   from '../../../services/kpi/kpiTemplateApi';
import usePositions     from '../../../hooks/usePositions';
import useAuth          from '../../../hooks/useAuth';
import KpiTemplateItemRow from './KpiTemplateItemRow';
import useKpiTemplateStore from '../../../store/kpiTemplateStore';
import handleApiError from '../../../utils/handleApiError';

// ── Helpers ────────────────────────────────────────────────────────────────────
const generateId  = () => `item-${Date.now()}-${Math.random()}`;
const reorder     = (list, from, to) => {
  const result = [...list];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
};

const emptyItem = () => ({
  id:             generateId(),
  component_code: '',
  component_name: '',
  weight:         '',
  sort_order:     1,
  computation_class: '',
});

// ── Props ──────────────────────────────────────────────────────────────────────
// mode     : 'create' | 'edit'
// template : existing template data (edit mode only)
// ──────────────────────────────────────────────────────────────────────────────
const KpiTemplateForm = ({ mode = 'create', template = null }) => {
  const navigate                          = useNavigate();
  const { message }                       = App.useApp();
  const { positionOptions, isLoading: positionIsLoading }    = usePositions();
  const { hasRole }                       = useAuth();
  const { templates, fetchTemplates, refreshTemplates, isLoading } = useKpiTemplateStore();
  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [positionId,  setPositionId]  = useState(null);
  const [items,       setItems]       = useState([emptyItem()]);
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState({});

  // ── Populate form in edit mode ─────────────────────────────────────────────
  useEffect(() => {

    if (mode === 'edit' && template) {
      
      setName(template.name);
      setDescription(template.description || '');
      setPositionId(template.position_id);
      setItems(
        template.items.map((item) => ({
          id:             generateId(),
          component_code: item.component_code,
          component_name: item.component_name,
          weight:         item.weight,
          sort_order:     item.sort_order,
          computation_class: item.computation_class || '', 
        }))
      );
    }
  }, [mode, template]);

  // ── Total weight indicator ─────────────────────────────────────────────────
  const totalWeight = items.reduce((sum, i) => sum + (parseFloat(i.weight) || 0), 0);
  // const weightOk    = Math.round(totalWeight * 100) / 100 === 100;

  // ── Item actions ───────────────────────────────────────────────────────────
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { ...emptyItem(), sort_order: prev.length + 1 },
    ]);
  };

  const removeItem = (id) => {
    setItems((prev) =>
      prev
        .filter((i) => i.id !== id)
        .map((i, idx) => ({ ...i, sort_order: idx + 1 }))
    );
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
    // clear item error on change
    setErrors((prev) => ({
      ...prev,
      items: { ...prev.items, [id]: { ...prev.items?.[id], [field]: '' } },
    }));
  };

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    setItems((prev) => reorder(prev, source.index, destination.index));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = { items: {} };
    let hasError    = false;

    if (!name.trim()) {
      newErrors.name = 'Template name is required.';
      hasError = true;
    }

    if (!positionId) {
      newErrors.positionId = 'Position is required.';
      hasError = true;
    }

    if (items.length === 0) {
      newErrors.general = 'At least one KPI item is required.';
      hasError = true;
    }

    items.forEach((item) => {
      newErrors.items[item.id] = {};

      if (!item.component_code.trim()) {
        newErrors.items[item.id].component_code = 'Code required.';
        hasError = true;
      }
      if (!item.component_name.trim()) {
        newErrors.items[item.id].component_name = 'Name required.';
        hasError = true;
      }
      if (!item.weight || isNaN(Number(item.weight)) || Number(item.weight) <= 0) {
        newErrors.items[item.id].weight = 'Enter valid weight.';
        hasError = true;
      }
    });

    // if (!weightOk) {
    //   newErrors.weight = `Total weight must equal 100%. Current: ${totalWeight.toFixed(2)}%`;
    //   hasError = true;
    // }

    setErrors(newErrors);
    return hasError;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (validate()) return;
    setSaving(true);
    try {
      const payload = {
        position_id: positionId,
        name,
        description,
        items: items.map((item, idx) => ({
          component_code: item.component_code,
          component_name: item.component_name,
          weight:         parseFloat(item.weight),
          sort_order:     idx + 1,
          computation_class: item.computation_class || null,
        })),
      };

      let response;

      if (mode === 'create') {
        response = await kpiTemplateApi.create(payload);
      } else {
        response = await kpiTemplateApi.update(template.id, payload);
      }

      const { data } = response;

      if (data.success) {
        message.success(data.message);
        navigate('/kpi-templates');
      } else {
        message.error(
          data.message ||
            `Failed to ${mode === 'create' ? 'create' : 'update'} template.`
        );
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: <Link to='/kpi-templates'>KPI Templates</Link> },
          { title: mode === 'create' ? 'Create Template' : 'Edit Template' },
        ]}
      />

      <Card
        title={
          <Row align='middle' gutter={8}>
            <Col>
              <Button
                icon={<ArrowLeftOutlined />}
                type='text'
                onClick={() => navigate('/kpi-templates')}
              />
            </Col>
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {mode === 'create' ? 'Create KPI Template' : 'Edit KPI Template'}
              </Typography.Title>
            </Col>
          </Row>
        }
        extra={
          <Button
            type='primary'
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
          >
            {mode === 'create' ? 'Save Template' : 'Update Template'}
          </Button>
        }
      >
        {/* ── Template Info ──────────────────────────────────────────────── */}
        <Row gutter={[16, 0]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={8}>
            <Form.Item
              label='Template Name'
              required
              validateStatus={errors.name ? 'error' : ''}
              help={errors.name}
              labelCol={{ span: 24 }}
              style={{ marginBottom: 0 }}
            >
              <Input
                placeholder='e.g. Account Analyst KPI'
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              label="Position"
              required
              validateStatus={errors.positionId ? 'error' : ''}
              help={errors.positionId}
              labelCol={{ span: 24 }}
              style={{ marginBottom: 0 }}
            >
              {positionIsLoading ? (
                <Skeleton.Input active style={{ width: '100%' }} />
              ) : (
                <Select
                  placeholder="Select position"
                  value={positionId}
                  onChange={(val) => {
                    setPositionId(val);
                    setErrors((prev) => ({ ...prev, positionId: '' }));
                  }}
                  options={positionOptions}
                  showSearch
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                />
              )}
            </Form.Item>
          </Col>

          <Col xs={24} md={24}>
            <Form.Item
              label='Description'
              labelCol={{ span: 24 }}
              style={{ marginBottom: 0 }}
            >
              <Input.TextArea
                placeholder='Describe the purpose of this KPI template...'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                showCount
                maxLength={500}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ borderColor: '#b7eb8f', marginTop: 8 }} />

        {/* ── Weight indicator ───────────────────────────────────────────── */}
        <Row justify='space-between' align='middle' style={{ marginBottom: 8 }}>
          <Col>
            <Typography.Text strong>KPI Components</Typography.Text>
          </Col>
          <Col>
            <Space>
              <Typography.Text type='secondary'>Total Weight:</Typography.Text>
              {/* <Tag color={weightOk ? 'success' : 'error'}>
                {totalWeight.toFixed(2)}% / 100%
              </Tag> */}
              <Tag color='blue'>
                Total: {totalWeight.toFixed(2)}%
              </Tag>
            </Space>
          </Col>
        </Row>

        {/* {errors.weight && (
          <Typography.Text type='danger' style={{ display: 'block', marginBottom: 8 }}>
            {errors.weight}
          </Typography.Text>
        )} */}

        {errors.general && (
          <Typography.Text type='danger' style={{ display: 'block', marginBottom: 8 }}>
            {errors.general}
          </Typography.Text>
        )}

        {/* ── Column headers ─────────────────────────────────────────────── */}
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 8, padding: '0 8px', marginBottom: 4 }}>
            <span style={{ width: 20 }} />
            <span style={{ width: 20 }} />
            <Typography.Text type='secondary' style={{ fontSize: 12, width: 80 }}>Code</Typography.Text>
            <Typography.Text type='secondary' style={{ fontSize: 12, flex: 1 }}>Component Name</Typography.Text>
            <Typography.Text type='secondary' style={{ fontSize: 12, width: 100 }}>Weight</Typography.Text>
            {hasRole('Administrator') && (
              <Typography.Text type='secondary' style={{ fontSize: 12, width: 210 }}>Computation Class</Typography.Text>
            )}
            <span style={{ width: 32 }} />
          </div>
        )}

        {/* ── Drag & Drop Items ──────────────────────────────────────────── */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId='kpi-items' type='ITEM'>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((item, idx) => (
                  <Draggable key={item.id} draggableId={item.id} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{ ...provided.draggableProps.style }}
                      >
                        <KpiTemplateItemRow
                          item={item}
                          index={idx}
                          dragHandleProps={provided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                          onUpdate={updateItem}
                          onRemove={removeItem}
                          errors={errors.items?.[item.id]}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Button
          type='dashed'
          icon={<PlusOutlined />}
          onClick={addItem}
          style={{ marginTop: 8, borderColor: '#389e0d', color: '#389e0d' }}
        >
          Add KPI Component
        </Button>
      </Card>
    </>
  );
};

export default KpiTemplateForm;