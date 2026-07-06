import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Spin, Button, Breadcrumb,
  Row, Col, Typography, Tag,
  Table, InputNumber, Rate,
  Divider, App, Space,
} from 'antd';
import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons';

import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';
import handleApiError   from '../../../utils/handleApiError';

import dayjs from 'dayjs';

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

  const canSelfEvaluate = evaluation.status === 'draft';
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
      title:  'Final Score',
      key:    'final_score',
      width:  100,
      render: (_, record) => getFinalScore(record),
    },
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
              <Tag color={evaluation.status === 'draft' ? 'default' : 'processing'}>
                {evaluation.status?.toUpperCase()}
              </Tag>
            </Col>
          </Row>
        }
        extra={
          canSelfEvaluate && (
            <Button
              type='primary'
              icon={<SendOutlined />}
              loading={saving}
              onClick={handleSubmit}
            >
              Submit Self Evaluation
            </Button>
          )
        }
      >
        {/* Employee Info */}
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}>
            <Typography.Text type='secondary'>Employee</Typography.Text>
            <div>
              <Typography.Text strong>
                {evaluation.employee
                  ? `${evaluation.employee.last_name}, ${evaluation.employee.first_name}`
                  : '-'}
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
          Score Preview
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
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              size='small'
              style={{ borderColor: '#389e0d', background: '#f6ffed', textAlign: 'center' }}
            >
              <Typography.Text type='secondary'>Estimated Final Grade</Typography.Text>
              <div>
                <Typography.Title level={2} style={{ margin: 0, color: '#389e0d' }}>
                  {finalPreview.toFixed(2)}%
                </Typography.Title>
              </div>
            </Card>
          </Col>
        </Row>

      </Card>
    </>
  );
};

export default KpiMyEvaluationForm;