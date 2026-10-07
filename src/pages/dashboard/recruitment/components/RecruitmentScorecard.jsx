import { useMemo } from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { FieldTimeOutlined, PercentageOutlined, HourglassOutlined, RightOutlined } from '@ant-design/icons';
import { computeTimeToFill } from '../timeToFill';
import { computeHiringEfficiency } from '../hiringEfficiency';
import { computeVacancyAging } from '../vacancyAging';

const { Text } = Typography;

const daysText = (v) => (v == null ? '—' : `${v} day${v === 1 ? '' : 's'}`);
const rate = (v) => (v == null ? '—' : `${v}%`);

function ScoreTile({ icon, color, label, value, detail, status, onOpen }) {
  return (
    <Card
      size='small'
      hoverable
      onClick={onOpen}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{ borderRadius: 8, height: '100%', borderTop: `3px solid ${color}` }}
      styles={{ body: { padding: 14 } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color, fontSize: 16 }}>{icon}</span>
        <Text strong>{label}</Text>
        <RightOutlined style={{ marginLeft: 'auto', fontSize: 10, color: '#bbb' }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      <Text type='secondary' style={{ fontSize: 12, display: 'block' }}>{detail}</Text>
      {status && <Text style={{ fontSize: 12, color: status.color, display: 'block', marginTop: 4 }}>{status.text}</Text>}
    </Card>
  );
}

// Overview headline for the Manpower Request KPIs (Time to Fill, Hiring
// Efficiency, Aging of Vacancies) — the same calculations as their sections,
// same filters; each tile opens its section (`onOpen(sectionId)`).
export default function RecruitmentScorecard({ mrfList, dateRange, filters, onOpen }) {
  const ttf = useMemo(() => computeTimeToFill(mrfList, dateRange, filters), [mrfList, dateRange, filters]);
  const he = useMemo(() => computeHiringEfficiency(mrfList, dateRange, filters), [mrfList, dateRange, filters]);
  const aging = useMemo(() => computeVacancyAging(mrfList, dateRange, filters), [mrfList, dateRange, filters]);

  const good = '#389e0d';
  const bad = '#cf1322';
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
      <Col xs={24} md={8}>
        <ScoreTile
          icon={<FieldTimeOutlined />} color='#722ed1' label='Time to Fill' value={daysText(ttf.average)}
          detail={`${ttf.filled} position${ttf.filled === 1 ? '' : 's'} filled in the period`}
          status={ttf.withinPct == null ? null : { text: `${ttf.withinPct}% within RF 25 / SUP 45 / MGR 60 days`, color: ttf.withinPct >= 100 ? good : bad }}
          onOpen={() => onOpen('time-to-fill')}
        />
      </Col>
      <Col xs={24} md={8}>
        <ScoreTile
          icon={<PercentageOutlined />} color={good} label='Hiring Efficiency' value={rate(he.rate)}
          detail={`${he.closed} closed ÷ ${he.open} open position${he.open === 1 ? '' : 's'}`}
          onOpen={() => onOpen('hiring-efficiency')}
        />
      </Col>
      <Col xs={24} md={8}>
        <ScoreTile
          icon={<HourglassOutlined />} color='#fa8c16' label='Aging of Vacancies' value={daysText(aging.average)}
          detail={`average of ${aging.count} open vacanc${aging.count === 1 ? 'y' : 'ies'}`}
          status={aging.count ? { text: `${aging.overStandard} past the time-to-fill standard`, color: aging.overStandard ? bad : good } : null}
          onOpen={() => onOpen('vacancy-aging')}
        />
      </Col>
    </Row>
  );
}
