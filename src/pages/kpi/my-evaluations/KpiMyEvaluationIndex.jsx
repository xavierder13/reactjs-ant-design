import { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Button,
  Table, Tag, Breadcrumb, App,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';

import dayjs from 'dayjs';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
};

const KpiMyEvaluationIndex = () => {
  const navigate                              = useNavigate();
  const { message }                           = App.useApp();
  const { hasRole }                           = useAuth();
  const [evaluations, setEvaluations]         = useState([]);
  const [loading,     setLoading]             = useState(false);

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

  const columns = [
    ...(hasRole('Administrator') ? [{
      title:  'Employee',
      key:    'employee',
      render: (_, record) => record.employee
        ? `${record.employee.last_name}, ${record.employee.first_name}`
        : '-',
    }] : []),
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
      title:     'Position',
      key:       'position_name',
      dataIndex: 'position_name',
      render:    (val) => val || '-',
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
        <Table
          rowKey='id'
          columns={columns}
          dataSource={evaluations}
          loading={loading}
          size='small'
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </>
  );
};

export default KpiMyEvaluationIndex;