import { useState } from 'react';
import {
  Typography, Table, InputNumber,
  Button, App, Row, Col, Tag,
} from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import kpiEvaluationApi from '../../../services/kpi/kpiEvaluationApi';

const DemeritSection = ({
  ratings = [],
  canEdit,
  evaluationId,
  onUpdated,
  viewMode = 'supervisor',
	evaluationType,
  maxDemerit,
}) => {
  const { message }             = App.useApp();
  const [values,  setValues]    = useState({});
  const [saving,  setSaving]    = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getDeduction = (rating) => {
    const key = viewMode === 'self'
      ? 'self_deduction'
      : 'actual_deduction';
    return values[rating.kpi_demerit_item_id] ?? rating[key] ?? null;
  };

  const totalDeduction = ratings.reduce((sum, r) => {
    return sum + (parseFloat(getDeduction(r)) || 0);
  }, 0);

  const deductionOk = totalDeduction <= maxDemerit;

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!deductionOk) {
      message.warning(
        `Total deduction (${totalDeduction.toFixed(2)}%) exceeds max demerit cap (${maxDemerit}%).`
      );
      return;
    }

    setSaving(true);
    try {
      const fieldKey = viewMode === 'self' ? 'self_deduction' : 'actual_deduction';

      const payload = {
        demerit_ratings: ratings.map((r) => ({
          kpi_demerit_item_id: r.kpi_demerit_item_id,
          [fieldKey]:          getDeduction(r) ?? 0,
        })),
      };

      const { data } = await kpiEvaluationApi.update(evaluationId, payload);
      if (data.success) {
        message.success('Demerit ratings saved.');
        onUpdated(data.evaluation);
      } else {
        message.error(data.message || 'Failed to save demerit ratings.');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = [
    {
      title:  'Code',
      key:    'code',
      width:  60,
      render: (_, record) => record.demerit_item?.component_code || '-',
    },
    {
      title:  'Demerit Component',
      key:    'name',
      render: (_, record) => record.demerit_item?.component_name || '-',
    },
    {
      title:  'Max Deduction',
      key:    'max_deduction',
      width:  120,
      render: (_, record) => `${record.demerit_item?.max_deduction || 0}%`,
    },
    // For supervisor evaluation type — show actual_deduction only (read-only)
    ...(evaluationType === 'supervisor' ? [
      {
        title:  'Deduction',
        key:    'deduction',
        width:  140,
        render: (_, record) => record.actual_deduction !== null
          ? `${record.actual_deduction}%`
          : <Tag color='default'>Not filled</Tag>,
      },
    ] : [
      // For self evaluation type — show based on viewMode
      {
        title:  viewMode === 'self' ? 'Self Deduction' : 'Actual Deduction',
        key:    'deduction',
        width:  140,
        render: (_, record) => canEdit
          ? (
            <InputNumber
              min={0}
              max={record.demerit_item?.max_deduction || 100}
              value={getDeduction(record)}
              onChange={(val) =>
                setValues((prev) => ({
                  ...prev,
                  [record.kpi_demerit_item_id]: val,
                }))
              }
              suffix='%'
              size='small'
              style={{ width: 100 }}
            />
          )
          : `${getDeduction(record) ?? '-'}%`,
      },
    ]),
  ];

  // show self deduction column only in supervisor tab AND evaluation type is self
  if (viewMode === 'supervisor' && evaluationType === 'self') {
    columns.splice(3, 0, {
      title:  'Self Deduction',
      key:    'self_deduction',
      width:  120,
      render: (_, record) => record.self_deduction !== null
        ? `${record.self_deduction}%`
        : <Tag color='default'>Not filled</Tag>,
    });
  }

  return (
    <div>
      <Row justify='space-between' align='middle' style={{ marginBottom: 12 }}>
        <Col>
          <Typography.Text strong style={{ fontSize: 15 }}>
            Demerit
          </Typography.Text>
        </Col>
        <Col>
          <Typography.Text type='secondary' style={{ marginRight: 8 }}>
            Total Deduction:
          </Typography.Text>
          {/* <Tag color={deductionOk ? 'success' : 'error'}> */}
          <Tag color='error'>
            {totalDeduction.toFixed(2)}% / {maxDemerit}% max
          </Tag>
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
              Save Demerit
            </Button>
          </Col>
        )}
      </Row>

      <Table
        rowKey='kpi_demerit_item_id'
        columns={columns}
        dataSource={ratings}
        pagination={false}
        size='small'
      />
    </div>
  );
};

export default DemeritSection;