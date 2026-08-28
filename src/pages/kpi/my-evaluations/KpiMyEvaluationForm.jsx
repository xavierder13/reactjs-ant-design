import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Spin, Button, Breadcrumb,
  Row, Col, Typography, Tag,
  Table, InputNumber, Rate,
  Divider, App, Space, Tooltip
} from 'antd';
import { ArrowLeftOutlined, SendOutlined, PrinterOutlined } from '@ant-design/icons';

import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';
import handleApiError   from '../../../utils/handleApiError';
import DemeritSection from '../evaluations/DemeritSection';
import useAuth           from '../../../hooks/useAuth';

import dayjs from 'dayjs';

const statusColors = {
  draft:     'default',
  self:      'processing',
  reviewed:  'warning',
  submitted: 'blue',
  approved:  'success',
  rejected:  'error',
};

const ratingLabels = {
  1: 'Unsatisfactory',
  2: 'Inconsistent',
  3: 'Effective',
  4: 'Strong',
  5: 'Exemplary',
};

const KpiMyEvaluationForm = () => {
  const { id }                              = useParams();
  const navigate                            = useNavigate();
  const { message }                         = App.useApp();

  const { hasRole, hasAnyRole, hasAnyPermission, hasPermission } = useAuth();

  const [evaluation,  setEvaluation]        = useState(null);
  const [loading,     setLoading]           = useState(true);
  const [saving,      setSaving]            = useState(false);
  const [selfGrades,  setSelfGrades]        = useState({});
  const [selfRatings, setSelfRatings]       = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await kpiEvaluationApi.getMyEvaluationById(id);
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

 // can only self evaluate if:
  // 1. evaluation type is self (not supervisor only)
  // 2. status is draft
  const canSelfEvaluate = (
    evaluation.evaluation_type === 'self' &&
    evaluation.status === 'draft'
  );
  const items           = evaluation.evaluation_items || [];
  const ratings         = evaluation.behavior_ratings || [];

  // ── Grade helpers ──────────────────────────────────────────────────────────
  const getSelfGrade = (item) =>
    selfGrades[item.kpi_template_item_id] ?? item.self_grade ?? null;

  const getSelfRating = (rating) =>
    selfRatings[rating.kpi_behavior_criteria_id] ?? rating.self_rating ?? 0;

  const getFinalScore = (item) => {
    const grade  = getSelfGrade(item);
    const weight = item.template_item?.weight || 0;
    if (grade === null || grade === undefined) return '-';
    return ((grade * weight) / 100).toFixed(2);
  };

  // ── Job performance score preview ──────────────────────────────────────────
  const jobScorePreview = items.reduce((sum, item) => {
    const grade  = getSelfGrade(item) || 0;
    const weight = item.template_item?.weight || 0;
    return sum + (grade * weight) / 100;
  }, 0);

  // ── Behavior score preview ─────────────────────────────────────────────────
  const filledRatings    = ratings.filter((r) => getSelfRating(r) > 0);
  const behaviorPreview  = filledRatings.length > 0
    ? filledRatings.reduce((sum, r) => sum + getSelfRating(r), 0) / filledRatings.length
    : 0;

  const finalPreview = jobScorePreview + behaviorPreview;

  // ── Submit self evaluation ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validate all items filled
    const unfilledItems = items.filter(
      (i) => getSelfGrade(i) === null || getSelfGrade(i) === undefined
    );
    if (unfilledItems.length > 0) {
      message.warning('Please fill in all KPI component grades before submitting.');
      return;
    }

    // Validate all ratings filled
    const unfilledRatings = ratings.filter((r) => getSelfRating(r) === 0);
    if (unfilledRatings.length > 0) {
      message.warning('Please rate all behavior criteria before submitting.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        items: items.map((item) => ({
          kpi_template_item_id: item.kpi_template_item_id,
          self_grade:           getSelfGrade(item),
        })),
        behavior_ratings: ratings.map((r) => ({
          kpi_behavior_criteria_id: r.kpi_behavior_criteria_id,
          self_rating:              getSelfRating(r),
        })),
      };

      const { data } = await kpiEvaluationApi.selfEvaluate(id, payload);

      if (data.success) {
        message.success('Self evaluation submitted successfully.');
        setEvaluation(data.evaluation);
      } else {
        message.error(data.message || 'Failed to submit evaluation.');
      }
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const jobColumns = [
    {
      title:  'Code',
      key:    'code',
      width:  60,
      render: (_, record) => record.template_item?.component_code || '-',
    },
    {
      title:  'KPI Component',
      key:    'name',
      render: (_, record) => record.template_item?.component_name || '-',
    },
    {
      title:  'Weight',
      key:    'weight',
      width:  80,
      render: (_, record) => `${record.template_item?.weight || 0}%`,
    },
    // Show self grade if evaluation type is 'self'
    ...(evaluation.evaluation_type === 'self' ? [
      {
        title:  'Self Grade',
        key:    'self_grade',
        width:  130,
        render: (_, record) => canSelfEvaluate
          ? (
            <InputNumber
              min={0}
              max={100}
              value={getSelfGrade(record)}
              onChange={(val) =>
                setSelfGrades((prev) => ({
                  ...prev,
                  [record.kpi_template_item_id]: val,
                }))
              }
              suffix='%'
              size='small'
              style={{ width: 100 }}
            />
          )
          : `${record.self_grade ?? '-'}%`,
      },
      {
        title:  'Self Final Score',
        key:    'self_final_score',
        width:  110,
        render: (_, record) => getFinalScore(record),
      }
    ] : []),
    // show supervisor grades only if status is past self
    ...(['submitted', 'approved', 'rejected'].includes(evaluation.status) ? [
      {
        title:  'Supervisor Grade',
        key:    'actual_grade',
        width:  130,
        render: (_, record) => record.actual_grade !== null
          ? `${record.actual_grade}%`
          : <Tag color='default'>Not graded</Tag>,
      },
      {
        title:  'Final Score',
        key:    'final_score',
        width:  110,
        render: (_, record) => record.final_score !== null
          ? record.final_score
          : '-',
      },
    ] : []),
  ];

  const behaviorColumns = [
    {
      title:  '#',
      key:    'sort_order',
      width:  40,
      render: (_, record) => record.criteria?.sort_order || '-',
    },
    {
      title:  'Criteria',
      key:    'criteria',
      render: (_, record) => (
        <div>
          <Typography.Text strong>
            {record.criteria?.criteria_name}
          </Typography.Text>
          <div>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              {record.criteria?.description}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    ...(evaluation.evaluation_type === 'self' ? [
      {
        title:  'Self Rating',
        key:    'self_rating',
        width:  200,
        render: (_, record) => canSelfEvaluate
          ? (
            <div>
              <Rate
                count={5}
                value={getSelfRating(record)}
                onChange={(val) =>
                  setSelfRatings((prev) => ({
                    ...prev,
                    [record.kpi_behavior_criteria_id]: val,
                  }))
                }
              />
              {getSelfRating(record) > 0 && (
                <div>
                  <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                    {ratingLabels[getSelfRating(record)]}
                  </Typography.Text>
                </div>
              )}
            </div>
          )
          : (
            <div>
              <Rate disabled value={record.self_rating || 0} count={5} />
              {record.self_rating > 0 && (
                <div>
                  <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                    {ratingLabels[record.self_rating]}
                  </Typography.Text>
                </div>
              )}
            </div>
          ),
      },
    ] : []),
    // show supervisor rating only if status is past self
    ...(['submitted', 'approved', 'rejected'].includes(evaluation.status) ? [
      {
        title:  'Supervisor Rating',
        key:    'rating',
        width:  200,
        render: (_, record) => record.rating
          ? (
            <div>
              <Rate disabled value={record.rating} count={5} />
              <div>
                <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                  {ratingLabels[record.rating]}
                </Typography.Text>
              </div>
            </div>
          )
          : <Tag color='default'>Not rated</Tag>,
      },
    ] : []),
  ];

  return (
    <>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to='/'>Home</Link> },
          { title: <Link to='/my-evaluations'>My Evaluations</Link> },
          { title: 'Fill Evaluation' },
        ]}
      />

      <Card
        title={
          <Row align='middle' gutter={8}>
            <Col>
              <Button
                icon={<ArrowLeftOutlined />}
                type='text'
                onClick={() => navigate('/my-evaluations')}
              />
            </Col>
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Self Evaluation
              </Typography.Title>
            </Col>
            <Col>
              <Tag color={statusColors[evaluation.status]}>
                {evaluation.status?.toUpperCase()}
              </Tag>
            </Col>
          </Row>
        }
        extra={
          <Space>
            {hasPermission('kpi-evaluation-print') && (
              <Button
                icon={<PrinterOutlined />}
                onClick={() => window.open(`/kpi-evaluations/${evaluation.id}/print`, '_blank')}
              >
                Print
              </Button>
            )}
            {canSelfEvaluate && (
              <Button
                type='primary'
                icon={<SendOutlined />}
                loading={saving}
                onClick={handleSubmit}
              >
                Submit Self Evaluation
              </Button>
            )}
          </Space>
        }
      >
        {/* Employee Info */}
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={5}>
            <Typography.Text type='secondary'>Employee</Typography.Text>
            <div>
              <Typography.Text strong>
                {evaluation.employee
                  ? `${evaluation.employee.last_name}, ${evaluation.employee.first_name}`
                  : '-'}
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
                {dayjs(evaluation.period_start).format('MM-DD-YYYY')} to {dayjs(evaluation.period_end).format('MM-DD-YYYY')}
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

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Job Performance */}
        <Typography.Text strong style={{ fontSize: 15 }}>
          Job Performance
        </Typography.Text>

        <Table
          rowKey='kpi_template_item_id'
          columns={jobColumns}
          dataSource={items}
          pagination={false}
          size='small'
          style={{ marginTop: 12, marginBottom: 24 }}
        />

        {/* Demerit — only if has demerit ratings */}
        {evaluation.demerit_ratings?.length > 0 && (
          <>
            <Divider style={{ borderColor: '#ffd591' }} />
            <DemeritSection
              ratings={evaluation.demerit_ratings}
              canEdit={canSelfEvaluate}
              evaluationId={evaluation.id}
              evaluationType={evaluation.evaluation_type}
              onUpdated={(updated) => setEvaluation(updated)}
              viewMode='self'
              maxDemerit={5}
            />
          </>
        )}

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Behavior Rating */}
        <Typography.Text strong style={{ fontSize: 15 }}>
          Work Personality / Behavior
        </Typography.Text>

        <Typography.Paragraph type='secondary' style={{ marginTop: 4, fontSize: 12 }}>
          Rate yourself on a scale of 1 to 5:
          5 - Exemplary, 4 - Strong, 3 - Effective, 2 - Inconsistent, 1 - Unsatisfactory
        </Typography.Paragraph>

        <Table
          rowKey='kpi_behavior_criteria_id'
          columns={behaviorColumns}
          dataSource={ratings}
          pagination={false}
          size='small'
          style={{ marginBottom: 24 }}
        />

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* Score Preview */}
        <Typography.Text strong style={{ fontSize: 15 }}>
          {['submitted', 'approved', 'rejected'].includes(evaluation.status)
            ? 'Final Score Summary'
            : 'Score Preview'
          }
        </Typography.Text>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={8}>
            <Card size='small' style={{ borderColor: '#b7eb8f', textAlign: 'center' }}>
              <Typography.Text type='secondary'>Job Performance</Typography.Text>
              <div>
                <Typography.Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                  {jobScorePreview.toFixed(2)}%
                </Typography.Title>
              </div>
              <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                Self Score
              </Typography.Text>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card size='small' style={{ borderColor: '#b7eb8f', textAlign: 'center' }}>
              <Typography.Text type='secondary'>Work Personality</Typography.Text>
              <div>
                <Typography.Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                  {behaviorPreview.toFixed(2)}
                </Typography.Title>
              </div>
              <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                Self Score
              </Typography.Text>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card
              size='small'
              style={{ borderColor: '#389e0d', background: '#f6ffed', textAlign: 'center' }}
            >
              <Typography.Text type='secondary'>
                {['submitted', 'approved'].includes(evaluation.status)
                  ? 'Final Grade'
                  : 'Estimated Grade'
                }
              </Typography.Text>
              <div>
                <Typography.Title level={2} style={{ margin: 0, color: '#389e0d' }}>
                  {['submitted', 'approved'].includes(evaluation.status) && evaluation.final_score
                    ? `${evaluation.final_score}%`
                    : `${finalPreview.toFixed(2)}%`
                  }
                </Typography.Title>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Show rejection reason if rejected */}
        {evaluation.status === 'rejected' && evaluation.rejection_reason && (
          <div style={{
            background:   '#fff2f0',
            border:       '1px solid #ffccc7',
            borderRadius: 8,
            padding:      '8px 12px',
            marginTop:    16,
          }}>
            <Typography.Text type='danger' strong>
              Rejection Reason:
            </Typography.Text>
            <Typography.Text type='danger' style={{ marginLeft: 8 }}>
              {evaluation.rejection_reason}
            </Typography.Text>
          </div>
        )}

      </Card>
    </>
  );
};

export default KpiMyEvaluationForm;