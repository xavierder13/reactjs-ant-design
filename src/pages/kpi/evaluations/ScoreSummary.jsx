import { Typography, Row, Col, Card, Tag } from 'antd';
import { computeScores } from './kpiScore';

// Same formula as the backend (see kpiScore.js): demerits capped at the
// evaluation's max_demerit, final clamped to 0–100; on a Supervisor-type
// evaluation each behavior rating averages the evaluator's and approver's.
const ScoreSummary = ({ evaluation, viewMode = 'supervisor', useStoredFinal = false }) => {
  const demeritRatings = evaluation.demerit_ratings || [];
  const scores = computeScores(evaluation, viewMode, { useStoredFinal });
  const jobScore         = scores.job;
  const behaviorScore    = scores.behavior;
  const demeritDeduction = scores.demerit;
  const finalScore       = scores.final;

  return (
    <div>
      <Typography.Text strong style={{ fontSize: 15 }}>
        Performance Summary
      </Typography.Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card size='small' style={{ borderColor: '#b7eb8f', textAlign: 'center' }}>
            <Typography.Text type='secondary'>Job Performance</Typography.Text>
            <div>
              <Typography.Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                {jobScore.toFixed(2)}%
              </Typography.Title>
            </div>
            <Typography.Text type='secondary' style={{ fontSize: 11 }}>
              Weight: {evaluation.job_performance_weight}%
            </Typography.Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card size='small' style={{ borderColor: '#b7eb8f', textAlign: 'center' }}>
            <Typography.Text type='secondary'>Work Personality</Typography.Text>
            <div>
              <Typography.Title level={3} style={{ margin: 0, color: '#389e0d' }}>
                {behaviorScore.toFixed(2)}
              </Typography.Title>
            </div>
            <Typography.Text type='secondary' style={{ fontSize: 11 }}>
              Weight: {evaluation.behavior_weight}%
            </Typography.Text>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            size='small'
            style={{
              borderColor: viewMode === 'self' ? '#d9d9d9' : '#389e0d',
              background:  viewMode === 'self' ? '#fafafa' : '#f6ffed',
              textAlign:   'center',
            }}
          >
            <Typography.Text type='secondary'>
              {viewMode === 'self' ? 'Estimated Final Grade' : 'Final Grade'}
            </Typography.Text>
            <div>
              <Typography.Title
                level={2}
                style={{
                  margin: 0,
                  color: viewMode === 'self' ? '#8c8c8c' : '#389e0d',
                }}
              >
                {finalScore.toFixed(2)}%
              </Typography.Title>
            </div>
            {demeritRatings.length > 0 && demeritDeduction > 0 && (
              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                <Col xs={24}>
                  <Tag color='orange' style={{ fontSize: 13, padding: '4px 8px' }}>
                    Demerit Deduction: -{demeritDeduction.toFixed(2)}%
                  </Tag>
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ScoreSummary;