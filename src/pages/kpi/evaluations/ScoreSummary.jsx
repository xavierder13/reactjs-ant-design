import { Typography, Row, Col, Card, Divider, Tag } from 'antd';

const ScoreSummary = ({ evaluation, evaluationType, viewMode = 'supervisor' }) => {
  const items   = evaluation.evaluation_items || [];
  const ratings = evaluation.behavior_ratings || [];
  const demeritRatings = evaluation.demerit_ratings || [];

  // demerit deduction
  const demeritDeduction = demeritRatings.reduce((sum, r) => {
    const val = viewMode === 'self'
      ? r.self_deduction
      : r.actual_deduction;
    return sum + (parseFloat(val) || 0);
  }, 0);

  // Self tab scores
  const selfJobScore = items.reduce((sum, item) => {
    const grade  = item.self_grade || 0;
    const weight = item.template_item ? item.template_item.weight : 0;
    return sum + (grade * weight) / 100;
  }, 0);

  const filledSelfRatings = ratings.filter((r) => r.self_rating > 0);
  const selfBehaviorScore = filledSelfRatings.length > 0
    ? filledSelfRatings.reduce((sum, r) => sum + r.self_rating, 0) / filledSelfRatings.length
    : 0;

  const selfFinalScore = selfJobScore + selfBehaviorScore - demeritDeduction;

  // Supervisor tab scores
  const jobScore = items.reduce((sum, item) => {
    const grade  = item.actual_grade || 0;
    const weight = item.template_item ? item.template_item.weight : 0;
    return sum + (grade * weight) / 100;
  }, 0);

  const filledRatings = ratings.filter((r) => r.rating > 0);
  const behaviorScore = filledRatings.length > 0
    ? filledRatings.reduce((sum, r) => sum + r.rating, 0) / filledRatings.length
    : 0;

  const finalScore = jobScore + behaviorScore - demeritDeduction;

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
                {viewMode === 'self'
                  ? selfJobScore.toFixed(2)
                  : jobScore.toFixed(2)}%
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
                {viewMode === 'self'
                  ? selfBehaviorScore.toFixed(2)
                  : behaviorScore.toFixed(2)}
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
                {viewMode === 'self'
                  ? selfFinalScore.toFixed(2)
                  : finalScore.toFixed(2)}%
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