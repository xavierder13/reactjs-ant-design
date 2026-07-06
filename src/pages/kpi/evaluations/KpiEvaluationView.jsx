import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Spin, Button, Breadcrumb,
  Row, Col, Typography, Tag, Divider, App,
  Popconfirm, Space
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';
import kpiEvaluationApi    from '../../../services/kpi/kpiEvaluationApi';
import JobPerformanceSection from './JobPerformanceSection';
import BehaviorRatingSection from './BehaviorRatingSection';
import ScoreSummary          from './ScoreSummary';
import handleApiError from '../../../utils/handleApiError';

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
  const { hasRole }                       = useAuth();
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
  const canEdit = (
    evaluation.evaluation_type === 'supervisor'
      ? evaluation.status === 'draft'
      : evaluation.status === 'self'
  );

  // Supervisor can submit when:
  // evaluation_type: supervisor → status is draft (after saving grades)
  // evaluation_type: self       → status is self (after employee self-evaluated)
  const canSubmit = (
    evaluation.evaluation_type === 'supervisor'
      ? evaluation.status === 'draft'
      : evaluation.status === 'self'
  );


  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data } = await kpiEvaluationApi.submit(evaluation.id);
      if (data.success) {
        message.success(data.message);
        setEvaluation((prev) => ({ ...prev, status: 'submitted' }));
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (revertType) => {
    try {
      const { data } = await kpiEvaluationApi.revert(evaluation.id, {
        revert_type: revertType,
      });
      if (data.success) {
        message.success(data.message);
        setEvaluation(data.evaluation);
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    }
  };

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
          <Col xs={24} md={6}>
            <Typography.Text type='secondary'>Employee</Typography.Text>
            <div>
              <Typography.Text strong>
                {employee?.last_name}, {employee?.first_name}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type='secondary'>Position</Typography.Text>
            <div>
              <Typography.Text strong>
                {evaluation.position?.name}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type='secondary'>Period</Typography.Text>
            <div>
              <Typography.Text strong>
                {dayjs(evaluation.period_start).format('MM-DD-YYYY')} to {dayjs(evaluation.period_end).format('MM-DD-YYYY')}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type='secondary'>Evaluation Type</Typography.Text>
            <div>
              <Tag color={evaluation.evaluation_type === 'self' ? 'blue' : 'orange'}>
                {evaluation.evaluation_type === 'self' ? 'Self + Supervisor' : 'Supervisor Only'}
              </Tag>
            </div>
          </Col>
        </Row>

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Job Performance Section */}
        <JobPerformanceSection
          items={evaluation.evaluation_items}
          evaluationType={evaluation.evaluation_type}
          canEdit={canEdit}
          evaluationId={evaluation.id}
          onUpdated={(updated) => setEvaluation(updated)}
        />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Behavior Rating Section */}
        <BehaviorRatingSection
          ratings={evaluation.behavior_ratings}
          evaluationType={evaluation.evaluation_type}
          canEdit={canEdit}
          evaluationId={evaluation.id}
          onUpdated={(updated) => setEvaluation(updated)}
        />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Score Summary */}
        <ScoreSummary evaluation={evaluation} />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Action Buttons */}
        <Row justify='space-between' align='middle'>

          {/* Revert — Admin only */}
          {hasRole('Administrator') && (
            <Col>
              <Space>

                {/* evaluation_type: self */}
                {evaluation.evaluation_type === 'self' && (

                  <>
                    {/* show only revert self if status is self */}
                    {evaluation.status === 'self' && (
                      <Popconfirm
                        title='Revert self grades?'
                        description='This will clear all self grades and reset status to draft.'
                        onConfirm={() => handleRevert('self')}
                        okButtonProps={{ danger: true }}
                        okText='Revert'
                      >
                        <Button danger size='small'>Revert Self Grades</Button>
                      </Popconfirm>
                    )}

                    {/* show revert supervisor and revert all if status is submitted or approved */}
                    {['submitted', 'approved'].includes(evaluation.status) && (
                      <>
                        <Popconfirm
                          title='Revert supervisor grades?'
                          description='This will clear supervisor grades and reset status to self.'
                          onConfirm={() => handleRevert('supervisor')}
                          okButtonProps={{ danger: true }}
                          okText='Revert'
                        >
                          <Button danger size='small'>Revert Supervisor Grades</Button>
                        </Popconfirm>

                        <Popconfirm
                          title='Revert everything?'
                          description='This will clear ALL grades and reset status to draft.'
                          onConfirm={() => handleRevert('all')}
                          okButtonProps={{ danger: true }}
                          okText='Revert All'
                        >
                          <Button danger size='small'>Revert All</Button>
                        </Popconfirm>
                      </>
                    )}
                  </>

                )}

                {/* evaluation_type: supervisor */}
                {evaluation.evaluation_type === 'supervisor' && (
                  <Popconfirm
                    title='Revert rating?'
                    description='This will clear all supervisor grades and reset status to draft.'
                    onConfirm={() => handleRevert('supervisor')}
                    okButtonProps={{ danger: true }}
                    okText='Revert'
                  >
                    <Button danger size='small'>Revert Rating</Button>
                  </Popconfirm>
                )}

              </Space>
            </Col>
          )}

          {/* Mark as Submitted */}
          {canSubmit && (
            <Col>
              <Popconfirm
                title='Mark as Submitted?'
                description='Once submitted, grades cannot be edited. Only an Administrator can revert this evaluation.'
                onConfirm={handleSubmit}
                okText='Yes, Submit'
                okButtonProps={{ type: 'primary' }}
              >
                <Button
                  type='primary'
                  loading={saving}
                  icon={<CheckCircleOutlined />}
                >
                  Mark as Submitted
                </Button>
              </Popconfirm>
            </Col>
          )}

        </Row>
      </Card>
    </>
  );
};

export default KpiEvaluationView;