import { useState } from 'react';
import { Modal, Spin, Row, Col, Space, Avatar, Tag, Typography, Table, Alert, Collapse, Button, App } from 'antd';
import { UserOutlined, PrinterOutlined } from '@ant-design/icons';
import payrollRunApi from '../../../services/payroll/payrollRunApi';
import handleApiError from '../../../utils/handleApiError';
import printDocument from '../../../utils/printDocument';
import { payslipHtml } from '../reports/printTemplates';
import { formatDate } from '../../../utils/formatDate';
import { cutoffLabel, peso } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';
import DtrDaysTable from './DtrDaysTable';
import { RUN_STATUS_COLORS, minutesText, daysText } from './runHelpers';

const Stat = ({ label, children, strong }) => (
  <>
    <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {label}
    </Typography.Text>
    <Typography.Text strong={strong} style={{ fontSize: strong ? 16 : 14 }}>{children}</Typography.Text>
  </>
);

// Lines grouped under their category, each with how it was computed.
const LinesTable = ({ lines, negativeRed }) => (
  <Table
    rowKey={(l) => l.code + l.label}
    size='small'
    pagination={false}
    showHeader={false}
    dataSource={lines}
    columns={[
      {
        key: 'label',
        render: (_, l) => (
          <div>
            <div>
              {l.label}
              {l.taxable === false && <Tag style={{ marginLeft: 6 }}>Non-taxable</Tag>}
            </div>
            {l.detail?.length > 0 && (
              <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                {l.detail.length > 6 ? `${l.detail.slice(0, 6).join(' · ')} · +${l.detail.length - 6} more` : l.detail.join(' · ')}
              </Typography.Text>
            )}
          </div>
        ),
      },
      {
        key: 'amount',
        width: 140,
        align: 'right',
        render: (_, l) => <Typography.Text type={negativeRed && l.amount < 0 ? 'danger' : undefined}>{peso(l.amount)}</Typography.Text>,
      },
    ]}
  />
);

const groupBy = (lines) => lines.reduce((acc, l) => {
  (acc[l.category] = acc[l.category] || []).push(l);
  return acc;
}, {});

// One employee's payslip in a run (payroll_run/employee): who and the rates
// used, earnings / deductions with how each was computed, the employer's
// share, warnings, and the day-by-day DTR it was paid from; Print opens the
// printable payslip. `target` = { id, full_name }; the loaded payslip is kept
// while the modal closes. `loadPayslip` = how to load it (default payroll_run/
// employee; My Payslips passes myPayslipApi.show); `selfService` hides the
// approval warnings.
const PayslipModal = ({ target, onClose, loadPayslip = payrollRunApi.payslip, selfService = false }) => {
  const { message } = App.useApp();
  const [data, setData] = useState(null);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setData(null); return; }
    try {
      const { data: res } = await loadPayslip(target.id);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const p = data?.payslip;
  const run = data?.run;
  const e = p?.employee;
  const s = p?.summary;
  const earnings = p ? groupBy(p.earnings) : {};
  const deductions = p ? groupBy(p.deductions) : {};

  return (
    <Modal
      open={!!target}
      title={`Payslip — ${e?.full_name || target?.full_name || ''}`}
      onCancel={onClose}
      footer={p ? (
        <Button
          color='purple'
          variant='outlined'
          icon={<PrinterOutlined />}
          onClick={() => {
            if (!printDocument(`Payslip ${run.cutoff?.code} ${e?.full_name}`, payslipHtml(p, run, data.employer))) message.error('Allow pop-ups to print the payslip');
          }}
        >
          Print
        </Button>
      ) : null}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', lg: 1100 }}
    >
      {!p ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          <div style={{ background: '#f6ffed', border: '1px solid #d9f7be', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
            <Row gutter={[16, 12]} align='middle'>
              <Col xs={24} md={8}>
                <Space size={12} align='center'>
                  <Avatar size={44} icon={<UserOutlined />} style={{ background: '#d9f7be', color: '#276221', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ fontSize: 15, color: '#1a4d0f', display: 'block' }}>{e?.full_name}</Typography.Text>
                    <Space size={4} wrap>
                      <Tag>{e?.employee_code}</Tag>
                      <Typography.Text type='secondary' style={{ fontSize: 12 }}>{[e?.branch?.name, e?.position?.name].filter(Boolean).join(' · ')}</Typography.Text>
                    </Space>
                  </div>
                </Space>
              </Col>
              <Col xs={12} md={5}>
                <Stat label='Cut-off'>{cutoffLabel(run.cutoff)}</Stat>
                {!selfService && <div><Tag color={RUN_STATUS_COLORS[run.status]} style={{ marginTop: 4 }}>{run.status}</Tag></div>}
              </Col>
              <Col xs={12} md={4}><Stat label='Pay Date'>{run.cutoff?.pay_date ? formatDate(run.cutoff.pay_date) : '—'}</Stat></Col>
              <Col xs={12} md={4}>
                <Stat label='Rate'>{rateLabel(p.pay_basis, p.basic_rate)}</Stat>
                <Typography.Text type='secondary' style={{ fontSize: 12, display: 'block' }}>{`daily ${peso(p.daily_rate)} · hourly ${peso(p.hourly_rate)}`}</Typography.Text>
              </Col>
              <Col xs={12} md={3}><Stat label='Net Pay' strong>{peso(p.net_pay)}</Stat></Col>
            </Row>
          </div>
          {!selfService && p.warnings?.length > 0 && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title='Check before approving'
              description={<ul style={{ margin: 0, paddingInlineStart: 18 }}>{p.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            />
          )}
          <Row gutter={16}>
            <Col xs={24} lg={13}>
              <Typography.Title level={5} style={{ marginTop: 0 }}>Earnings</Typography.Title>
              {Object.entries(earnings).map(([category, lines]) => (
                <div key={category} style={{ marginBottom: 8 }}>
                  <Typography.Text type='secondary' style={{ fontSize: 12, textTransform: 'uppercase' }}>{category}</Typography.Text>
                  <LinesTable lines={lines} negativeRed />
                </div>
              ))}
              <Row justify='space-between' style={{ borderTop: '1px solid #f0f0f0', padding: '8px 8px 0' }}>
                <Typography.Text strong>Gross Pay</Typography.Text>
                <Typography.Text strong>{peso(p.gross_pay)}</Typography.Text>
              </Row>
              <Row justify='space-between' style={{ padding: '2px 8px' }}>
                <Typography.Text type='secondary'>Taxable</Typography.Text>
                <Typography.Text type='secondary'>{peso(p.taxable_pay)}</Typography.Text>
              </Row>
            </Col>
            <Col xs={24} lg={11}>
              <Typography.Title level={5} style={{ marginTop: 0 }}>Deductions</Typography.Title>
              {Object.keys(deductions).length === 0 && <Typography.Text type='secondary'>None on this cut-off.</Typography.Text>}
              {Object.entries(deductions).map(([category, lines]) => (
                <div key={category} style={{ marginBottom: 8 }}>
                  <Typography.Text type='secondary' style={{ fontSize: 12, textTransform: 'uppercase' }}>{category}</Typography.Text>
                  <LinesTable lines={lines} />
                </div>
              ))}
              <Row justify='space-between' style={{ borderTop: '1px solid #f0f0f0', padding: '8px 8px 0' }}>
                <Typography.Text strong>Total Deductions</Typography.Text>
                <Typography.Text strong>{peso(p.total_deductions)}</Typography.Text>
              </Row>
              <Row justify='space-between' style={{ padding: '8px', marginTop: 8, background: '#f6ffed', borderRadius: 6 }}>
                <Typography.Text strong>Net Pay</Typography.Text>
                <Typography.Text strong style={{ fontSize: 16 }}>{peso(p.net_pay)}</Typography.Text>
              </Row>
              {p.employer?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Typography.Text type='secondary' style={{ fontSize: 12, textTransform: 'uppercase' }}>Employer Share (not deducted)</Typography.Text>
                  <LinesTable lines={p.employer.map((l) => ({ ...l, code: l.code || l.label }))} />
                </div>
              )}
            </Col>
          </Row>
          <Collapse
            style={{ marginTop: 16 }}
            items={[{
              key: 'dtr',
              label: `Daily Time Record — present ${s.present}, absent ${daysText(s.absent_days)}, late ${minutesText(s.late_minutes)}, undertime ${minutesText(s.undertime_minutes)}, overtime ${minutesText(s.ot_minutes)}`,
              children: <DtrDaysTable days={p.days} />,
            }]}
          />
        </>
      )}
    </Modal>
  );
};

export default PayslipModal;
