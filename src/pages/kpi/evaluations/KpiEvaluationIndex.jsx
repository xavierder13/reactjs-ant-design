import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Space, Tag, Tooltip,
  Input, Form, Breadcrumb, Select,
  Popconfirm
} from 'antd';
import {
  PlusOutlined, EyeOutlined,
  ReloadOutlined, SearchOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { App } from 'antd';

import kpiEvaluationApi      from '../../../services/kpi/kpiEvaluationApi';
import useKpiEvaluationStore from '../../../store/kpiEvaluationStore';
import useAuth               from '../../../hooks/useAuth';

import dayjs from 'dayjs';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
};

const KpiEvaluationIndex = () => {
  const navigate                                    = useNavigate();
  const { message }                                 = App.useApp();
  const { hasPermission }                           = useAuth();
  const { evaluations, fetchEvaluations, refreshEvaluations, isLoading } = useKpiEvaluationStore();

  const [searchForm] = Form.useForm();
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    // fetchEvaluations();
    refreshEvaluations();
  }, []);

  useEffect(() => {
    setFiltered(evaluations);
  }, [evaluations]);

  const handleSearch = () => {
    const { search, status } = searchForm.getFieldsValue();
    let result = [...evaluations];

    if (search) {
      result = result.filter((e) =>
        e.employee?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.employee?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.employee?.employee_code?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status) {
      result = result.filter((e) => e.status === status);
    }

    setFiltered(result);
  };

  const handleReset = () => {
    searchForm.resetFields();
    setFiltered(evaluations);
  };

  const handleDelete = async (id) => {
    try {
      const { data } = await kpiEvaluationApi.delete(id);
      if (data.success) {
        message.success(data.message);
        refreshEvaluations();
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const columns = [
    {
      title:     'Employee',
      key:       'employee',
      render:    (_, record) => record.employee
        ? `${record.employee.last_name}, ${record.employee.first_name}`
        : '-',
    },
    {
      title:     'Position',
      key:       'position',
      render:    (_, record) => record.position?.name || '-',
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => {
          const start = record.period_start
          ? dayjs(record.period_start).format('MM-DD-YYYY')
          : '-';

          const end = record.period_end
          ? dayjs(record.period_end).format('MM-DD-YYYY')
          : '-';

          return `${start} to ${end}`;
      },
    },
    {
      title:     'Type',
      dataIndex: 'evaluation_type',
      key:       'evaluation_type',
      render:    (val) => (
        <Tag color={val === 'self' ? 'blue' : 'orange'}>
          {val === 'self' ? 'Self + Supervisor' : 'Supervisor Only'}
        </Tag>
      ),
    },
    {
      title:     'Status',
      dataIndex: 'status',
      key:       'status',
      render:    (val) => (
        <Tag color={statusColors[val] || 'default'}>
          {val?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title:     'Final Score',
      dataIndex: 'final_score',
      key:       'final_score',
      render:    (val) => val ? `${val}%` : '-',
    },
    {
      title:  'Actions',
      key:    'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title='View'>
            <Button
              color='green'
              variant='outlined'
              icon={<EyeOutlined />}
              size='small'
              onClick={() => navigate(`/kpi-evaluations/${record.id}`)}
            />
          </Tooltip>
          {record.status === 'draft' && hasPermission('kpi-evaluation-delete') && (
            <Popconfirm
              title='Delete this evaluation?'
              description='This action cannot be undone.'
              onConfirm={() => handleDelete(record.id)}
              okButtonProps={{ danger: true }}
              okText='Delete'
            >
              <Tooltip title='Delete'>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  size='small'
                />
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
          { title: 'KPI Evaluations' },
        ]}
      />

      <Card
        title={
          <Row gutter={[8, 8]} align='middle'>
            <Col xs={24} md={5}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                KPI Evaluations
              </Typography.Title>
            </Col>

            <Col xs={24} md={6}>
              <Form form={searchForm}>
                <Form.Item name='search' style={{ marginBottom: 0 }}>
                  <Input
                    placeholder='Search employee...'
                    prefix={<SearchOutlined />}
                    onPressEnter={handleSearch}
                  />
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} md={4}>
              <Form form={searchForm}>
                <Form.Item name='status' style={{ marginBottom: 0 }}>
                  <Select
                    placeholder='Filter by status'
                    allowClear
                    style={{ width: '100%' }}
                    options={[
                      { label: 'Draft',     value: 'draft' },
                      { label: 'Self',      value: 'self' },
                      { label: 'Reviewed',  value: 'reviewed' },
                      { label: 'Submitted', value: 'submitted' },
                      { label: 'Approved',  value: 'approved' },
                    ]}
                    onChange={handleSearch}
                  />
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} md={5}>
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
                  onClick={() => {
                    handleReset();
                    fetchEvaluations();
                  }}
                >
                  Refresh
                </Button>
              </Space>
            </Col>

            {hasPermission('kpi-evaluation-create') && (
              <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/kpi-evaluations/create')}
                >
                  Create
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

export default KpiEvaluationIndex;