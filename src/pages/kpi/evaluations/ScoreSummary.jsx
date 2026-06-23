import { Typography, Row, Col, Card, Divider, Tag } from 'antd';

const ScoreSummary = ({ evaluation }) => {
  const items   = evaluation.evaluation_items || [];
  const ratings = evaluation.behavior_ratings || [];

  // Calculate job performance score
  const jobScore = items.reduce((sum, item) => {
    const grade  = item.actual_grade || 0;
    const weight = item.template_item?.weight || 0;
    return sum + (grade * weight) / 100;
  }, 0);

  // Calculate behavior score — raw average
  const filledRatings = ratings.filter((r) => r.rating > 0);
  const behaviorScore = filledRatings.length > 0
    ? filledRatings.reduce((sum, r) => sum + r.rating, 0) / filledRatings.length
    : 0;

  const finalScore = jobScore + behaviorScore;

  return (
    <div>
      <Typography.Text strong style={{ fontSize: 15 }}>
        Performance Summary
      </Typography.Text>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card
            size='small'
            style={{ borderColor: '#b7eb8f', textAlign: 'center' }}
          >
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
          <Card
            size='small'
            style={{ borderColor: '#b7eb8f', textAlign: 'center' }}
          >
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
            style={{ borderColor: '#389e0d', background: '#f6ffed', textAlign: 'center' }}
          >
            <Typography.Text type='secondary'>Final Grade</Typography.Text>
            <div>
              <Typography.Title level={2} style={{ margin: 0, color: '#389e0d' }}>
                {finalScore.toFixed(2)}%
              </Typography.Title>
            </div>
            {evaluation.demerit_deduction > 0 && (
              <Tag color='red'>
                Demerit: -{evaluation.demerit_deduction}%
              </Tag>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ScoreSummary;