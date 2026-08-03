import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Tag, Breadcrumb, App, Tabs,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';
import useAuth from '../../../hooks/useAuth';
import dayjs from 'dayjs';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
  rejected:  'error',
};

const KpiMyEvaluationIndex = () => {
  const navigate                      = useNavigate();
  const { message }                   = App.useApp();
  const { hasRole }                   = useAuth();
  const [evaluations, setEvaluations] = useState([]);
  const [loading,     setLoading]     = useState(false);

  const fetchMyEvaluations = async () => {
    setLoading(true);
    try {
      const { data } = await kpiEvaluationApi.getMyEvaluations();
      setEvaluations(data.evaluations);
    } catch {
      message.error('Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvaluations();
  }, []);

  // split evaluations by type
  const selfEvaluations       = evaluations.filter((e) => e.evaluation_type === 'self');
  const supervisorEvaluations = evaluations.filter((e) => e.evaluation_type === 'supervisor');

  // ── Shared columns ─────────────────────────────────────────────────────────
  const periodColumn = {
    title:  'Period',
    key:    'period',
    render: (_, record) => {
      const start = record.period_start
        ? dayjs(record.period_start).format('MM-DD-YYYY')
        : '-';
      const end = record.period_end
        ? dayjs(record.period_end).format('MM-DD-YYYY')
        : '-';
      return `${start} to ${end}`;
    },
  };

  const positionColumn = {
    title:     'Position',
    key:       'position_name',
    dataIndex: 'position_name',
    render:    (val) => val || '-',
  };

  const statusColumn = {
    title:     'Status',
    dataIndex: 'status',
    key:       'status',
    render:    (val) => (
      <Tag color={statusColors[val] || 'default'}>
        {val?.toUpperCase()}
      </Tag>
    ),
  };

  const finalScoreColumn = {
    title:     'Final Score',
    dataIndex: 'final_score',
    key:       'final_score',
    render:    (val) => val ? `${val}%` : '-',
  };

  const employeeColumn = {
    title:  'Employee',
    key:    'employee',
    render: (_, record) => record.employee
      ? `${record.employee.last_name}, ${record.employee.first_name}`
      : '-',
  };

  // ── Self Evaluation columns ────────────────────────────────────────────────
  const selfColumns = [
    ...(hasRole('Administrator') ? [employeeColumn] : []),
    periodColumn,
    positionColumn,
    statusColumn,
    finalScoreColumn,
    {
      title:  'Actions',
      key:    'actions',
      render: (_, record) => (
        <Button
          color='green'
          variant='outlined'
          icon={<EyeOutlined />}
          size='small'
          onClick={() => navigate(`/my-evaluations/${record.id}`)}
        >
          {record.status === 'draft' ? 'Fill Evaluation' : 'View'}
        </Button>
      ),
    },
  ];

  // ── Supervisor Evaluation columns ──────────────────────────────────────────
  const supervisorColumns = [
    ...(hasRole('Administrator') ? [employeeColumn] : []),
    periodColumn,
    positionColumn,
    statusColumn,
    finalScoreColumn,
    {
      title:  'Actions',
      key:    'actions',
      render: (_, record) => (
        <Button
          color='green'
          variant='outlined'
          icon={<EyeOutlined />}
          size='small'
          onClick={() => navigate(`/my-evaluations/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  // ── Tab Items ──────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key:      'self',
      label:    `My Self Evaluations (${selfEvaluations.length})`,
      children: (
        <Table
          rowKey='id'
          columns={selfColumns}
          dataSource={selfEvaluations}
          loading={loading}
          size='small'
          scroll={{ x: 'max-content' }}
        />
      ),
    },
    {
      key:      'supervisor',
      label:    `My Performance Records (${supervisorEvaluations.length})`,
      children: (
        <Table
          rowKey='id'
          columns={supervisorColumns}
          dataSource={supervisorEvaluations}
          loading={loading}
          size='small'
          scroll={{ x: 'max-content' }}
        />
      ),
    },
  ];

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: 'My Evaluations' },
        ]}
      />

      <Card
        title={
          <Row gutter={[8, 8]} align='middle'>
            <Col xs={24} md={20}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                My KPI Evaluations
              </Typography.Title>
            </Col>
            <Col xs={24} md={4} style={{ textAlign: 'right' }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchMyEvaluations}
              >
                Refresh
              </Button>
            </Col>
          </Row>
        }
      >
        <Tabs
          defaultActiveKey='self'
          items={tabItems}
        />
      </Card>
    </>
  );
};

export default KpiMyEvaluationIndex;