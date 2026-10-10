import { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Timeline, Tag, Typography, Spin, Table, Descriptions, Avatar, Row, Col, Space, App } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import shiftAssignmentApi from '../../services/shift/shiftAssignmentApi';
import handleApiError from '../../utils/handleApiError';
import { formatDate, DISPLAY_DATE_FORMAT } from '../../utils/formatDate';
import { DAYS, dayText, patternSummary, SHIFT_STATUS_COLORS } from './shiftHelpers';

const ACTION_COLORS = { Created: 'green', Updated: 'blue', Cancelled: 'red' };

const empty = <Typography.Text type='secondary'>—</Typography.Text>;

// What a snapshot shows, field by field — compared between revisions to
// list what each change did.
const FIELDS = [
  { key: 'shift', label: 'Shift', value: (s) => (s.shift ? `${s.shift.code} — ${s.shift.name}` : null) },
  {
    key: 'period',
    label: 'Period',
    value: (s) => `${formatDate(s.date_from)} – ${formatDate(s.date_to)} (${dayjs(s.date_to).diff(dayjs(s.date_from), 'day') + 1} days)`,
  },
  { key: 'pattern', label: 'Weekly Pattern', value: (s) => (s.shift?.days ? patternSummary(s.shift.days) : null) },
  { key: 'grace', label: 'Grace', value: (s) => (s.shift ? `${s.shift.grace_minutes ?? 0} min` : null) },
  { key: 'relieved', label: 'Relieving', value: (s, names) => (s.relieved_employee_id ? (names[s.relieved_employee_id] || `Employee #${s.relieved_employee_id}`) : null) },
  { key: 'reason', label: 'Reason', value: (s) => s.reason || null },
  { key: 'status', label: 'Status', value: (s) => s.status || null },
];

const show = (field, v) => {
  if (v === null || v === undefined) return empty;
  return field === 'status' ? <Tag color={SHIFT_STATUS_COLORS[v]}>{v}</Tag> : v;
};

// The fields that differ from the previous revision's snapshot.
const changesBetween = (prev, next, names) => FIELDS
  .map((f) => ({ field: f.key, label: f.label, old: f.value(prev, names), new: f.value(next, names) }))
  .filter((c) => c.old !== c.new);

const when = (v) => dayjs(v).format(`${DISPLAY_DATE_FORMAT} hh:mm A`);

// A value as saved in a revision, tagged Current when no later revision
// changed it and the shifting is still active.
const SavedValue = ({ field, value, isCurrent }) => (
    <Space size={6} wrap>
      {show(field, value)}
      {isCurrent && value !== null && value !== undefined && <Tag color='green' style={{ marginInlineEnd: 0 }}>Current</Tag>}
    </Space>
);

// The shift's 7 days, one column each.
const PatternTable = ({ days }) => {
  const byDay = Object.fromEntries((days || []).map((d) => [d.day, d]));
  return (
    <Table
      rowKey='key'
      size='small'
      bordered
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={DAYS.map((day) => ({
        title: day.slice(0, 3),
        key: day,
        align: 'center',
        render: () => {
          const d = byDay[day];
          if (!d) return empty;
          if (d.is_day_off) return <Typography.Text type='secondary'>Day off</Typography.Text>;
          return (
            <>
              {dayText(d)}
              {d.break_minutes > 0 && <div style={{ fontSize: 12, color: '#8c8c8c' }}>{`${d.break_minutes} min break`}</div>}
            </>
          );
        },
      }))}
      dataSource={[{ key: 'pattern' }]}
    />
  );
};

// One labelled value in the summary banner, with an optional second line.
const Stat = ({ label, children, sub }) => (
  <>
    <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {label}
    </Typography.Text>
    <div style={{ fontSize: 14 }}>{children}</div>
    {sub && <Typography.Text type='secondary' style={{ fontSize: 12 }}>{sub}</Typography.Text>}
  </>
);

// Every revision of one shifting, oldest first: the full state when it was
// created, then what each update / cancel changed (previous → new), who
// changed it, when and why.
const ShiftHistoryModal = ({ assignment, onClose }) => {
  const { message } = App.useApp();
  // { revisions, relieved: { id: name }, employee } — kept until the close
  // animation ends: `assignment` is already null by then
  const [history, setHistory] = useState(null);

  const handleAfterOpenChange = async (isOpen) => {
    if (!isOpen) { setHistory(null); return; }
    try {
      const { data } = await shiftAssignmentApi.history(assignment.id);
      setHistory({ revisions: data.revisions, relieved: data.relieved || {}, employee: assignment.employee });
    } catch (error) {
      handleApiError(error, message);
      onClose();
    }
  };

  const revisions = history?.revisions || [];
  const names = history?.relieved || {};
  const current = revisions[revisions.length - 1]?.snapshot;
  const employee = history?.employee || assignment?.employee;
  const active = current?.status === 'Active';
  // what each revision changed against the one before it
  const changesAt = revisions.map((r, i) => (i ? changesBetween(revisions[i - 1].snapshot, r.snapshot, names) : []));
  // the first later revision that changed `field` after revision i
  const replacedBy = (i, field) => revisions.find((r, j) => j > i && changesAt[j].some((c) => c.field === field));
  const saved = (i, field, value) => <SavedValue field={field} value={value} isCurrent={!replacedBy(i, field) && active} />;

  const revisionContent = (r, i) => {
    const prev = revisions[i - 1]?.snapshot;
    const changes = changesAt[i];
    const changeColumns = [
      { title: 'Field', dataIndex: 'label', width: 140 },
      { title: 'Previous', dataIndex: 'old', render: (v, c) => show(c.field, v), onCell: () => ({ style: { background: 'rgba(255, 77, 79, 0.06)' } }) },
      { title: 'New', dataIndex: 'new', render: (v, c) => saved(i, c.field, v), onCell: () => ({ style: { background: 'rgba(82, 196, 26, 0.08)' } }) },
    ];
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <Tag color={ACTION_COLORS[r.action]}>{r.action}</Tag>
          {i === revisions.length - 1 && revisions.length > 1 && <Tag>Latest</Tag>}
          <Typography.Text type='secondary'>{`${when(r.created_at)} · ${r.changer?.name || 'System'}`}</Typography.Text>
          {!prev && <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>As first saved</div>}
        </div>
        {r.remarks && (
          <div style={{ marginBottom: 8 }}>
            <Typography.Text type='secondary'>{r.action === 'Cancelled' ? 'Cancel reason: ' : 'Remarks: '}</Typography.Text>
            <Typography.Text italic>{r.remarks}</Typography.Text>
          </div>
        )}
        {!prev ? (
          <Descriptions
            size='small'
            bordered
            column={1}
            styles={{ label: { width: 1, whiteSpace: 'nowrap' } }}
            // status lives in the summary; a cancel is its own entry
            items={FIELDS.filter((f) => !['pattern', 'status'].includes(f.key)).map((f) => ({
              key: f.key,
              label: f.label,
              children: saved(i, f.key, f.value(r.snapshot, names)),
            }))}
          />
        ) : changes.length ? (
          <Table rowKey='field' size='small' bordered pagination={false} columns={changeColumns} dataSource={changes} />
        ) : (
          <Typography.Text type='secondary'>No field changed.</Typography.Text>
        )}
        {/* the day-by-day pattern: on creation, and when a change gave it a
            different shift or pattern (break minutes aren't in the summary) */}
        {(!prev || changes.some((c) => ['shift', 'pattern'].includes(c.field))) && r.snapshot.shift?.days && (
          <div style={{ marginTop: 8 }}>
            <PatternTable days={r.snapshot.shift.days} />
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      keyboard={false}
      open={!!assignment}
      title={employee ? `Shifting History — ${employee.full_name}` : 'Shifting History'}
      onCancel={onClose}
      footer={null}
      afterOpenChange={handleAfterOpenChange}
      destroyOnHidden
      width={{ xs: '100%', sm: '95%', md: 820 }}
    >
      {!history ? <Spin style={{ display: 'block', margin: '32px auto' }} /> : (
        <>
          {current && (
            // the same summary banner as Salary History
            <div
              style={{
                background: '#f6ffed',
                border: '1px solid #d9f7be',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <Row gutter={[16, 12]} align='middle'>
                <Col xs={24} md={7}>
                  <Space size={12} align='center'>
                    <Avatar size={44} icon={<UserOutlined />} style={{ background: '#d9f7be', color: '#276221', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text strong style={{ fontSize: 15, color: '#1a4d0f', display: 'block' }}>
                        {employee?.full_name || '—'}
                      </Typography.Text>
                      <Space size={4} wrap>
                        {employee?.employee_code && <Tag style={{ marginTop: 2 }}>{employee.employee_code}</Tag>}
                        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                          {[employee?.branch?.name, employee?.position?.name].filter(Boolean).join(' · ')}
                        </Typography.Text>
                      </Space>
                    </div>
                  </Space>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Stat label='Status'>{show('status', current.status)}</Stat>
                </Col>
                <Col xs={12} sm={6} md={5}>
                  <Stat label='Shift' sub={current.shift?.name}>
                    <Typography.Text strong>{current.shift?.code || '—'}</Typography.Text>
                  </Stat>
                </Col>
                <Col xs={12} sm={6} md={6}>
                  <Stat label='Period' sub={`${dayjs(current.date_to).diff(dayjs(current.date_from), 'day') + 1} days`}>
                    <span style={{ whiteSpace: 'nowrap' }}>{`${formatDate(current.date_from)} – ${formatDate(current.date_to)}`}</span>
                  </Stat>
                </Col>
                <Col xs={12} sm={6} md={3}>
                  <Stat label='Revisions'>{revisions.length}</Stat>
                </Col>
                {current.relieved_employee_id && (
                  <Col xs={24}>
                    <Typography.Text type='secondary'>Relieving: </Typography.Text>
                    <Typography.Text>{FIELDS.find((f) => f.key === 'relieved').value(current, names)}</Typography.Text>
                  </Col>
                )}
              </Row>
            </div>
          )}
          <Typography.Paragraph type='secondary' style={{ fontSize: 12 }}>
            Oldest first. Each entry shows the shifting as saved at that time — values tagged Current still
            apply. What applies now is in the summary above.
          </Typography.Paragraph>
          <Timeline
            items={revisions.map((r, i) => ({
              color: ACTION_COLORS[r.action],
              content: revisionContent(r, i),
            }))}
          />
        </>
      )}
    </Modal>
  );
};

export default ShiftHistoryModal;
