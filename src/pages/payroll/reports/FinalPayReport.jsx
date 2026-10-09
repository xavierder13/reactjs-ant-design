import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Select, DatePicker, Button, Card, Row, Col, Table, Tag, Alert, Descriptions, Typography, Empty, Spin, App } from 'antd';
import { CalculatorOutlined, PrinterOutlined } from '@ant-design/icons';
import payrollReportApi from '../../../services/payroll/payrollReportApi';
import handleApiError from '../../../utils/handleApiError';
import printDocument from '../../../utils/printDocument';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../../utils/formatDate';
import { peso } from '../payrollHelpers';
import { rateLabel } from '../../compensation/compensationHelpers';
import { finalPayHtml, certificate2316Html } from './printTemplates';

// `negativeType`: an earnings minus (late, absences) is red; a deductions
// minus (tax refund) is green.
const LinesTable = ({ lines, negativeType }) => (
  <Table
    rowKey={(l) => l.label}
    size='small'
    pagination={false}
    showHeader={false}
    dataSource={lines}
    locale={{ emptyText: 'None' }}
    columns={[
      {
        key: 'label',
        render: (_, l) => (
          <div>
            <div>
              {l.label}
              {l.taxable === false && <Tag style={{ marginLeft: 6 }}>Non-taxable</Tag>}
            </div>
            {l.detail?.length > 0 && <Typography.Text type='secondary' style={{ fontSize: 12 }}>{l.detail.slice(0, 6).join(' · ')}</Typography.Text>}
          </div>
        ),
      },
      { key: 'amount', width: 140, align: 'right', render: (_, l) => <Typography.Text type={l.amount < 0 ? negativeType : undefined}>{peso(l.amount)}</Typography.Text> },
    ]}
  />
);

// Final pay (/final-pay — final-pay-view): a separated employee's last pay
// as of the last day — salary for the days after the last approved payroll
// (DTR-based, prorated per cut-off), pro-rated 13th month, unused SIL / VL
// converted at the daily rate, this month's contributions not yet taken,
// outstanding loan / deduction balances and the year's tax trued up. A
// computation to review and print (statement + the BIR 2316) — it doesn't
// post payments or change the employee.
const FinalPayReport = () => {
  const { message } = App.useApp();
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);
  const [picked, setPicked] = useState(null); // kept in the options while searching again
  const [lastDay, setLastDay] = useState(null);
  const [statement, setStatement] = useState(null);
  const [computing, setComputing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const search = async (text = '') => {
    setSearching(true);
    try {
      const { data } = await payrollReportApi.finalPayEmployees({ search: text });
      setOptions(data.employees);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const load = async () => { await search(''); };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id) => {
    setEmployeeId(id);
    setStatement(null);
    const e = options.find((o) => o.id === id);
    setPicked(e || null);
    if (e?.last_day_of_work) setLastDay(dayjs(e.last_day_of_work));
  };

  const compute = async () => {
    if (!employeeId || !lastDay) { message.error('Choose the employee and the last day'); return; }
    setComputing(true);
    try {
      const { data } = await payrollReportApi.finalPay({ employee_id: employeeId, last_day: lastDay.format('YYYY-MM-DD') });
      setStatement(data.statement);
    } catch (error) {
      setStatement(null);
      handleApiError(error, message);
    } finally {
      setComputing(false);
    }
  };

  const print = async (with2316) => {
    let body = finalPayHtml(statement);
    if (with2316) {
      setPrinting(true);
      try {
        const { data } = await payrollReportApi.certificate({ year: statement.annual.year, employee_id: statement.employee.employee_id });
        // the 2316 with this final pay included (the statement's trued-up year)
        body += `<div style="page-break-before:always"></div>${certificate2316Html({ ...data, annual: statement.annual })}`;
      } catch (error) {
        handleApiError(error, message);
        return;
      } finally {
        setPrinting(false);
      }
    }
    if (!printDocument(`Final Pay ${statement.employee.full_name}`, body)) message.error('Allow pop-ups to print');
  };

  const st = statement;

  return (
    <div>
      <Card size='small' style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]} align='bottom'>
          <Col xs={24} md={11}>
            <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 4 }}>Employee (with a salary saved)</Typography.Text>
            <Select
              showSearch={{ filterOption: false, onSearch: (v) => search(v.trim()) }}
              value={employeeId}
              onChange={pick}
              loading={searching}
              placeholder='Search code or name'
              style={{ width: '100%' }}
              notFoundContent={searching ? <Spin size='small' /> : 'No employee'}
              options={[...(picked && !options.some((o) => o.id === picked.id) ? [picked] : []), ...options].map((o) => ({
                value: o.id,
                label: `${o.employee_code} · ${o.full_name}${o.branch ? ` · ${o.branch}` : ''}${o.active ? '' : ' (inactive)'}`,
              }))}
            />
          </Col>
          <Col xs={12} md={6}>
            <Typography.Text type='secondary' style={{ display: 'block', marginBottom: 4 }}>Last day of work</Typography.Text>
            <DatePicker value={lastDay} onChange={(v) => { setLastDay(v); setStatement(null); }} format={DISPLAY_DATE_FORMAT} style={{ width: '100%' }} />
          </Col>
          <Col xs={12} md={7}>
            <Button type='primary' icon={<CalculatorOutlined />} loading={computing} onClick={compute}>Compute Final Pay</Button>
          </Col>
        </Row>
      </Card>

      {!st ? (
        <Card size='small'><Empty description='Choose the employee and the last day, then Compute' /></Card>
      ) : (
        <Card
          size='small'
          title={`Final Pay — ${st.employee.full_name}`}
          extra={(
            <Row gutter={8}>
              <Col><Button color='purple' variant='outlined' icon={<PrinterOutlined />} onClick={() => print(false)}>Print Statement</Button></Col>
              <Col><Button color='purple' variant='outlined' icon={<PrinterOutlined />} loading={printing} onClick={() => print(true)}>Print with BIR 2316</Button></Col>
            </Row>
          )}
        >
          <Descriptions
            size='small'
            bordered
            column={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4, xxl: 4 }}
            style={{ marginBottom: 12 }}
            items={[
              { key: 'code', label: 'Code', children: st.employee.employee_code },
              { key: 'branch', label: 'Branch', children: st.employee.branch || '—' },
              { key: 'employed', label: 'Date Employed', children: formatDate(st.employee.date_employed, '—') },
              { key: 'last', label: 'Last Day', children: formatDate(st.employee.last_day) },
              { key: 'rate', label: 'Rate', children: `${rateLabel(st.rate.pay_basis, st.rate.basic_rate)} · daily ${peso(st.rate.daily_rate)}` },
              { key: 'paid', label: 'Paid Through', children: formatDate(st.paid_through, 'no approved payroll') },
              { key: 'unpaid', label: 'Unpaid From', children: st.unpaid_from ? formatDate(st.unpaid_from) : 'nothing unpaid' },
              { key: 'net', label: 'Net Final Pay', children: <strong>{peso(st.net)}</strong> },
            ]}
          />
          {st.warnings.length > 0 && (
            <Alert
              type='warning'
              showIcon
              style={{ marginBottom: 12 }}
              title='Check before releasing'
              description={<ul style={{ margin: 0, paddingInlineStart: 18 }}>{st.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            />
          )}
          <Row gutter={16}>
            <Col xs={24} lg={13}>
              <Typography.Title level={5} style={{ marginTop: 0 }}>Earnings</Typography.Title>
              <LinesTable lines={st.earnings} negativeType='danger' />
              <Row justify='space-between' style={{ borderTop: '1px solid #f0f0f0', padding: '8px 8px 0' }}>
                <Typography.Text strong>Total Earnings</Typography.Text>
                <Typography.Text strong>{peso(st.gross)}</Typography.Text>
              </Row>
            </Col>
            <Col xs={24} lg={11}>
              <Typography.Title level={5} style={{ marginTop: 0 }}>Deductions</Typography.Title>
              <LinesTable lines={st.deductions} negativeType='success' />
              <Row justify='space-between' style={{ borderTop: '1px solid #f0f0f0', padding: '8px 8px 0' }}>
                <Typography.Text strong>Total Deductions</Typography.Text>
                <Typography.Text strong>{peso(st.total_deductions)}</Typography.Text>
              </Row>
              <Row justify='space-between' style={{ padding: 8, marginTop: 8, background: '#f6ffed', borderRadius: 6 }}>
                <Typography.Text strong>Net Final Pay</Typography.Text>
                <Typography.Text strong style={{ fontSize: 16 }}>{peso(st.net)}</Typography.Text>
              </Row>
              <Typography.Paragraph type='secondary' style={{ fontSize: 12, marginTop: 8 }}>
                {`Year-end tax ${st.annual.year}: taxable ${peso(st.annual.taxable)}, tax due ${peso(st.annual.tax_due)}, withheld ${peso(st.annual.tax_withheld)}.`}
              </Typography.Paragraph>
            </Col>
          </Row>
          <Typography.Paragraph type='secondary' style={{ fontSize: 12, marginBottom: 0 }}>
            A computation only — release it through your clearance process; loan balances are not marked paid here.
          </Typography.Paragraph>
        </Card>
      )}
    </div>
  );
};

export default FinalPayReport;
