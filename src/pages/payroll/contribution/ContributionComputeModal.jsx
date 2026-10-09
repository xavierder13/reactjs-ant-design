import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, DatePicker, InputNumber, Button, Table, Tag, Alert, Row, Col, Statistic, Spin, Grid, Typography, App } from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import contributionProfileApi from '../../../services/payroll/contributionProfileApi';
import handleApiError from '../../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { MODE_COLORS, peso, pesoInputProps } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';

// Preview of one employee's MONTHLY contributions and withholding tax on a
// date, from their profile and the tables in force. The base is the salary
// in force (monthly rate, for users who may see salaries) unless another
// monthly compensation is typed — needed for a daily rate. Recomputes when
// the date or the compensation changes (the compensation after a short
// pause), and says which base and date the totals are for.
const ContributionComputeModal = ({ employee, onClose }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const requestNo = useRef(0); // only the latest request's answer is shown
  const typingTimer = useRef(null);

  const compute = async () => {
    clearTimeout(typingTimer.current);
    const { date, base } = form.getFieldsValue();
    const no = ++requestNo.current;
    setLoading(true);
    try {
      const { data } = await contributionProfileApi.compute({
        employee_id: employee.id,
        date: (date || dayjs()).format('YYYY-MM-DD'),
        base: base ?? null,
      });
      if (no === requestNo.current) setResult({ ...data.computation, typedBase: base !== null && base !== undefined });
    } catch (error) {
      if (no === requestNo.current) handleApiError(error, message);
    } finally {
      if (no === requestNo.current) setLoading(false);
    }
  };

  // a new date recomputes at once; a typed compensation once typing pauses
  const handleValuesChange = (changed) => {
    clearTimeout(typingTimer.current);
    if ('date' in changed) compute();
    else if ('base' in changed) typingTimer.current = setTimeout(compute, 500);
  };

  const handleAfterOpenChange = (isOpen) => {
    if (!isOpen) { clearTimeout(typingTimer.current); return; }
    form.setFieldsValue({ date: dayjs(), base: null });
    setResult(null);
    compute();
  };

  const lines = result?.lines || [];
  const rows = [
    ...lines.map((l) => ({ key: l.agency, ...l })),
    ...(result?.tax ? [{ key: 'BIR', agency: 'Withholding Tax', mode: result.tax.mode, salary_credit: result.tax.taxable, ee: result.tax.tax, er: null, ec: null, note: result.tax.note, isTax: true }] : []),
  ];

  const columns = [
    { title: 'Agency', dataIndex: 'agency', width: 140 },
    { title: 'Mode', dataIndex: 'mode', width: 100, render: (v) => <Tag color={MODE_COLORS[v]}>{v}</Tag> },
    {
      title: 'Base / Credit',
      dataIndex: 'salary_credit',
      width: 140,
      align: 'right',
      render: (v, r) => (v === null || v === undefined ? '—' : `${peso(v)}${r.isTax ? ' taxable' : ''}`),
    },
    {
      title: 'Employee',
      dataIndex: 'ee',
      width: 140,
      align: 'right',
      render: (v, r) => (v === null ? '—' : (
        <>
          {peso(v)}
          {r.ee_additional > 0 && <div style={{ fontSize: 12, color: '#8c8c8c' }}>+ {peso(r.ee_additional)} voluntary</div>}
        </>
      )),
    },
    { title: 'Employer', dataIndex: 'er', width: 130, align: 'right', render: (v) => (v === null ? '—' : peso(v)) },
    { title: 'EC', dataIndex: 'ec', width: 90, align: 'right', render: (v) => (v ? peso(v) : '—') },
    {
      title: 'Note',
      key: 'note',
      render: (_, r) => r.note || (r.table_effective_date ? `Table of ${formatDate(r.table_effective_date)}` : ''),
    },
  ];

  return (
    <Modal
      open={!!employee}
      title={employee ? `Contributions — ${employee.label}` : 'Contributions'}
      footer={null}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      width={{ xs: '100%', sm: '95%', lg: 1000 }}
      destroyOnHidden
    >
      <Form form={form} layout='vertical' onValuesChange={handleValuesChange}>
        {/* top-aligned, the button under an empty label beside the fields
            (md+): the hint under Monthly compensation would otherwise push
            the other controls down */}
        <Row gutter={12} align='top'>
          <Col xs={12} md={6}>
            <Form.Item name='date' label='As of'>
              <DatePicker format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name='base' label='Monthly compensation' extra='Blank = the salary in force (monthly rate)'>
              <InputNumber {...pesoInputProps} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item label={screens.md ? ' ' : null} colon={false}>
              <Button type='primary' icon={<CalculatorOutlined />} onClick={compute} loading={loading}>Compute</Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <Spin spinning={loading}>
        {result?.salary && (
          <Alert
            type='info'
            showIcon
            style={{ marginBottom: 12 }}
            title={`Salary in force: ${rateLabel(result.salary.pay_basis, result.salary.basic_rate)} since ${formatDate(result.salary.effective_date)}`}
          />
        )}
        {result?.needs_base && (
          <Alert
            type='warning'
            showIcon
            style={{ marginBottom: 12 }}
            title={!result.salary_visible
              ? 'Type the monthly compensation to compute (the salary isn\'t shown without Salary History access).'
              : result.salary
                ? 'Daily rate — type the month\'s compensation (actual earnings) to compute.'
                : 'No salary in force on this date — type the monthly compensation to compute.'}
          />
        )}
        {result && !result.needs_base && (
          <>
            <Table rowKey='key' size='small' columns={columns} dataSource={rows} pagination={false} scroll={{ x: 860 }} />
            <Typography.Text type='secondary' style={{ display: 'block', marginTop: 16 }}>
              {result.typedBase
                ? `Monthly totals on ${peso(result.base)} (typed monthly compensation) as of ${formatDate(result.date)}`
                : `Monthly totals on the salary in force, ${peso(result.base)} / month, as of ${formatDate(result.date)}`}
            </Typography.Text>
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col xs={12} md={6}><Statistic title='Employee share' value={peso(result.totals.ee)} /></Col>
              <Col xs={12} md={6}><Statistic title='Withholding tax' value={peso(result.totals.tax)} /></Col>
              <Col xs={12} md={6}><Statistic title='Total employee deductions' value={peso(result.totals.employee_deductions)} /></Col>
              <Col xs={12} md={6}><Statistic title='Employer share (+ EC)' value={peso(result.totals.er + result.totals.ec)} /></Col>
            </Row>
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default ContributionComputeModal;
