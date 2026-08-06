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

const BehaviorRatingSection = ({ ratings = [], canEdit, evaluationId, onUpdated, evaluationType, viewMode = 'supervisor' }) => {
  const { message }           = App.useApp();
  const [values,  setValues]  = useState({});
  const [saving,  setSaving]  = useState(false);

  const handleRatingChange = (criteriaId, value) => {
    setValues((prev) => ({ ...prev, [criteriaId]: value }));
  };

  const getRating = (rating) => {
    return values[rating.kpi_behavior_criteria_id] ?? rating.rating ?? 0;
  };

  const handleSubmitValidation = () => {
    const unfilledRatings = ratings.filter((r) => {
      const rating = getRating(r);
      return !rating || rating === 0;
    });

    if (unfilledRatings.length > 0) {
      message.warning(
        `Please fill in all behavior ratings. ${unfilledRatings.length} rating(s) missing.`
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    // Validate before submitting
    if (!handleSubmitValidation()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        behavior_ratings: ratings.map((r) => ({
          kpi_behavior_criteria_id: r.kpi_behavior_criteria_id,
          rating: getRating(r),
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

    // Self tab — show self_rating only
    ...(viewMode === 'self' ? [
      {
        title:  'Self Rating',
        key:    'self_rating',
        width:  200,
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
      },
    ] : [
      // Supervisor tab — show supervisor rating
      {
        title:  evaluationType === 'self' ? 'Supervisor Rating' : 'Rating',
        key:    'rating',
        width:  200,
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
    ]),
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