import { Row, Col, Space, Avatar, Tag, Typography, Alert } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { cutoffLabel } from '../payrollHelpers';
import { minutesText, daysText } from '../run/runHelpers';

const Stat = ({ label, children, danger }) => (
  <>
    <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {label}
    </Typography.Text>
    <Typography.Text strong type={danger ? 'danger' : undefined} style={{ fontSize: 14 }}>{children}</Typography.Text>
  </>
);

// A DTR's summary banner (employee, cut-off, present / absent / late /
// undertime / overtime, leave · holidays · rest days · night) and the
// "days need a look" warning — Timekeeping's DtrModal and My Attendance.
// `data` = a dtr/show (or my_attendance/show) response.
const DtrSummary = ({ data }) => {
  const s = data.summary;
  const e = data.employee;

  return (
    <>
      <div style={{ background: '#f6ffed', border: '1px solid #d9f7be', borderRadius: 8, padding: '12px 16px', marginBottom: 12 }}>
        <Row gutter={[16, 12]} align='middle'>
          <Col xs={24} md={8}>
            <Space size={12} align='center'>
              <Avatar size={44} icon={<UserOutlined />} style={{ background: '#d9f7be', color: '#276221', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <Typography.Text strong style={{ fontSize: 15, color: '#1a4d0f', display: 'block' }}>{e.full_name}</Typography.Text>
                <Space size={4} wrap>
                  <Tag>{e.employee_code}</Tag>
                  <Typography.Text type='secondary' style={{ fontSize: 12 }}>{[e.branch, e.position].filter(Boolean).join(' · ')}</Typography.Text>
                </Space>
              </div>
            </Space>
          </Col>
          <Col xs={24} md={6}><Stat label='Cut-off'>{cutoffLabel(data.cutoff)}</Stat></Col>
          <Col xs={8} md={2}><Stat label='Present'>{s.present}</Stat></Col>
          <Col xs={8} md={2}><Stat label='Absent' danger={s.absent_days > 0}>{daysText(s.absent_days)}</Stat></Col>
          <Col xs={8} md={2}><Stat label='Late' danger={s.late_minutes > 0}>{minutesText(s.late_minutes)}</Stat></Col>
          <Col xs={8} md={2}><Stat label='Undertime' danger={s.undertime_minutes > 0}>{minutesText(s.undertime_minutes)}</Stat></Col>
          <Col xs={8} md={2}><Stat label='Overtime'>{minutesText(s.ot_minutes)}</Stat></Col>
        </Row>
        <Typography.Text type='secondary' style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          {[
            `Leave: ${daysText(s.paid_leave_days + s.unpaid_leave_days)}${s.unpaid_leave_days ? ` (${daysText(s.unpaid_leave_days)} unpaid)` : ''}`,
            `Holidays: ${s.holidays}${s.holidays_worked ? ` (${s.holidays_worked} worked)` : ''}`,
            `Rest days: ${s.rest_days}`,
            `Night: ${minutesText(s.night_minutes + s.ot_night_minutes)}`,
            s.upcoming ? `Upcoming: ${s.upcoming} (assumed worked)` : null,
          ].filter(Boolean).join(' · ')}
        </Typography.Text>
      </div>
      {s.exceptions > 0 && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: 12 }}
          title={`${s.exceptions} day(s) need a look — missing punch, no schedule, or rest-day work without approved overtime (see Remarks).`}
        />
      )}
    </>
  );
};

export default DtrSummary;
