import { useMemo } from 'react';
import { Row, Col, Card, Typography } from 'antd';
import ChartBox from './ChartBox';
import { CHART_OPTS, STAGE_COLORS, PRIMARY_GREEN } from '../chartSetup';
import { groupByKey, parseDateValue, daysBetween } from '../recruitmentMetrics';

const { Text } = Typography;

const monthLabel = (mk) => { const [y, m] = mk.split('-'); return new Date(+y, +m - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }); };

// Manpower Request — Time to Fill (this app only; vueportal's dashboard has no
// equivalent). Date Approved (MRF fully approved) → Date Hired, one row per
// hire (a position line can have several — ManpowerRequestDetailHire). MRFs
// not yet approved are skipped. Distinct from Avg Time to Hire (applicant →
// Hired stage): this one is MRF-sourced and includes internal transfers. The
// MRF list is scoped server-side to what the viewer can see.
export default function TimeToFill({ mrfList }) {
  const rows = useMemo(() => {
    const out = [];
    mrfList.forEach((mrf) => {
      const approvedDate = parseDateValue(mrf.date_approved);
      if (!approvedDate) return;
      (mrf.details || []).forEach((d) => (d.hires || []).forEach((hire) => {
        if (!hire.date_hired) return;
        const hiredDate = parseDateValue(hire.date_hired);
        const days = daysBetween(approvedDate, hiredDate);
        if (days === null) return;
        out.push({ position: d.position?.name || 'Unknown', hiredDate, days });
      }));
    });
    return out;
  }, [mrfList]);

  const average = rows.length ? Math.round(rows.reduce((s, r) => s + r.days, 0) / rows.length) : null;

  const byPosition = Object.entries(groupByKey(rows, 'position'))
    .map(([label, rs]) => [label, Math.round(rs.reduce((s, r) => s + r.days, 0) / rs.length)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const byMonth = {};
  rows.forEach((r) => {
    const mk = `${r.hiredDate.getFullYear()}-${String(r.hiredDate.getMonth() + 1).padStart(2, '0')}`;
    (byMonth[mk] = byMonth[mk] || []).push(r.days);
  });
  const monthKeys = Object.keys(byMonth).sort();

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={8}>
        <Card size='small' title='Avg. Time to Fill' style={{ borderRadius: 8, height: '100%' }}
          extra={<Text type='secondary' style={{ fontSize: 11 }}>Date Approved → Date Hired</Text>}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: PRIMARY_GREEN }}>{average ?? '—'}</div>
            <Text type='secondary'>day(s), across {rows.length} filled position{rows.length === 1 ? '' : 's'}</Text>
          </div>
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card size='small' title='Avg. Time to Fill by Position' style={{ borderRadius: 8, height: '100%' }}>
          <ChartBox
            type='bar'
            height={220}
            options={{ ...CHART_OPTS, indexAxis: 'y' }}
            data={{ labels: byPosition.map((e) => e[0]), datasets: [{ label: 'Avg Days to Fill', data: byPosition.map((e) => e[1]), backgroundColor: STAGE_COLORS.slice(0, byPosition.length), borderRadius: 4 }] }}
          />
        </Card>
      </Col>
      <Col xs={24}>
        <Card size='small' title='Time to Fill Trend (by Hire Month)' style={{ borderRadius: 8 }}>
          <ChartBox
            type='line'
            height={220}
            options={CHART_OPTS}
            data={{
              labels: monthKeys.map(monthLabel),
              datasets: [{ label: 'Avg Days to Fill', data: monthKeys.map((k) => Math.round(byMonth[k].reduce((s, d) => s + d, 0) / byMonth[k].length)), borderColor: '#722ed1', backgroundColor: 'rgba(114,46,209,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 }],
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
