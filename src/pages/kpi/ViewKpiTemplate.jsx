// src/pages/kpi/KpiTemplatePage.jsx

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Card,
  Row,
  Col,
  Typography,
  Input,
  Button,
  Space,
  Popconfirm,
  Form,
  Divider,
  Select,
  App,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';

const KpiTemplatePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { message } = App.useApp();
  // ── State ──────────────────────────────────────────────────────────────────
  const [templateInfo, setTemplateInfo] = useState({
    kpiName:        '',
    kpiDescription: '',
    department:     null,
  });

  console.log(id);
  
  const [categories, setCategories] = useState([
    {
      id:    'cat-1',
      name:  '',
      order: 1,
      items: [
        { id: 'item-1', name: '', rate: '', order: 1 },
      ],
    },
  ]);

  const [errors, setErrors] = useState({
    kpiName:    '',
    department: '',
    categories: {},
  });

  const departments = [
    { value: 'hr',        label: 'Human Resources' },
    { value: 'finance',   label: 'Finance' },
    { value: 'it',        label: 'Information Technology' },
    { value: 'ops',       label: 'Operations' },
    { value: 'sales',     label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
  ];

  // ── Drag helpers ───────────────────────────────────────────────────────────
  const reorder = (list, startIndex, endIndex) => {
    const result = [...list];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((item, idx) => ({ ...item, order: idx + 1 }));
  };

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === 'CATEGORY') {
      setCategories((prev) => reorder(prev, source.index, destination.index));
      return;
    }

    if (type === 'ITEM') {
      const catId = source.droppableId;
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === catId
            ? { ...cat, items: reorder(cat.items, source.index, destination.index) }
            : cat
        )
      );
    }
  };

  // ── Category actions ───────────────────────────────────────────────────────
  const addCategory = () => {
    const incompleteCategory = categories.find((c) => !c.name.trim());
    if (incompleteCategory) {
      message.warning('Please fill in the category name before adding a new category.');
      return;
    }

    const categoryWithIncompleteItems = categories.find((c) =>
      c.items.some((i) => !i.name.trim() || !i.weight || !i.target)
    );
    if (categoryWithIncompleteItems) {
      message.warning('Please complete all KPI item fields before adding a new category.');
      return;
    }

    const newId = `cat-${Date.now()}`;
    setCategories((prev) => [
      ...prev,
      { id: newId, name: '', order: prev.length + 1, items: [] },
    ]);
  };

  const removeCategory = (catId) => {
    setCategories((prev) =>
      prev.filter((c) => c.id !== catId).map((c, i) => ({ ...c, order: i + 1 }))
    );
  };

  const updateCategory = (catId, field, value) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === catId ? { ...cat, [field]: value } : cat))
    );
  };

  // ── Item actions ───────────────────────────────────────────────────────────
  const addItem = (catId) => {
    const cat = categories.find((c) => c.id === catId);
    const incomplete = cat.items.find((i) => !i.name.trim() || !i.weight || !i.target);
    if (incomplete) {
      message.warning('Please complete all KPI fields before adding a new row.');
      return;
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: [
                ...c.items,
                { id: `item-${Date.now()}`, name: '', weight: '', target: '', order: c.items.length + 1 },
              ],
            }
          : c
      )
    );
  };

  const removeItem = (catId, itemId) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: cat.items
                .filter((i) => i.id !== itemId)
                .map((i, idx) => ({ ...i, order: idx + 1 })),
            }
          : cat
      )
    );
  };

  const updateItem = (catId, itemId, field, value) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) }
          : cat
      )
    );
  };

  // ── Error clearers ─────────────────────────────────────────────────────────
  const clearTopError = (field) =>
    setErrors((prev) => ({ ...prev, [field]: '' }));

  const clearCatError = (catId, field) =>
    setErrors((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [catId]: { ...prev.categories[catId], [field]: '' },
      },
    }));

  const clearItemError = (catId, itemId, field) =>
    setErrors((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [catId]: {
          ...prev.categories[catId],
          items: {
            ...prev.categories[catId]?.items,
            [itemId]: { ...prev.categories[catId]?.items?.[itemId], [field]: '' },
          },
        },
      },
    }));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateFields = () => {
    const newErrors = { kpiName: '', department: '', categories: {} };
    let hasError = false;

    if (!templateInfo.kpiName.trim()) {
      newErrors.kpiName = 'KPI Name is required.';
      hasError = true;
    }

    if (!templateInfo.department) {
      newErrors.department = 'Department is required.';
      hasError = true;
    }

    for (const cat of categories) {
      newErrors.categories[cat.id] = { items: {} };

      if (!cat.name.trim()) {
        newErrors.categories[cat.id].name = 'Category name is required.';
        hasError = true;
      }

      const catNames = categories.map((c) => c.name.trim().toLowerCase());
      const isDuplicate = catNames.filter((n) => n === cat.name.trim().toLowerCase()).length > 1;

      if (cat.name.trim() && isDuplicate) {
        newErrors.categories[cat.id].name = `Category name "${cat.name.trim()}" is already used.`;
        hasError = true;
      }

      for (const item of cat.items) {
        newErrors.categories[cat.id].items[item.id] = {};

        if (!item.name.trim()) {
          newErrors.categories[cat.id].items[item.id].name = 'KPI name is required.';
          hasError = true;
        }
        if (!item.weight || isNaN(Number(item.weight)) || Number(item.weight) <= 0 || Number(item.weight) > 100) {
          newErrors.categories[cat.id].items[item.id].weight = 'Enter a valid weight (1–100).';
          hasError = true;
        }
        if (!item.target.trim()) {
          newErrors.categories[cat.id].items[item.id].target = 'Target is required.';
          hasError = true;
        }
      }

      const itemErrors    = Object.values(newErrors.categories[cat.id].items || {});
      const hasItemError  = itemErrors.some((e) => e.name || e.weight || e.target);
      const hasCatNameError = !!newErrors.categories[cat.id].name;

      if (hasItemError || hasCatNameError) {
        newErrors.categories[cat.id].error = 'Please complete all required fields in this category.';
      }
    }

    setErrors(newErrors);
    return hasError;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const hasError = validateFields();
    if (hasError) return;

    try {
      const payload = {
        name:        templateInfo.kpiName,
        description: templateInfo.kpiDescription,
        department:  templateInfo.department,
        categories:  categories.map((cat) => ({
          id:    cat.id,
          name:  cat.name,
          order: cat.order,
          items: cat.items.map((item) => ({
            id:     item.id,
            name:   item.name,
            rate: Number(item.rate),
            order:  item.order,
          })),
        })),
      };

      const { data } = await axiosInstance.post('/kpi/templates', payload);

      if (data.success) {
        message.success('KPI Template saved successfully!');
        navigate('/kpi/index');
      } else {
        message.error('Failed to save. Please try again.');
      }
    } catch (error) {
      message.error('Something went wrong. Please try again.');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>
          KPI Template
        </Typography.Title>
      }
    >
      {/* ── Template Info ─────────────────────────────────────────────────── */}
      <Row gutter={[16, 0]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Form.Item
            label='KPI Name'
            required
            validateStatus={errors.kpiName ? 'error' : ''}
            help={errors.kpiName}
            style={{ marginBottom: 0 }}
            labelCol={{ span: 24 }}
          >
            <Input
              placeholder='Enter KPI template name'
              value={templateInfo.kpiName}
              onChange={(e) => {
                setTemplateInfo((prev) => ({ ...prev, kpiName: e.target.value }));
                clearTopError('kpiName');
              }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label='Department'
            required
            validateStatus={errors.department ? 'error' : ''}
            help={errors.department}
            style={{ marginBottom: 0 }}
            labelCol={{ span: 24 }}
          >
            <Select
              placeholder='Select department'
              value={templateInfo.department}
              onChange={(val) => {
                setTemplateInfo((prev) => ({ ...prev, department: val }));
                clearTopError('department');
              }}
              options={departments}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} md={24}>
          <Form.Item
            label='KPI Description'
            style={{ marginBottom: 0 }}
            labelCol={{ span: 24 }}
          >
            <Input.TextArea
              placeholder='Describe the purpose of this KPI template...'
              value={templateInfo.kpiDescription}
              onChange={(e) => setTemplateInfo((prev) => ({ ...prev, kpiDescription: e.target.value }))}
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider style={{ borderColor: '#b7eb8f', marginTop: 8 }} />

      {/* ── Drag & Drop Categories ────────────────────────────────────────── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId='categories' type='CATEGORY'>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {categories.map((cat, catIdx) => (
                <Draggable key={cat.id} draggableId={cat.id} index={catIdx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        marginBottom: 16,
                        border: '1px solid #b7eb8f',
                        borderRadius: 8,
                        background: snapshot.isDragging ? '#f6ffed' : '#fff',
                        ...provided.draggableProps.style,
                      }}
                    >
                      {/* ── Category header ─────────────────────────── */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 12px',
                          background: '#f6ffed',
                          borderRadius: '8px 8px 0 0',
                          borderBottom: '1px solid #b7eb8f',
                        }}
                      >
                        <span
                          {...provided.dragHandleProps}
                          style={{ cursor: 'grab', color: '#8c8c8c', fontSize: 16 }}
                        >
                          ⠿
                        </span>
                        <Typography.Text strong style={{ color: '#389e0d', minWidth: 60 }}>
                          #{cat.order} Category
                        </Typography.Text>
                        <Form.Item
                          validateStatus={errors.categories[cat.id]?.name ? 'error' : ''}
                          help={errors.categories[cat.id]?.name}
                          style={{ margin: 0, flex: 1 }}
                        >
                          <Input
                            placeholder='Category name'
                            value={cat.name}
                            onChange={(e) => {
                              updateCategory(cat.id, 'name', e.target.value);
                              clearCatError(cat.id, 'name');
                            }}
                          />
                        </Form.Item>
                        <Popconfirm
                          title='Remove this category?'
                          onConfirm={() => removeCategory(cat.id)}
                          okButtonProps={{ danger: true }}
                        >
                          <Button danger type='text' size='small'>Remove</Button>
                        </Popconfirm>
                      </div>

                      {/* ── KPI Items ────────────────────────────────── */}
                      <Droppable droppableId={cat.id} type='ITEM'>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            style={{ padding: '8px 12px' }}
                          >
                            {/* Header row */}
                            {cat.items.length > 0 && (
                              <div style={{ display: 'table', width: '100%', tableLayout: 'fixed', marginBottom: 4 }}>
                                <div style={{ display: 'table-row' }}>
                                  <div style={{ display: 'table-cell', width: 22 }} />
                                  <div style={{ display: 'table-cell', width: 28 }} />
                                  <div style={{ display: 'table-cell', paddingRight: 8 }}>
                                    <Typography.Text type='secondary' style={{ fontSize: 12 }}>KPI Name</Typography.Text>
                                  </div>
                                  <div style={{ display: 'table-cell', width: 108, paddingRight: 8 }}>
                                    <Typography.Text type='secondary' style={{ fontSize: 12 }}>Rate (%)</Typography.Text>
                                  </div>
                                  <div style={{ display: 'table-cell', width: 32 }} />
                                </div>
                              </div>
                            )}

                            {/* Item rows */}
                            {cat.items.map((item, itemIdx) => (
                              <Draggable key={item.id} draggableId={item.id} index={itemIdx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    style={{
                                      display: 'table',
                                      width: '100%',
                                      tableLayout: 'fixed',
                                      marginBottom: 2,
                                      background: snapshot.isDragging ? '#f0f5ff' : 'transparent',
                                      borderRadius: 6,
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    <div style={{ display: 'table-row' }}>
                                      <div style={{ display: 'table-cell', width: 22, verticalAlign: 'top', paddingTop: 6 }}>
                                        <span
                                          {...provided.dragHandleProps}
                                          style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 14 }}
                                        >
                                          ⠿
                                        </span>
                                      </div>
                                      <div style={{ display: 'table-cell', width: 28, verticalAlign: 'top', paddingTop: 6 }}>
                                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                                          {item.order}.
                                        </Typography.Text>
                                      </div>
                                      <div style={{ display: 'table-cell', paddingRight: 8, verticalAlign: 'top' }}>
                                        <Form.Item
                                          validateStatus={errors.categories[cat.id]?.items?.[item.id]?.name ? 'error' : ''}
                                          help={errors.categories[cat.id]?.items?.[item.id]?.name}
                                          style={{ margin: 0 }}
                                        >
                                          <Input
                                            placeholder='KPI name'
                                            value={item.name}
                                            size='small'
                                            onChange={(e) => {
                                              updateItem(cat.id, item.id, 'name', e.target.value);
                                              clearItemError(cat.id, item.id, 'name');
                                            }}
                                          />
                                        </Form.Item>
                                      </div>
                                      <div style={{ display: 'table-cell', width: 108, paddingRight: 8, verticalAlign: 'top' }}>
                                        <Form.Item
                                          validateStatus={errors.categories[cat.id]?.items?.[item.id]?.weight ? 'error' : ''}
                                          help={errors.categories[cat.id]?.items?.[item.id]?.weight}
                                          style={{ margin: 0 }}
                                        >
                                          <Input
                                            placeholder='0'
                                            value={item.weight}
                                            suffix='%'
                                            size='small'
                                            onChange={(e) => {
                                              updateItem(cat.id, item.id, 'weight', e.target.value);
                                              clearItemError(cat.id, item.id, 'weight');
                                            }}
                                          />
                                        </Form.Item>
                                      </div>
                                      <div style={{ display: 'table-cell', width: 32, verticalAlign: 'top', paddingTop: 2 }}>
                                        <Popconfirm
                                          title='Remove this KPI?'
                                          onConfirm={() => removeItem(cat.id, item.id)}
                                          okButtonProps={{ danger: true }}
                                        >
                                          <Button danger type='text' size='small'>✕</Button>
                                        </Popconfirm>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}

                            <Button
                              type='dashed'
                              size='small'
                              onClick={() => addItem(cat.id)}
                              style={{ marginTop: 4, marginLeft: 50, borderColor: '#389e0d', color: '#389e0d' }}
                            >
                              + Add KPI
                            </Button>
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Divider />

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <Space>
        <Button
          type='dashed'
          onClick={addCategory}
          style={{ borderColor: '#389e0d', color: '#389e0d' }}
        >
          + Add Category
        </Button>
        <Button
          type='primary'
          style={{ background: '#389e0d' }}
          onClick={handleSave}
        >
          Save Template
        </Button>
      </Space>
    </Card>
  );
};

export default KpiTemplatePage;