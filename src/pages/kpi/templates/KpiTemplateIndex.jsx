import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Space, Tag, Popconfirm,
  Tooltip, Input, Form, Breadcrumb,
} from 'antd';
import {
  PlusOutlined, EditOutlined,
  StopOutlined, ReloadOutlined, SearchOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { App } from 'antd';

import kpiTemplateApi       from '../../../services/kpi/kpiTemplateApi';
import useKpiTemplateStore  from '../../../store/kpiTemplateStore';
import useAuth              from '../../../hooks/useAuth';

const KpiTemplateIndex = () => {
  const navigate                              = useNavigate();
  const { message }                           = App.useApp();
  const { hasPermission }                     = useAuth();
  const { templates, fetchTemplates,
          refreshTemplates, isLoading }       = useKpiTemplateStore();

  const [searchForm]  = Form.useForm();
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    // fetchTemplates();
    refreshTemplates();
  }, []);

  useEffect(() => {
    setFiltered(templates);
  }, [templates]);

  const handleSearch = () => {
    const { search } = searchForm.getFieldsValue();
    if (!search) return setFiltered(templates);
    setFiltered(
      templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.position?.name.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const handleDeactivate = async (id) => {
    try {
      await kpiTemplateApi.deactivate(id);
      message.success('Template deactivated.');
      refreshTemplates();
    } catch {
      message.error('Failed to deactivate template.');
    }
  };

  const columns = [
    {
      title:     'Template Name',
      dataIndex: 'name',
      key:       'name',
    },
    {
      title:     'Position',
      dataIndex: 'position',
      key:       'position',
      render:    (position) => position?.name || '-',
    },
    {
      title:     'Components',
      dataIndex: 'items',
      key:       'items',
      render:    (items) => items?.length || 0,
    },
    {
      title:     'Status',
      dataIndex: 'is_active',
      key:       'is_active',
      render:    (val) => (
        <Tag color={val ? 'success' : 'default'}>
          {val ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title:  'Actions',
      key:    'actions',
      render: (_, record) => (
        <Space>
          {hasPermission('kpi-template-edit') && (
            <Tooltip title='Edit'>
              <Button
                color='green'
                variant='outlined'
                icon={<EditOutlined />}
                size='small'
                onClick={() => navigate(`/kpi-templates/${record.id}/edit`)}
              />
            </Tooltip>
          )}
          {hasPermission('kpi-template-delete') && record.is_active && (
            <Popconfirm
              title='Deactivate this template?'
              onConfirm={() => handleDeactivate(record.id)}
              okButtonProps={{ danger: true }}
            >
              <Tooltip title='Deactivate'>
                <Button danger icon={<StopOutlined />} size='small' />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: 'KPI Templates' },
        ]}
      />

      <Card
        title={
          <Row gutter={[8, 8]} align='middle'>
            <Col xs={24} md={6}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                KPI Templates
              </Typography.Title>
            </Col>

            <Col xs={24} md={8}>
              <Form form={searchForm}>
                <Form.Item name='search' style={{ marginBottom: 0 }}>
                  <Input
                    placeholder='Search template or position...'
                    prefix={<SearchOutlined />}
                    onPressEnter={handleSearch}
                  />
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} md={6}>
              <Space wrap>
                <Button
                  color='primary'
                  variant='outlined'
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
                  Search
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={refreshTemplates}
                >
                  Refresh
                </Button>
              </Space>
            </Col>

            {hasPermission('kpi-template-create') && (
              <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/kpi-templates/create')}
                >
                  Add Template
                </Button>
              </Col>
            )}
          </Row>
        }
      >
        <Table
          rowKey='id'
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          size='small'
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </>
  );
};

export default KpiTemplateIndex;