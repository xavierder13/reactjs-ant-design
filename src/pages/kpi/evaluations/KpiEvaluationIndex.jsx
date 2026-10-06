import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Space, Tag, Tooltip,
  Input, Form, Breadcrumb, Select,
  Popconfirm
} from 'antd';
import {
  PlusOutlined, EyeOutlined,
  ReloadOutlined, SearchOutlined, ClearOutlined,
  DeleteOutlined, PrinterOutlined 
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { App } from 'antd';

import kpiEvaluationApi      from '../../../services/kpi/kpiEvaluationApi';
import useKpiEvaluationStore from '../../../store/kpiEvaluationStore';
import useAuth               from '../../../hooks/useAuth';
import handleApiError        from '../../../utils/handleApiError';

import { formatDate } from '../../../utils/formatDate';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
  rejected:  'error',
};

const KpiEvaluationIndex = () => {
  const navigate                                    = useNavigate();
  const { message }                                 = App.useApp();
  const { hasPermission, hasRole }                  = useAuth();
  // Product rule: the Administrator can do every action
  const isAdmin = hasRole('Administrator');
  const { evaluations, fetchEvaluations, refreshEvaluations, isLoading } = useKpiEvaluationStore();

  const [searchForm] = Form.useForm();
  const [filtered, setFiltered] = useState([]);
  const filterValues     = Form.useWatch([], searchForm) || {};
  const hasActiveFilters = Boolean(filterValues.search || filterValues.status || filterValues.position_id || filterValues.branch_id);

  useEffect(() => {
    // fetchEvaluations();
    refreshEvaluations();
  }, []);

  useEffect(() => {
    setFiltered(evaluations);
  }, [evaluations]);

  // Position / branch filter options from the loaded evaluations
  const uniqueOptions = (pairs) => [...new Map(pairs.filter(([id]) => id).map(([id, name]) => [id, name])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  const positionOptions = uniqueOptions(evaluations.map((e) => [e.position_id, e.position?.name]));
  const branchOptions   = uniqueOptions(evaluations.map((e) => [e.employee?.branch?.id, e.employee?.branch?.name]));

  const handleSearch = () => {
    const { search, status, position_id, branch_id } = searchForm.getFieldsValue();
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

    if (position_id) {
      result = result.filter((e) => e.position_id === position_id);
    }

    if (branch_id) {
      result = result.filter((e) => e.employee?.branch?.id === branch_id);
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
          const start = formatDate(record.period_start);
          const end = formatDate(record.period_end);

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
              color='blue'
              variant='outlined'
              icon={<EyeOutlined />}
              size='small'
              onClick={() => navigate(`/kpi-evaluations/${record.id}`)}
            />
          </Tooltip>
          {record.status === 'draft' && (isAdmin || hasPermission('kpi-evaluation-delete')) && (
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
          {(isAdmin || hasPermission('kpi-evaluation-print')) && (
            <Tooltip title='Print'>
              <Button
                color='purple'
                variant='outlined'
                icon={<PrinterOutlined />}
                size='small'
                onClick={() => window.open(`/kpi-evaluations/${record.id}/print`, '_blank')}
              />
            </Tooltip>
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
          // Same layout as the Employee Master Data list: title left,
          // page-level actions right, filters in their own row below.
          <Row justify='space-between' align='middle' gutter={[8, 8]} wrap>
            <Col flex='none'>
              <Typography.Title level={4} style={{ margin: 0 }}>
                KPI Evaluations
              </Typography.Title>
            </Col>

            <Col flex='none'>
              <Space wrap>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    handleReset();
                    refreshEvaluations();
                  }}
                >
                  Refresh
                </Button>

                {(isAdmin || hasPermission('kpi-evaluation-create')) && (
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/kpi-evaluations/create')}
                  >
                    Create
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        }
      >
        {/* One wrapping, left-aligned filter row (same as Employee Master
            Data): search, status, branch, position. Every filter applies on
            change, so there's no Search button. */}
        <Form form={searchForm}>
          <Space wrap align='end' style={{ marginBottom: 16 }}>
            <Form.Item name='search' style={{ marginBottom: 0 }}>
              <Input
                allowClear
                placeholder='Search employee...'
                prefix={<SearchOutlined />}
                style={{ width: 280 }}
                onChange={handleSearch}
              />
            </Form.Item>

            <Form.Item name='status' style={{ marginBottom: 0 }}>
              <Select
                allowClear
                placeholder='Status'
                style={{ width: 140 }}
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

            <Form.Item name='branch_id' style={{ marginBottom: 0 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp='label'
                placeholder='Branch'
                style={{ width: 200 }}
                options={branchOptions}
                onChange={handleSearch}
              />
            </Form.Item>

            <Form.Item name='position_id' style={{ marginBottom: 0 }}>
              <Select
                allowClear
                showSearch
                optionFilterProp='label'
                placeholder='Position'
                style={{ width: 220 }}
                popupMatchSelectWidth={false}
                options={positionOptions}
                onChange={handleSearch}
              />
            </Form.Item>

            {hasActiveFilters && (
              <Button icon={<ClearOutlined />} onClick={handleReset}>
                Clear filters
              </Button>
            )}
          </Space>
        </Form>

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