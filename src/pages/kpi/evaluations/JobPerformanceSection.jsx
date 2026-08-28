import { useState } from 'react';
import {
  Typography, Table, InputNumber,
  Button, App, Tag, Row, Col
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';

const JobPerformanceSection = ({ items = [], canEdit, evaluationId, onUpdated, evaluationType, viewMode = 'supervisor' }) => {
  const { message }         = App.useApp();
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);

  const handleGradeChange = (templateItemId, value) => {
    setGrades((prev) => ({ ...prev, [templateItemId]: value }));
  };

  const getGrade = (item) => {
    return grades[item.kpi_template_item_id] ?? item.actual_grade ?? null;
  };

  const getFinalScore = (item) => {
    const grade  = getGrade(item);
    const weight = item.template_item?.weight || 0;
    if (grade === null || grade === undefined) return '-';
    return ((grade * weight) / 100).toFixed(2) + '%';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        items: items.map((item) => ({
          kpi_template_item_id: item.kpi_template_item_id,
          actual_grade:         getGrade(item) ?? 0,
          weight:               item.template_item?.weight || 0,
        })),
      };

      const { data } = await kpiEvaluationApi.update(evaluationId, payload);
      if (data.success) {
        message.success('Job performance grades saved.');
        onUpdated(data.evaluation);
      } else {
        message.error(data.message || 'Failed to save grades.');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const getSelfFinalScore = (item) => {
    const grade  = item.self_grade;
    const weight = item.template_item?.weight || 0;
    if (grade === null || grade === undefined) return '-';
    return ((grade * weight) / 100).toFixed(2);
  };

  const columns = [
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

    // Self tab — show self_grade and self_final_score only
    ...(viewMode === 'self' ? [
      {
        title:  'Self Grade',
        key:    'self_grade',
        width:  100,
        render: (_, record) => record.self_grade !== null
          ? `${record.self_grade}%`
          : <Tag color='default'>Not filled</Tag>,
      },
      {
        title:  'Self Final Score',
        key:    'self_final_score',
        width:  130,
        render: (_, record) => {
          const grade  = record.self_grade;
          const weight = record.template_item ? record.template_item.weight : 0;
          if (grade === null || grade === undefined) return '-';
          return ((grade * weight) / 100).toFixed(2);
        },
      },
    ] : [
      // Supervisor tab — show actual_grade and final_score
      {
        title:  evaluationType === 'self' ? 'Actual Grade' : 'Grade',
        key:    'actual_grade',
        width:  130,
        render: (_, record) => canEdit
          ? (
            <InputNumber
              min={0}
              max={100}
              value={getGrade(record)}
              onChange={(val) => handleGradeChange(record.kpi_template_item_id, val)}
              suffix='%'
              size='small'
              style={{ width: 100 }}
            />
          )
          : `${record.actual_grade ?? '-'}%`,
      },
      {
        title:  'Final Score',
        key:    'final_score',
        width:  100,
        render: (_, record) => getFinalScore(record),
      },
    ]),
  ];

  return (
    <div>
      <Row justify='space-between' align='middle' style={{ marginBottom: 12 }}>
        <Col>
          <Typography.Text strong style={{ fontSize: 15 }}>
            Job Performance
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
              Save Grades
            </Button>
          </Col>
        )}
      </Row>

      <Table
        rowKey='kpi_template_item_id'
        columns={columns}
        dataSource={items}
        pagination={false}
        size='small'
      />
    </div>
  );
};

export default JobPerformanceSection;