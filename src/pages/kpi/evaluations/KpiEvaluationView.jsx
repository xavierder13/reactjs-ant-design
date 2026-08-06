import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Spin, Button, Breadcrumb,
  Row, Col, Typography, Tag, Divider,
  App, Space, Popconfirm, Tabs, Tooltip,
  Modal, Input,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined,
  SyncOutlined, InfoCircleOutlined, CloseCircleOutlined 
} from '@ant-design/icons';
import useAuth           from '../../../hooks/useAuth';
import kpiEvaluationApi  from '../../../services/kpi/kpiEvaluationApi';
import JobPerformanceSection from './JobPerformanceSection';
import BehaviorRatingSection from './BehaviorRatingSection';
import ScoreSummary          from './ScoreSummary';
import handleApiError        from '../../../utils/handleApiError';
import dayjs                 from 'dayjs';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
  rejected:  'error',
};

const KpiEvaluationView = () => {
  const { id }                      = useParams();
  const navigate                    = useNavigate();
  const { message }                 = App.useApp();
  const { hasRole, hasAnyRole, hasAnyPermission, hasPermission } = useAuth();

  const [evaluation,  setEvaluation] = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [saving,      setSaving]     = useState(false);
  const [computing,   setComputing]  = useState(false);

  const [rejecting,       setRejecting]       = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resubmitting,    setResubmitting]    = useState(false);
  const [canApproveEval, setCanApproveEval] = useState(false);
  const [submitPopOpen, setSubmitPopOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await kpiEvaluationApi.getById(id);
        setEvaluation(data.evaluation);
        setCanApproveEval(data.can_approve);
        console.log(data);
        
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

  // canEdit — rejected means grades are editable
  const canEdit = (
    hasAnyPermission('kpi-evaluation-create', 'kpi-evaluation-edit') &&
    (
      evaluation.evaluation_type === 'supervisor'
        ? ['draft', 'rejected'].includes(evaluation.status)
        : ['self', 'rejected'].includes(evaluation.status)
    )
  );

  // canSubmit — only show Mark as Submitted for draft/self, NOT rejected
  const canSubmit = (
    hasAnyPermission('kpi-evaluation-create', 'kpi-evaluation-edit') &&
    (
      evaluation.evaluation_type === 'supervisor'
        ? evaluation.status === 'draft'
        : evaluation.status === 'self'
    )
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  const handleSubmitValidation = () => {
    const items   = evaluation.evaluation_items || [];
    const ratings = evaluation.behavior_ratings || [];

    // Check all actual grades filled
    const unfilledGrades = items.filter(
      (i) => i.actual_grade === null || i.actual_grade === undefined
    );

    if (unfilledGrades.length > 0) {
      message.warning(
        `Please fill in all KPI component grades. ${unfilledGrades.length} grade(s) missing.`
      );
      return false;
    }

    // Check all behavior ratings filled
    const unfilledRatings = ratings.filter(
      (r) => !r.rating || r.rating === 0
    );

    if (unfilledRatings.length > 0) {
      message.warning(
        `Please fill in all behavior ratings. ${unfilledRatings.length} rating(s) missing.`
      );
      return false;
    }

    return true;
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

  const handleCompute = async () => {
    setComputing(true);
    try {
      const { data } = await kpiEvaluationApi.compute(evaluation.id);
      if (data.success) {
        message.success(data.message);
        setEvaluation(data.evaluation);
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setComputing(false);
    }
  };

  const handleApprove = async () => {
    try {
      const { data } = await kpiEvaluationApi.approve(evaluation.id);
      if (data.success) {
        message.success(data.message);
        setEvaluation((prev) => ({ 
            ...prev, 
            status: 'approved', 
            approved_by: data.evaluation.approved_by, 
            approved_at: data.evaluation.approved_at
          })
        );
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      message.warning('Please enter a rejection reason.');
      return;
    }
    setRejecting(true);
    try {
      const { data } = await kpiEvaluationApi.reject(evaluation.id, {
        rejection_reason: rejectionReason,
      });
      if (data.success) {
        message.success(data.message);
         setEvaluation((prev) => ({
          ...prev,
          status:           'rejected',
          rejection_reason: rejectionReason,
          rejected_at:      new Date().toISOString(),
        }));
        setRejectModalOpen(false);
        setRejectionReason('');
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setRejecting(false);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      const { data } = await kpiEvaluationApi.resubmit(evaluation.id);
      if (data.success) {
        message.success(data.message);
        setEvaluation((prev) => ({ ...prev, status: 'submitted' }));
      } else {
        message.error(data.message);
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setResubmitting(false);
    }
  };

  // ── Tab Items ──────────────────────────────────────────────────────────────
  const tabItems = [

    // Self Evaluation Tab — only for evaluation_type: self
    ...(evaluation.evaluation_type === 'self' ? [{
      key:      'self',
      label:    'Self Evaluation',
      children: (
        <div>
          <JobPerformanceSection
            items={evaluation.evaluation_items}
            evaluationType='self'
            canEdit={false}
            evaluationId={evaluation.id}
            onUpdated={(updated) => setEvaluation(updated)}
            viewMode='self'
          />

          <Divider style={{ borderColor: '#b7eb8f' }} />

          <BehaviorRatingSection
            ratings={evaluation.behavior_ratings}
            evaluationType='self'
            canEdit={false}
            evaluationId={evaluation.id}
            onUpdated={(updated) => setEvaluation(updated)}
            viewMode='self'
          />

          <Divider style={{ borderColor: '#b7eb8f' }} />

          <ScoreSummary
            evaluation={evaluation}
            evaluationType='self'
            viewMode='self'
          />
        </div>
      ),
    }] : []),

    // Supervisor Evaluation Tab
    {
      key:      'supervisor',
      label:    evaluation.evaluation_type === 'self'
                  ? 'Supervisor Evaluation'
                  : 'Evaluation',
      children: (
        <div>
          {/* Compute Grades button — top of supervisor tab */}
          {canEdit && hasAnyPermission('kpi-evaluation-create', 'kpi-evaluation-edit') && (
            <Row justify='end' style={{ marginBottom: 12 }}>
              <Col>
                <Space>
                  <Button
                    icon={<SyncOutlined />}
                    loading={computing}
                    onClick={handleCompute}
                    color='green'
                    variant='outlined'
                  >
                    Compute Grades
                  </Button>
                  <Tooltip
                    title='Grades are automatically computed and saved based on registered department processes. Supervisor can still override computed values manually.'
                    placement='bottomRight'
                  >
                    <InfoCircleOutlined
                      style={{ color: '#389e0d', fontSize: 16, cursor: 'pointer' }}
                    />
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          )}

          <JobPerformanceSection
            items={evaluation.evaluation_items}
            evaluationType={evaluation.evaluation_type}
            canEdit={canEdit}
            evaluationId={evaluation.id}
            onUpdated={(updated) => setEvaluation(updated)}
            viewMode='supervisor'
          />

          <Divider style={{ borderColor: '#b7eb8f' }} />

          <BehaviorRatingSection
            ratings={evaluation.behavior_ratings}
            evaluationType={evaluation.evaluation_type}
            canEdit={canEdit}
            evaluationId={evaluation.id}
            onUpdated={(updated) => setEvaluation(updated)}
            viewMode='supervisor'
          />

          <Divider style={{ borderColor: '#b7eb8f' }} />

          <ScoreSummary
            evaluation={evaluation}
            evaluationType={evaluation.evaluation_type}
            viewMode='supervisor'
          />
        </div>
      ),
    },

  ];

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
        {/* ── Employee Info — always visible ─────────────────────────────── */}
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={5}>
            <Typography.Text type='secondary'>Employee</Typography.Text>
            <div>
              <Typography.Text strong>
                {employee?.last_name}, {employee?.first_name}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={5}>
            <Typography.Text type='secondary'>Position</Typography.Text>
            <div>
              <Typography.Text strong>
                {evaluation.position?.name}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={5}>
            <Typography.Text type='secondary'>Period</Typography.Text>
            <div>
              <Typography.Text strong>
                {dayjs(evaluation.period_start).format('MM-DD-YYYY')}
                {' to '}
                {dayjs(evaluation.period_end).format('MM-DD-YYYY')}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={4}>
            <Typography.Text type='secondary'>Evaluation Type</Typography.Text>
            <div>
              <Tag color={evaluation.evaluation_type === 'self' ? 'blue' : 'orange'}>
                {evaluation.evaluation_type === 'self' ? 'Self + Supervisor' : 'Supervisor Only'}
              </Tag>
            </div>
          </Col>
          <Col xs={24} md={5}>
            <Typography.Text type='secondary'>Created By</Typography.Text>
            <div>
              <Typography.Text strong>
                {evaluation.created_by?.name}
              </Typography.Text>
            </div>
          </Col>
          {evaluation.status === 'approved' && (
            <>
              <Col xs={24} md={5}>
                <Typography.Text type='secondary'>Approved By</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {evaluation.approved_by?.name}
                  </Typography.Text>
                </div>
              </Col>
              <Col xs={24} md={5}>
                <Typography.Text type='secondary'>Approved At</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {dayjs(evaluation.approved_at).format('MM-DD-YYYY')}
                  </Typography.Text>
                </div>
              </Col>
            </>
          )}
          {/* Rejection Reason — visible to all if rejected */}
          {evaluation.status === 'rejected' && evaluation.rejection_reason && (
            <>
              <Col xs={24} md={5}>
                <Typography.Text type='secondary'>Rejected By</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {evaluation.rejected_by?.name}
                  </Typography.Text>  
                </div>
              </Col>
              <Col xs={24} md={5}>
                <Typography.Text type='secondary'>Rejected At</Typography.Text>
                <div>
                  <Typography.Text strong>
                    {dayjs(evaluation.rejected_at).format('MM-DD-YYYY')}
                  </Typography.Text>
                </div>
              </Col>
              <Col xs={24}>
                <div style={{
                  background:   '#fff2f0',
                  border:       '1px solid #ffccc7',
                  borderRadius: 8,
                  padding:      '8px 12px',
                  marginTop:    8,
                }}>
                  <Typography.Text type='danger' strong>
                    Rejection Reason:
                  </Typography.Text>
                  <Typography.Text type='danger' style={{ marginLeft: 8 }}>
                    {evaluation.rejection_reason}
                  </Typography.Text>
                </div>
              </Col>
            </>
            
          )}
        </Row>

        <Divider style={{ borderColor: '#b7eb8f', marginTop: 0 }} />

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs
          defaultActiveKey={
            evaluation.evaluation_type === 'self' ? 'self' : 'supervisor'
          }
          items={tabItems}
        />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* ── Action Buttons — always at bottom ──────────────────────────── */}
        <Row justify='space-between' align='middle'>

          {/* Revert — Admin only */}
          {hasRole('Administrator') && (
            <Col>
              <Space>

                {evaluation.evaluation_type === 'self' && (
                  <>
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

                {evaluation.evaluation_type === 'supervisor' && (
                  <>
                    {['submitted', 'approved'].includes(evaluation.status) && (
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
                  </>
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
                open={submitPopOpen}
                onConfirm={() => {
                  setSubmitPopOpen(false);
                  handleSubmit();
                }}
                onCancel={() => setSubmitPopOpen(false)}
                okText='Yes, Submit'
                okButtonProps={{ type: 'primary' }}
              >
                <Button
                  type='primary'
                  loading={saving}
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    // validate first — only open Popconfirm if valid
                    if (handleSubmitValidation()) {
                      setSubmitPopOpen(true);
                    }
                  }}
                >
                  Mark as Submitted
                </Button>
              </Popconfirm>
            </Col>
          )}
          {/* Approve / Reject — for eligible approvers */}
          {canApproveEval && evaluation.status === 'submitted' && (
            <Col>
              <Space>
                <Popconfirm
                  title='Approve this evaluation?'
                  description='This will mark the evaluation as final and approved.'
                  onConfirm={handleApprove}
                  okText='Yes, Approve'
                  okButtonProps={{ type: 'primary' }}
                >
                  <Button type='primary' icon={<CheckCircleOutlined />}>
                    Approve
                  </Button>
                </Popconfirm>

                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => setRejectModalOpen(true)}
                >
                  Reject
                </Button>
              </Space>
            </Col>
          )}

          {/* Resubmit — for supervisor after rejection */}
          {(evaluation.status === 'rejected' &&  hasAnyPermission('kpi-evaluation-create', 'kpi-evaluation-edit')) && (
            <Col>
              <Popconfirm
                title='Resubmit this evaluation?'
                description='This will send the evaluation back for approval.'
                onConfirm={handleResubmit}
                okText='Yes, Resubmit'
                okButtonProps={{ type: 'primary' }}
              >
                <Button
                  type='primary'
                  loading={resubmitting}
                  icon={<CheckCircleOutlined />}
                >
                  Resubmit for Approval
                </Button>
              </Popconfirm>
            </Col>
          )}

          {/* Rejection Modal */}
          <Modal
            title='Reject Evaluation'
            open={rejectModalOpen}
            onCancel={() => {
              setRejectModalOpen(false);
              setRejectionReason('');
            }}
            footer={[
              <Button key='cancel' onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>,
              <Button
                key='reject'
                danger
                loading={rejecting}
                onClick={handleReject}
              >
                Confirm Reject
              </Button>,
            ]}
          >
            <Typography.Paragraph type='secondary'>
              Please provide a reason for rejecting this evaluation.
              This will be visible to the supervisor and employee.
            </Typography.Paragraph>
            <Input.TextArea
              rows={4}
              placeholder='Enter rejection reason...'
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              // showCount
            />
          </Modal>
        </Row>
      </Card>
    </>
  );
};

export default KpiEvaluationView;