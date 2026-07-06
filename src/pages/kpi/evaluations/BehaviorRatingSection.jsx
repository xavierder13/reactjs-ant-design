import { useState } from 'react';
import {
  Typography, Table, Rate,
  Button, App, Row, Col, Tag,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';

const ratingLabels = {
  1: 'Unsatisfactory',
  2: 'Inconsistent',
  3: 'Effective',
  4: 'Strong',
  5: 'Exemplary',
};

const BehaviorRatingSection = ({ ratings = [], canEdit, evaluationId, onUpdated, evaluationType }) => {
  const { message }           = App.useApp();
  const [values,  setValues]  = useState({});
  const [saving,  setSaving]  = useState(false);

  const handleRatingChange = (criteriaId, value) => {
    setValues((prev) => ({ ...prev, [criteriaId]: value }));
  };

  const getRating = (rating) => {
    return values[rating.kpi_behavior_criteria_id] ?? rating.rating ?? 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        behavior_ratings: ratings.map((r) => ({
          kpi_behavior_criteria_id: r.kpi_behavior_criteria_id,
          rating:                   getRating(r),
        })),
      };

      const { data } = await kpiEvaluationApi.update(evaluationId, payload);
      if (data.success) {
        message.success('Behavior ratings saved.');
        onUpdated(data.evaluation);
      } else {
        message.error(data.message || 'Failed to save ratings.');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title:  '#',
      key:    'sort_order',
      width:  40,
      render: (_, record) => record.criteria?.sort_order || '-',
    },
    {
      title:  'Criteria',
      key:    'criteria_name',
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

    // show self rating column only if evaluation type is self
    ...(evaluationType === 'self' ? [{
      title:  'Self Rating',
      key:    'self_rating',
      width:  150,
      render: (_, record) => record.self_rating
        ? (
          <div>
            <Rate disabled value={record.self_rating} count={5} />
            <div>
              <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                {ratingLabels[record.self_rating]}
              </Typography.Text>
            </div>
          </div>
        )
        : <Tag color='default'>Not filled</Tag>,
    }] : []),

    {
      title:  evaluationType === 'self' ? 'Supervisor Rating' : 'Rating',
      key:    'rating',
      width:  180,
      render: (_, record) => canEdit
        ? (
          <div>
            <Rate
              count={5}
              value={getRating(record)}
              onChange={(val) => handleRatingChange(record.kpi_behavior_criteria_id, val)}
            />
            {getRating(record) > 0 && (
              <div>
                <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                  {ratingLabels[getRating(record)]}
                </Typography.Text>
              </div>
            )}
          </div>
        )
        : (
          <div>
            <Rate disabled value={record.rating || 0} count={5} />
            {record.rating > 0 && (
              <div>
                <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                  {ratingLabels[record.rating]}
                </Typography.Text>
              </div>
            )}
          </div>
        ),
    },
  ];

  return (
    <div>
      <Row justify='space-between' align='middle' style={{ marginBottom: 12 }}>
        <Col>
          <Typography.Text strong style={{ fontSize: 15 }}>
            Work Personality / Behavior
          </Typography.Text>
        </Col>
        {canEdit && (
          <Col>
            <Button
              type='primary'
              icon={<SaveOutlined />}
              size='small'
              loading={saving}
              onClick={handleSave}
            >
              Save Ratings
            </Button>
          </Col>
        )}
      </Row>

      <Table
        rowKey='kpi_behavior_criteria_id'
        columns={columns}
        dataSource={ratings}
        pagination={false}
        size='small'
      />
    </div>
  );
};

export default BehaviorRatingSection;