import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Spin, Button, Breadcrumb,
  Row, Col, Typography, Tag, Divider, App,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

import kpiEvaluationApi    from '../../../services/kpi/kpiEvaluationApi';
import JobPerformanceSection from './JobPerformanceSection';
import BehaviorRatingSection from './BehaviorRatingSection';
import ScoreSummary          from './ScoreSummary';

import dayjs from 'dayjs';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
};

const KpiEvaluationView = () => {
  const { id }                            = useParams();
  const navigate                          = useNavigate();
  const { message }                       = App.useApp();
  const [evaluation, setEvaluation]       = useState(null);
  const [loading,    setLoading]          = useState(true);
  const [saving,     setSaving]           = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await kpiEvaluationApi.getById(id);
        setEvaluation(data.evaluation);
      } catch {
        message.error('Failed to load evaluation.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <Spin size='large' />
    </div>
  );

  if (!evaluation) return null;

  const employee = evaluation.employee;
  const canEdit  = ['draft', 'self'].includes(evaluation.status);

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: <Link to='/kpi-evaluations'>KPI Evaluations</Link> },
          { title: 'View Evaluation' },
        ]}
      />

      <Card
        title={
          <Row align='middle' gutter={8}>
            <Col>
              <Button
                icon={<ArrowLeftOutlined />}
                type='text'
                onClick={() => navigate('/kpi-evaluations')}
              />
            </Col>
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                KPI Evaluation
              </Typography.Title>
            </Col>
            <Col>
              <Tag color={statusColors[evaluation.status]}>
                {evaluation.status?.toUpperCase()}
              </Tag>
            </Col>
          </Row>
        }
      >
        {/* Employee Info */}
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Typography.Text type='secondary'>Employee</Typography.Text>
            <div>
              <Typography.Text strong>
                {employee?.last_name}, {employee?.first_name}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type='secondary'>Position</Typography.Text>
            <div>
              <Typography.Text strong>
                {evaluation.position?.name}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Typography.Text type='secondary'>Period</Typography.Text>
            <div>
              <Typography.Text strong>
                {dayjs(evaluation.period_start).format('MM-DD-YYYY')} to {dayjs(evaluation.period_end).format('MM-DD-YYYY')}
              </Typography.Text>
            </div>
          </Col>
        </Row>

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Job Performance Section */}
        <JobPerformanceSection
          items={evaluation.evaluation_items}
          canEdit={canEdit}
          evaluationId={evaluation.id}
          onUpdated={(updated) => setEvaluation(updated)}
        />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Behavior Rating Section */}
        <BehaviorRatingSection
          ratings={evaluation.behavior_ratings}
          canEdit={canEdit}
          evaluationId={evaluation.id}
          onUpdated={(updated) => setEvaluation(updated)}
        />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Score Summary */}
        <ScoreSummary evaluation={evaluation} />

      </Card>
    </>
  );
};

export default KpiEvaluationView;