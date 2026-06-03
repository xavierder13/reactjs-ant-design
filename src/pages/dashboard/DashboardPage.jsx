// src/pages/dashboard/DashboardPage.jsx

import {
  useEffect, useState, useCallback, useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import {
  Row, Col, Card, Divider, Typography,
  Input, Progress, Select, Button, Tag, Table, Tooltip, Spin,
  Alert, DatePicker,
} from 'antd';
import {
  CheckCircleOutlined, InfoCircleOutlined, WarningOutlined,
  AlertOutlined, ReloadOutlined,
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Legend,
  Tooltip as ChartTooltip,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import dayjs from 'dayjs';

ChartJS.register(
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Legend, ChartTooltip,
);

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const RECRUITMENT_STAGES = [
  'Screening', 'Reserved Applicant', 'Initial Interview', 'Exam',
  'B.I & Basic Req', 'Final Interview', 'Orientation', 'Hired',
];

const AGE_BAND_LABELS = ['18-25', '26-30', '31-35', '36-40', '41-45', '46-50', '51+'];

const PRIMARY_GREEN = '#389e0d';

const STAGE_COLORS = [
  '#1677ff', '#FB8C00', '#9C27B0', '#009688', 
  '#CDDC39','#00BCD4', '#607D8B', '#4CAF50', 
];

const CHART_COLORS = [
  '#389e0d', '#1677ff', '#faad14', '#f5222d',
  '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96',
  '#2f54eb', '#a0d911', '#52c41a',
];

const STAGE_VUETIFY_COLOR_MAP = {
  'Screening':         '#FB8C00',
  'Initial Interview': '#9C27B0',
  'Exam':              '#009688',
  'B.I & Basic Req':   '#CDDC39',
  'Final Interview':   '#00BCD4',
  'Orientation':       '#607D8B',
  'Hired':             '#4CAF50',
};

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────────────────
const groupByKey = (arr, key) =>
  arr.reduce((acc, r) => {
    (acc[r[key]] = acc[r[key]] || []).push(r);
    return acc;
  }, {});

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const getAgeBand = (age) => {
  if (!age) return 'Unknown';
  if (age <= 25) return '18-25';
  if (age <= 30) return '26-30';
  if (age <= 35) return '31-35';
  if (age <= 40) return '36-40';
  if (age <= 45) return '41-45';
  if (age <= 50) return '46-50';
  return '51+';
};

const parseDateValue = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000));
  if (typeof v === 'string' && v.trim()) {
    const mmddyyyy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyy) return new Date(+mmddyyyy[3], +mmddyyyy[1] - 1, +mmddyyyy[2]);
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  return null;
};

const daysBetween = (a, b) => {
  if (!a || !b) return null;
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 ? diff : null;
};

const getTodayIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const getJanFirstThisYearIso = () => `${new Date().getFullYear()}-01-01`;

const normalizeProgressStatusToStage = (progressStatus) => {
  if (!progressStatus) return 'Screening';
  const s = progressStatus.toLowerCase();
  if (s.includes('hired'))                            return 'Hired';
  if (s.includes('orientation'))                      return 'Orientation';
  if (s.includes('final interview'))                  return 'Final Interview';
  if (s.includes('b.i') || s.includes('basic req'))  return 'B.I & Basic Req';
  if (s.includes('exam'))                             return 'Exam';
  if (s.includes('initial interview'))                return 'Initial Interview';
  if (s.includes('reserved'))                         return 'Reserved Applicant';
  return 'Screening';
};

const normalizeApiApplicantRow = (apiRow) => {
  const dateApplied     = parseDateValue(apiRow.date_applied || apiRow.created_at || null);
  const dateScreening   = parseDateValue(apiRow.screening_date);
  const dateInitial     = parseDateValue(apiRow.initial_interview_date);
  const dateIq          = parseDateValue(apiRow.iq_date);
  const dateBi          = parseDateValue(apiRow.bi_date);
  const dateFinal       = parseDateValue(apiRow.final_interview_date);
  const dateOrientation = parseDateValue(apiRow.orientation_date);
  const dateContract    = parseDateValue(apiRow.signing_of_contract_date);

  const isHired    = Number(apiRow.orientation_status) === 1 && !!apiRow.signing_of_contract_date;
  const dateHired  = isHired ? dateContract : null;
  const daysToHire = dateApplied && dateHired
    ? Math.round((dateHired - dateApplied) / 86400000) : null;
  const age = parseInt(apiRow.age) || null;
  const recruitmentStage = isHired
    ? 'Hired' : normalizeProgressStatusToStage(apiRow.progress_status);

  return {
    applicantName:          String(apiRow.name || ''),
    dateApplied,
    dateHired,
    dateScreening,
    dateInitial,
    dateIq,
    dateBi,
    dateFinal,
    dateOrientation,
    dateContract,
    orientationContractGap: daysBetween(dateOrientation, dateContract),
    applicationSource:      String(apiRow.how_learn || 'Others'),
    appliedPosition:        String(apiRow.position_name || 'Unknown'),
    appliedBranch:          String(apiRow.branch_applied || apiRow.branch_name || 'Unknown'),
    applicantGender:        String(apiRow.gender || 'Unknown'),
    applicantAge:           age,
    applicantAgeBand:       getAgeBand(age),
    recruitmentStage,
    rawProgressStatus:      String(apiRow.progress_status || ''),
    isHired:                recruitmentStage === 'Hired',
    daysToHire,
    educAttain:             String(apiRow.educ_attain || 'Unknown'),
    civilStatus:            String(apiRow.civil_status || 'Unknown'),
    employmentPosition:     String(apiRow.employment_position || ''),
    employmentBranch:       String(apiRow.employment_branch || ''),
    positionPreference:     String(apiRow.position_preference || ''),
    branchPreference:       String(apiRow.branch_preference || ''),
    hiringOfficerName:      String(apiRow.hiring_officer_name || ''),
    hiringOfficerPosition:  String(apiRow.hiring_officer_position || ''),
    iqStatus:               apiRow.iq_status,
  };
};

const getRankColor = (rank) =>
  rank === 1 ? '#faad14' : rank === 2 ? '#1677ff' : rank === 3 ? '#722ed1' : '#888';

const conversionColor = (current, previous) => {
  const rate = pct(current, previous);
  if (rate >= 70) return 'success';
  if (rate >= 40) return 'warning';
  return 'error';
};

// ─── CHART OPTIONS ─────────────────────────────────────────────────────────────
const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: true },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
    y: { ticks: { color: '#888', font: { size: 10 } } },
  },
};

const CHART_OPTS_LEGEND = {
  ...CHART_OPTS,
  plugins: {
    ...CHART_OPTS.plugins,
    legend: { display: true, labels: { font: { size: 11 }, boxWidth: 10, padding: 12 } },
  },
};

const CHART_OPTS_STACKED = {
  ...CHART_OPTS,
  plugins: {
    ...CHART_OPTS.plugins,
    legend: { display: true, labels: { font: { size: 10 }, boxWidth: 9, padding: 8 } },
  },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } },
    y: { stacked: true, ticks: { color: '#888', font: { size: 10 } } },
  },
};

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function StageCard({ stageCard, onClick }) {
  const color = STAGE_VUETIFY_COLOR_MAP[stageCard.stageName] || '#888';
  return (
    <Card
      hoverable
      onClick={onClick}
      size='small'
      style={{ borderRadius: 8, cursor: 'pointer', height: '100%' }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ height: 5, background: color, borderRadius: '8px 8px 0 0' }} />
      <div style={{ padding: '12px' }}>
        <Text style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {stageCard.stageName}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Tooltip title={stageCard.stageName === 'Hired' ? 'Hired' : 'On Process'}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0,
            }}>
              {stageCard.countStageItems}
            </div>
          </Tooltip>
          {stageCard.failedCount != null && (
            <Tooltip title='Failed / Not Qualified'>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: '#f5222d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {stageCard.failedCount}
              </div>
            </Tooltip>
          )}
          {stageCard.reservedCount != null && (
            <Tooltip title='Reserved'>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', background: '#1A237E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {stageCard.reservedCount}
              </div>
            </Tooltip>
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Tag color={color} style={{ fontSize: 10, margin: 0 }}>
            {stageCard.stageName !== 'Hired' ? 'on process' : 'hired'}
          </Tag>
          {stageCard.failedCount != null && (
            <Tag color='error' style={{ fontSize: 10, margin: 0 }}>failed / non-compliant</Tag>
          )}
          {stageCard.reservedCount != null && (
            <Tag color='#1A237E' style={{ fontSize: 10, margin: 0, color: '#fff' }}>reserved</Tag>
          )}
        </div>
      </div>
    </Card>
  );
}

function KpiCard({ icon, label, value, hexColor, sub }) {
  return (
    <Card
      size='small'
      style={{ borderRadius: 8, borderTop: `3px solid ${hexColor}`, height: '100%' }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 16, marginRight: 4 }}>{icon}</span>
        <Text style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Text>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: hexColor, lineHeight: 1, marginTop: 4 }}>
        {value}
      </div>
      <Text type='secondary' style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{sub}</Text>
    </Card>
  );
}

function GenderBreakdownCard({ genderBreakdownStats, totalCount }) {
  return (
    <Row gutter={[12, 12]}>
      {genderBreakdownStats.map((g, i) => (
        <Col key={g.gender} span={12}>
          <Card size='small' style={{ borderRadius: 8, textAlign: 'center' }} styles={{ body: { padding: '12px' } }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: CHART_COLORS[i] }}>{g.totalCount}</div>
            <Text type='secondary' style={{ fontSize: 11 }}>{g.gender} Applicants</Text>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#52c41a', marginTop: 6 }}>
              {g.hiredCount} hired ({pct(g.hiredCount, g.totalCount)}%)
            </div>
            <Progress
              percent={pct(g.totalCount, totalCount)}
              size='small'
              showInfo={false}
              strokeColor={CHART_COLORS[i]}
              style={{ marginTop: 6 }}
            />
            <Text type='secondary' style={{ fontSize: 10 }}>
              {pct(g.totalCount, totalCount)}% of total
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function HeatmapTable({ sourceLabels, stageLabels, dataGrid, maxValue }) {
  const getCellStyle = (source, stage) => {
    const val = dataGrid[source + '||' + stage] || 0;
    const intensity = val / (maxValue || 1);
    const alpha = (0.12 + intensity * 0.75).toFixed(2);
    return {
      background: `rgba(56,158,13,${alpha})`,
      color: intensity > 0.5 ? '#fff' : '#555',
      fontWeight: intensity > 0.3 ? 700 : 400,
      padding: '6px',
      textAlign: 'center',
      borderRadius: 4,
      minWidth: 36,
      cursor: 'default',
    };
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 3, fontSize: 11, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px' }} />
            {stageLabels.map((s) => (
              <th key={s} style={{ padding: '4px 6px', color: '#888', fontWeight: 700, fontSize: 10, writingMode: 'vertical-rl', minWidth: 38, whiteSpace: 'nowrap' }}>
                {s.length > 12 ? s.slice(0, 11) + '…' : s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sourceLabels.map((src) => (
            <tr key={src}>
              <td style={{ padding: '4px 10px', color: '#555', fontWeight: 600, whiteSpace: 'nowrap' }}>{src}</td>
              {stageLabels.map((stage) => (
                <td key={stage} style={getCellStyle(src, stage)}>
                  {dataGrid[src + '||' + stage] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReservedAgingSection({ agingRows, agingBuckets }) {
  const columns = [
    { title: 'Applicant',    dataIndex: 'applicantName',    key: 'applicantName' },
    { title: 'Stage',        dataIndex: 'recruitmentStage', key: 'recruitmentStage' },
    { title: 'Branch',       dataIndex: 'appliedBranch',    key: 'appliedBranch' },
    { title: 'Position',     dataIndex: 'appliedPosition',  key: 'appliedPosition' },
    { title: 'Date Applied', dataIndex: 'dateAppliedStr',   key: 'dateAppliedStr' },
    {
      title: 'Days Waiting', dataIndex: 'daysWaiting', key: 'daysWaiting', align: 'right',
      render: (d) => (
        <Tag color={d > 30 ? 'error' : d > 14 ? 'warning' : 'success'} style={{ fontSize: 10 }}>
          {d}d
        </Tag>
      ),
    },
  ];
  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {agingBuckets.map((b) => (
          <Col key={b.label} xs={12} sm={6}>
            <div style={{ textAlign: 'center', padding: '8px', borderLeft: `3px solid ${b.color}`, background: b.bg, borderRadius: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: b.color }}>{b.count}</div>
              <Text style={{ fontSize: 11 }}>{b.label}</Text>
            </div>
          </Col>
        ))}
      </Row>
      <Table
        size='small'
        dataSource={agingRows.map((r, i) => ({ ...r, key: i }))}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
}

function PlacementMatchCard({ stats }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ flex: 1 }}>Position Preference Match Rate</Text>
        <Tag color={stats.positionMatchPct >= 70 ? 'success' : 'warning'}>
          {stats.positionMatchPct}% matched
        </Tag>
      </div>
      <Progress percent={stats.positionMatchPct} strokeColor={PRIMARY_GREEN} style={{ marginBottom: 8 }} />
      <Text type='secondary' style={{ fontSize: 11 }}>
        {stats.positionMatched} of {stats.posCompared} hired applicants placed in preferred position.
      </Text>
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <Text strong style={{ flex: 1 }}>Branch Preference Match</Text>
        <Tag color={stats.branchMatchPct >= 70 ? 'blue' : 'warning'}>
          {stats.branchMatchPct}% matched
        </Tag>
      </div>
      <Progress percent={stats.branchMatchPct} strokeColor='#1677ff' style={{ marginBottom: 8 }} />
      <Text type='secondary' style={{ fontSize: 11 }}>
        {stats.branchMatched} of {stats.branchCompared} matched preferred branch.
      </Text>
    </div>
  );
}

function ChartBox({ type, data, options, height = 240 }) {
  if (!data) return null;
  const ChartComp = type === 'doughnut' ? Doughnut : type === 'line' ? Line : Bar;
  return (
    <div style={{ height }}>
      <ChartComp data={data} options={{ ...options, responsive: true, maintainAspectRatio: false }} />
    </div>
  );
}

// ─── Recruitment Funnel Chart COMPONENT ───────────────────────────────────────────────────
function RecruitmentFunnelChart({ funnelRows }) {
  if (!funnelRows || !funnelRows.length) return null;

  const maxCount  = funnelRows[0].count || 1;
  const svgW      = 500;          // ← wider to give labels room
  const rowH      = 52;
  const svgH      = funnelRows.length * rowH + 20;
  const maxW      = 220;          // ← max trapezoid width (center area)
  const minW      = 120;          // ← min width at bottom (gradual narrowing)
  const centerX   = svgW / 2;
  const labelW    = 130;          // ← reserved width for left label
  const convW     = 60;           // ← reserved width for right conversion %

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={svgW} height={svgH} style={{ fontFamily: 'inherit', display: 'block', margin: '0 auto' }}>
        {funnelRows.map((row, i) => {
          const prevCount = i === 0 ? maxCount : funnelRows[i - 1].count;
          const topW  = i === 0 ? maxW : minW + (maxW - minW) * (prevCount / maxCount);
          const botW  = minW + (maxW - minW) * (row.count / maxCount);
          const topX  = centerX - topW / 2;
          const botX  = centerX - botW / 2;
          const y     = i * rowH + 10;
          const color = STAGE_COLORS[i % STAGE_COLORS.length];

          const convPct = i > 0 && funnelRows[i - 1].count > 0
            ? pct(row.count, funnelRows[i - 1].count) : null;

          const convColor = convPct === null ? '#888'
            : convPct >= 70 ? '#389e0d'
            : convPct >= 40 ? '#faad14'
            : '#f5222d';

          return (
            <g key={row.label}>
              {/* ── Trapezoid ───────────────────────────────────── */}
              <polygon
                points={`${topX},${y} ${topX + topW},${y} ${botX + botW},${y + rowH - 4} ${botX},${y + rowH - 4}`}
                fill={color}
                opacity={0.82}
              />

              {/* ── Left label ──────────────────────────────────── */}
              <foreignObject
                x={0}
                y={y + rowH / 2 - 14}
                width={labelW}
                height={28}
              >
                <div
                  xmlns='http://www.w3.org/1999/xhtml'
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#444',
                    textAlign: 'right',
                    paddingRight: 8,
                    lineHeight: '14px',
                    wordBreak: 'break-word',
                    width: '100%',
                  }}
                >
                  {row.label}
                </div>
              </foreignObject>

              {/* ── Count (center of trapezoid) ──────────────────── */}
              <text
                x={centerX}
                y={y + rowH / 2 + 1}
                textAnchor='middle'
                dominantBaseline='middle'
                fontSize={13}
                fill='#fff'
                fontWeight={800}
              >
                {row.count}
              </text>

              {/* ── % of total (below count) ─────────────────────── */}
              <text
                x={centerX}
                y={y + rowH / 2 + 14}
                textAnchor='middle'
                dominantBaseline='middle'
                fontSize={9}
                fill='rgba(255,255,255,0.85)'
                fontWeight={500}
              >
                {pct(row.count, maxCount)}% of total
              </text>

              {/* ── Conversion % (right side) ────────────────────── */}
              {convPct !== null && (
                <text
                  x={topX + topW + 10}
                  y={y + rowH / 2}
                  textAnchor='start'
                  dominantBaseline='middle'
                  fontSize={10}
                  fill={convColor}
                  fontWeight={700}
                >
                  ↓{convPct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SECTION LABEL ─────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: '#aaa',
    letterSpacing: 1.5, textTransform: 'uppercase',
    borderBottom: '1px solid #e8e8e8',
    paddingBottom: 6, marginBottom: 12,
  }}>
    {children}
  </div>
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const navigate = useNavigate();

  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [allApplicantRows,    setAllApplicantRows]     = useState([]);
  const [positions,           setPositions]            = useState([]);
  const [branches,            setBranches]             = useState([]);

  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    from: getJanFirstThisYearIso(),
    to:   getTodayIso(),
  });

  const [applicantFilters, setApplicantFilters] = useState({
    branch: '', position: '', source: '', stage: '', gender: '',
  });

  const applicantFilterDefs = [
    { label: 'Branch',   key: 'branch'   },
    { label: 'Position', key: 'position' },
    { label: 'Source',   key: 'source'   },
    { label: 'Stage',    key: 'stage'    },
  ];

  // ── computed: dateFilteredApplicants ───────────────────────────────────────
  const dateFilteredApplicants = useMemo(() => {
    const fromDate = analyticsDateRange.from ? new Date(analyticsDateRange.from) : null;
    const toDate   = analyticsDateRange.to   ? new Date(analyticsDateRange.to + 'T23:59:59') : null;
    return allApplicantRows.filter((a) => {
      if (applicantFilters.branch   && a.appliedBranch     !== applicantFilters.branch)   return false;
      if (applicantFilters.position && a.appliedPosition   !== applicantFilters.position) return false;
      if (applicantFilters.source   && a.applicationSource !== applicantFilters.source)   return false;
      if (applicantFilters.gender   && a.applicantGender   !== applicantFilters.gender)   return false;
      if (applicantFilters.stage    && a.recruitmentStage  !== applicantFilters.stage)    return false;
      const dateRef = a.dateHired ?? a.dateApplied;
      if (fromDate && dateRef && dateRef < fromDate) return false;
      if (toDate   && dateRef && dateRef > toDate)   return false;
      return true;
    });
  }, [allApplicantRows, applicantFilters, analyticsDateRange]);

  const hiredApplicants = useMemo(() => {
    const fromDate = analyticsDateRange.from ? new Date(analyticsDateRange.from) : null;
    const toDate   = analyticsDateRange.to   ? new Date(analyticsDateRange.to + 'T23:59:59') : null;
    return allApplicantRows.filter((a) => {
      if (!a.isHired || !a.dateHired) return false;
      if (applicantFilters.branch   && a.appliedBranch     !== applicantFilters.branch)   return false;
      if (applicantFilters.position && a.appliedPosition   !== applicantFilters.position) return false;
      if (applicantFilters.source   && a.applicationSource !== applicantFilters.source)   return false;
      if (applicantFilters.gender   && a.applicantGender   !== applicantFilters.gender)   return false;
      if (fromDate && a.dateHired < fromDate) return false;
      if (toDate   && a.dateHired > toDate)   return false;
      return true;
    });
  }, [allApplicantRows, applicantFilters, analyticsDateRange]);

  const allDateFilteredApplicants = useMemo(
    () => [...dateFilteredApplicants, ...hiredApplicants],
    [dateFilteredApplicants, hiredApplicants],
  );

  const daysToHireValues = useMemo(
    () => dateFilteredApplicants.filter((a) => a.daysToHire > 0).map((a) => a.daysToHire),
    [dateFilteredApplicants],
  );

  const averageDaysToHire = useMemo(
    () => daysToHireValues.length
      ? Math.round(daysToHireValues.reduce((a, b) => a + b, 0) / daysToHireValues.length)
      : null,
    [daysToHireValues],
  );

  const topApplicationSource = useMemo(() => {
    const entries = Object.entries(groupByKey(dateFilteredApplicants, 'applicationSource'))
      .sort((a, b) => b[1].length - a[1].length);
    return entries[0] || null;
  }, [dateFilteredApplicants]);

  const kpiCards = useMemo(() => [
    { icon: '📥', label: 'Total Applicants', hexColor: '#1677ff',    value: dateFilteredApplicants.length,                                           sub: `${pct(hiredApplicants.length, dateFilteredApplicants.length)}% hire rate` },
    { icon: '✅', label: 'Total Hired',       hexColor: PRIMARY_GREEN, value: hiredApplicants.length,                                                 sub: `${hiredApplicants.length} confirmed hires` },
    { icon: '⏱️', label: 'Avg Time to Hire', hexColor: '#faad14',    value: averageDaysToHire != null ? `${averageDaysToHire}d` : 'N/A',             sub: `${daysToHireValues.length} data points` },
    { icon: '📣', label: 'Top Source',        hexColor: '#722ed1',    value: topApplicationSource ? topApplicationSource[0] : '—',                    sub: topApplicationSource ? `${topApplicationSource[1].length} applicants` : '' },
    { icon: '🎯', label: 'Hire Rate',          hexColor: '#13c2c2',   value: `${pct(hiredApplicants.length, dateFilteredApplicants.length)}%`,         sub: `${hiredApplicants.length} of ${dateFilteredApplicants.length}` },
    { icon: '📅', label: 'Period From',        hexColor: PRIMARY_GREEN, value: analyticsDateRange.from ? analyticsDateRange.from.slice(0, 7) : 'All', sub: `to ${analyticsDateRange.to || 'today'}` },
  ], [dateFilteredApplicants, hiredApplicants, averageDaysToHire, daysToHireValues, topApplicationSource, analyticsDateRange]);

  const recruitmentStageCards = useMemo(() => {
    const countOnProcess = (keyword) =>
      dateFilteredApplicants.filter((a) =>
        a.rawProgressStatus.toLowerCase().includes(keyword.toLowerCase()) &&
        /on process/i.test(a.rawProgressStatus)
      ).length;
    const countFailed = (keyword) =>
      dateFilteredApplicants.filter((a) =>
        a.rawProgressStatus.toLowerCase().includes(keyword.toLowerCase()) &&
        /failed|not qualified|non-compliant/i.test(a.rawProgressStatus)
      ).length;
    const countReserved = () =>
      dateFilteredApplicants.filter((a) => /reserved/i.test(a.rawProgressStatus)).length;

    return [
      { stageName: 'Screening',         routePath: '/recruitment/screening-list',         countStageItems: countOnProcess('Screening'),         failedCount: countFailed('Screening'),        reservedCount: countReserved() },
      { stageName: 'Initial Interview', routePath: '/recruitment/initial-interview-list', countStageItems: countOnProcess('Initial Interview'), failedCount: countFailed('Initial Interview'), reservedCount: null },
      { stageName: 'Exam',              routePath: '/recruitment/iq-test-list',           countStageItems: countOnProcess('Exam'),              failedCount: countFailed('Exam'),              reservedCount: null },
      { stageName: 'B.I & Basic Req',   routePath: '/recruitment/bi-list',                countStageItems: countOnProcess('B.I & Basic Req'),   failedCount: countFailed('B.I & Basic Req'),   reservedCount: null },
      { stageName: 'Final Interview',   routePath: '/recruitment/final-interview-list',   countStageItems: countOnProcess('Final Interview'),   failedCount: countFailed('Final Interview'),   reservedCount: null },
      { stageName: 'Orientation',       routePath: '/recruitment/orientation-list',       countStageItems: countOnProcess('Orientation'),       failedCount: countFailed('Orientation'),       reservedCount: null },
      { stageName: 'Hired',             routePath: '/recruitment/hired-list',             countStageItems: dateFilteredApplicants.filter((a) => a.dateHired !== null).length, failedCount: null, reservedCount: null },
    ];
  }, [dateFilteredApplicants]);

  const recruitmentFunnelRows = useMemo(() => {
    const countStage = (keyword) =>
      dateFilteredApplicants.filter((a) =>
        a.rawProgressStatus.toLowerCase().includes(keyword.toLowerCase())
      ).length;
    return [
      { label: 'Applications',      count: dateFilteredApplicants.length },
      { label: 'Screening',         count: countStage('Screening') },
      { label: 'Initial Interview', count: countStage('Initial Interview') },
      { label: 'Exam',              count: countStage('Exam') },
      { label: 'B.I & Basic Req',   count: countStage('B.I & Basic Req') },
      { label: 'Final Interview',   count: countStage('Final Interview') },
      { label: 'Orientation',       count: countStage('Orientation') },
      { label: 'Hired',             count: dateFilteredApplicants.filter((a) => a.dateHired !== null).length },
    ];
  }, [dateFilteredApplicants]);

  const genderBreakdownStats = useMemo(() => {
    const genders = [...new Set(allDateFilteredApplicants.map((a) => a.applicantGender))]
      .filter((g) => g && g !== 'Unknown');
    return genders.map((gender) => ({
      gender,
      totalCount: allDateFilteredApplicants.filter((a) => a.applicantGender === gender).length,
      hiredCount: hiredApplicants.filter((a) => a.applicantGender === gender).length,
    }));
  }, [allDateFilteredApplicants, hiredApplicants]);

  const topPositionEntries = useMemo(() =>
    Object.entries(groupByKey(allDateFilteredApplicants, 'appliedPosition'))
      .sort((a, b) => b[1].length - a[1].length).slice(0, 10)
      .map((entry, i) => ({
        rank: i + 1,
        positionName: entry[0],
        appliedCount: entry[1].length,
        hiredCount: hiredApplicants.filter((a) => a.appliedPosition === entry[0]).length,
        key: i,
      })),
  [allDateFilteredApplicants, hiredApplicants]);

  const branchBreakdownEntries = useMemo(() =>
    Object.entries(groupByKey(allDateFilteredApplicants, 'appliedBranch'))
      .sort((a, b) => b[1].length - a[1].length)
      .map((entry, i) => ({
        rank: i + 1,
        branchName: entry[0],
        appliedCount: entry[1].length,
        hiredCount: hiredApplicants.filter((a) => a.appliedBranch === entry[0]).length,
        key: i,
      })),
  [allDateFilteredApplicants, hiredApplicants]);

  const heatmapSourceLabels = useMemo(() =>
    [...new Set(dateFilteredApplicants.map((a) => a.applicationSource))].sort().slice(0, 8),
  [dateFilteredApplicants]);

  const heatmapStageLabels  = RECRUITMENT_STAGES.slice(0, 7);

  const heatmapDataGrid = useMemo(() => {
    const grid = {};
    dateFilteredApplicants.forEach((a) => {
      const key = a.applicationSource + '||' + a.recruitmentStage;
      grid[key] = (grid[key] || 0) + 1;
    });
    return grid;
  }, [dateFilteredApplicants]);

  const heatmapMaxValue = useMemo(() =>
    Math.max(...Object.values(heatmapDataGrid), 1), [heatmapDataGrid]);

  const avgDaysPerStage = useMemo(() => {
    const avg = (arr) => arr.length
      ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const all = dateFilteredApplicants;
    return {
      labels: ['Screening', 'Initial Int.', 'Exam', 'B.I & Bsc Req', 'Final Int.', 'Orientation'],
      data: [
        avg(all.filter((a) => a.dateApplied && a.dateScreening).map((a) => daysBetween(a.dateApplied, a.dateScreening))),
        avg(all.filter((a) => a.dateScreening && a.dateInitial).map((a) => daysBetween(a.dateScreening, a.dateInitial))),
        avg(all.filter((a) => a.dateInitial && a.dateIq).map((a) => daysBetween(a.dateInitial, a.dateIq))),
        avg(all.filter((a) => a.dateIq && a.dateBi).map((a) => daysBetween(a.dateIq, a.dateBi))),
        avg(all.filter((a) => a.dateBi && a.dateFinal).map((a) => daysBetween(a.dateBi, a.dateFinal))),
        avg(all.filter((a) => a.dateFinal && a.dateOrientation).map((a) => daysBetween(a.dateFinal, a.dateOrientation))),
      ],
    };
  }, [dateFilteredApplicants]);

  const stageOutcomeData = useMemo(() => {
    const all = dateFilteredApplicants;
    const stages = ['Screening', 'Initial Interview', 'Exam', 'B.I & Basic Req'];
    return {
      labels: stages,
      onProcess:    stages.map((s) => all.filter((a) => a.rawProgressStatus.toLowerCase().includes(s.toLowerCase()) && /on process/i.test(a.rawProgressStatus)).length),
      failed:       stages.map((s) => all.filter((a) => a.rawProgressStatus.toLowerCase().includes(s.toLowerCase()) && /failed|not qualified/i.test(a.rawProgressStatus)).length),
      nonCompliant: stages.map((s) => all.filter((a) => a.rawProgressStatus.toLowerCase().includes(s.toLowerCase()) && /non-compliant/i.test(a.rawProgressStatus)).length),
    };
  }, [dateFilteredApplicants]);

  const nonCompliantByMonth = useMemo(() => {
    const byMonth = {};
    dateFilteredApplicants.forEach((a) => {
      if (!a.dateApplied || !/non-compliant/i.test(a.rawProgressStatus)) return;
      const mk = a.dateApplied.getFullYear() + '-' + String(a.dateApplied.getMonth() + 1).padStart(2, '0');
      byMonth[mk] = (byMonth[mk] || 0) + 1;
    });
    const keys = Object.keys(byMonth).sort();
    return {
      labels: keys.map((mk) => { const [y, m] = mk.split('-'); return new Date(+y, +m - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }); }),
      data: keys.map((k) => byMonth[k]),
    };
  }, [dateFilteredApplicants]);

  const reservedAgingRows = useMemo(() => {
    const today = new Date();
    return dateFilteredApplicants
      .filter((a) => /reserved/i.test(a.rawProgressStatus))
      .map((a) => ({
        applicantName:    a.applicantName,
        recruitmentStage: a.recruitmentStage,
        appliedBranch:    a.appliedBranch,
        appliedPosition:  a.appliedPosition,
        dateAppliedStr:   a.dateApplied ? dayjs(a.dateApplied).format('MM/DD/YYYY') : '—',
        daysWaiting:      a.dateApplied ? Math.round((today - a.dateApplied) / 86400000) : 0,
      }))
      .sort((a, b) => b.daysWaiting - a.daysWaiting);
  }, [dateFilteredApplicants]);

  const reservedAgingBuckets = useMemo(() => [
    { label: '0–7 days',   color: '#389e0d', bg: '#f6ffed', count: reservedAgingRows.filter((r) => r.daysWaiting <= 7).length },
    { label: '8–14 days',  color: '#faad14', bg: '#fffbe6', count: reservedAgingRows.filter((r) => r.daysWaiting > 7  && r.daysWaiting <= 14).length },
    { label: '15–30 days', color: '#fa8c16', bg: '#fff7e6', count: reservedAgingRows.filter((r) => r.daysWaiting > 14 && r.daysWaiting <= 30).length },
    { label: '>30 days',   color: '#f5222d', bg: '#fff1f0', count: reservedAgingRows.filter((r) => r.daysWaiting > 30).length },
  ], [reservedAgingRows]);

  const educAttainStats = useMemo(() =>
    Object.entries(groupByKey(allDateFilteredApplicants, 'educAttain'))
      .filter(([k]) => k && k !== 'Unknown')
      .sort((a, b) => b[1].length - a[1].length)
      .map(([educ, rows]) => ({
        educ,
        count:    rows.length,
        hired:    hiredApplicants.filter((a) => a.educAttain === educ).length,
        hireRate: pct(hiredApplicants.filter((a) => a.educAttain === educ).length, rows.length),
      })),
  [allDateFilteredApplicants, hiredApplicants]);

  const civilStatusStats = useMemo(() =>
    Object.entries(groupByKey(allDateFilteredApplicants, 'civilStatus'))
      .filter(([k]) => k && k !== 'Unknown')
      .sort((a, b) => b[1].length - a[1].length)
      .map(([status, rows]) => ({ status, count: rows.length })),
  [allDateFilteredApplicants]);

  const hiringOfficerStats = useMemo(() => {
    const hired = hiredApplicants.filter((a) => a.hiringOfficerName);
    return Object.entries(groupByKey(hired, 'hiringOfficerName'))
      .sort((a, b) => b[1].length - a[1].length).slice(0, 15)
      .map((entry, i) => {
        const rows    = entry[1];
        const days    = rows.filter((a) => a.daysToHire > 0).map((a) => a.daysToHire);
        const avgDays = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
        return {
          rank: i + 1,
          officerName:     entry[0],
          officerPosition: rows[0].hiringOfficerPosition,
          hiredCount:      rows.length,
          avgDays,
          hireRate: pct(rows.length, dateFilteredApplicants.filter((a) => a.hiringOfficerName === entry[0]).length || rows.length),
          key: i,
        };
      });
  }, [hiredApplicants, dateFilteredApplicants]);

  const placementMatchStats = useMemo(() => {
    const posMap    = {};
    const branchMap = {};
    positions.forEach((p) => { posMap[String(p.id)]    = p.name; });
    branches.forEach((b)  => { branchMap[String(b.id)] = b.name; });
    const splitIds  = (str) => String(str || '').split(',').map((s) => s.trim()).filter(Boolean);
    const withPosPref    = hiredApplicants.filter((a) => a.positionPreference && a.employmentPosition);
    const withBranchPref = hiredApplicants.filter((a) => a.branchPreference   && a.employmentBranch);
    const posMatched = withPosPref.filter((a) => {
      const preferred = splitIds(a.positionPreference).map((id) => (posMap[id] || '').toLowerCase().trim()).filter(Boolean);
      return preferred.includes(String(a.employmentPosition).toLowerCase().trim());
    }).length;
    const branchMatched = withBranchPref.filter((a) => {
      const preferred = splitIds(a.branchPreference).map((id) => (branchMap[id] || '').toLowerCase().trim()).filter(Boolean);
      return preferred.includes(String(a.employmentBranch).toLowerCase().trim());
    }).length;
    return {
      posCompared:      withPosPref.length,
      positionMatched:  posMatched,
      positionMatchPct: pct(posMatched, withPosPref.length),
      branchCompared:   withBranchPref.length,
      branchMatched,
      branchMatchPct:   pct(branchMatched, withBranchPref.length),
    };
  }, [hiredApplicants, positions, branches]);

  const iqPassRateByPosition = useMemo(() => {
    const all = dateFilteredApplicants.filter((a) => a.iqStatus != null);
    return Object.entries(groupByKey(all, 'appliedPosition'))
      .sort((a, b) => b[1].length - a[1].length).slice(0, 8)
      .map(([pos, rows]) => ({
        pos,
        passed:   rows.filter((a) => Number(a.iqStatus) === 1).length,
        failed:   rows.filter((a) => Number(a.iqStatus) === 2).length,
        passRate: pct(rows.filter((a) => Number(a.iqStatus) === 1).length, rows.length),
      }));
  }, [dateFilteredApplicants]);

  const recruitmentInsights = useMemo(() => {
    if (!dateFilteredApplicants.length) return [];
    const hireRate          = pct(hiredApplicants.length, dateFilteredApplicants.length);
    const topSrc            = Object.entries(groupByKey(dateFilteredApplicants, 'applicationSource')).sort((a, b) => b[1].length - a[1].length)[0];
    const topPos            = Object.entries(groupByKey(dateFilteredApplicants, 'appliedPosition')).sort((a, b) => b[1].length - a[1].length)[0];
    const topBranch         = Object.entries(groupByKey(dateFilteredApplicants, 'appliedBranch')).sort((a, b) => b[1].length - a[1].length)[0];
    const reservedCount     = dateFilteredApplicants.filter((a) => /reserved/i.test(a.recruitmentStage)).length;
    const nonCompliantCount = dateFilteredApplicants.filter((a) => /non-compliant/i.test(a.rawProgressStatus)).length;
    const longGapCount      = hiredApplicants.filter((a) => a.orientationContractGap != null && a.orientationContractGap > 7).length;
    return [
      { type: 'success', icon: <CheckCircleOutlined />, text: `Overall hire rate is ${hireRate}% — ${hiredApplicants.length} hired out of ${dateFilteredApplicants.length} total applicants.` },
      topSrc    && { type: 'info',    icon: <InfoCircleOutlined />, text: `${topSrc[0]} is the top source with ${topSrc[1].length} applicants (${pct(topSrc[1].length, dateFilteredApplicants.length)}%). Prioritize budget here.` },
      topPos    && { type: 'warning', icon: <WarningOutlined />,    text: `${topPos[0]} is the most-applied position (${topPos[1].length} applicants). Check headcount targets.` },
      topBranch && { type: 'info',    icon: <InfoCircleOutlined />, text: `${topBranch[0]} branch has the highest recruitment activity (${topBranch[1].length} applicants).` },
      averageDaysToHire && { type: averageDaysToHire > 15 ? 'warning' : 'success', icon: averageDaysToHire > 15 ? <WarningOutlined /> : <CheckCircleOutlined />, text: `Average time-to-hire is ${averageDaysToHire} days. ${averageDaysToHire > 15 ? 'Consider streamlining stages.' : 'Processing speed is healthy.'}` },
      reservedCount > 0     && { type: 'error',   icon: <AlertOutlined />, text: `${reservedCount} reserved applicants (qualified but pending requirements) need follow-up.` },
      nonCompliantCount > 0 && { type: 'warning', icon: <WarningOutlined />, text: `${nonCompliantCount} applicants are non-compliant across stages. Review document requirements.` },
      longGapCount > 0      && { type: 'error',   icon: <AlertOutlined />, text: `${longGapCount} hired applicants took more than 7 days between orientation and contract signing.` },
    ].filter(Boolean);
  }, [dateFilteredApplicants, hiredApplicants, averageDaysToHire]);

  const getFilterOptions = useCallback((filterKey) => {
    const fieldMap = {
      branch: 'appliedBranch', position: 'appliedPosition',
      source: 'applicationSource', stage: 'recruitmentStage', gender: 'applicantGender',
    };
    return [...new Set(allApplicantRows.map((a) => a[fieldMap[filterKey] || filterKey]))]
      .filter(Boolean).sort()
      .map((v) => ({ label: v, value: v }));
  }, [allApplicantRows]);

  const resetAllFilters = useCallback(() => {
    setApplicantFilters({ branch: '', position: '', source: '', stage: '', gender: '' });
    setAnalyticsDateRange({ from: getJanFirstThisYearIso(), to: getTodayIso() });
  }, []);

  const fetchApplicants = useCallback(async () => {
    setIsLoadingApplicants(true);
    try {
      const response = await axiosInstance.get('/recruitment/applicant_list');
      let apiRows = [];
      if (Array.isArray(response.data))                                          { apiRows = response.data; }
      else if (response.data && Array.isArray(response.data.data))               { apiRows = response.data.data; }
      else if (response.data && typeof response.data === 'object') {
        const firstArray = Object.values(response.data).find((v) => Array.isArray(v));
        if (firstArray) apiRows = firstArray;
      }
      setPositions(response.data?.positions || []);
      setBranches(response.data?.branches   || []);
      const normalized = apiRows.map(normalizeApiApplicantRow);
      const valid = normalized.filter((a) => a.applicantName || a.appliedPosition !== 'Unknown' || a.appliedBranch !== 'Unknown');
      setAllApplicantRows(valid.length ? valid : normalized);
    } catch (error) {
      console.error('[DashboardPage] fetch error:', error);
      if (error?.response?.status === 401) navigate('/login');
    } finally {
      setIsLoadingApplicants(false);
    }
  }, [navigate]);

  useEffect(() => { fetchApplicants(); }, [fetchApplicants]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const srcAppChartData = useMemo(() => {
    const entries = Object.entries(groupByKey(dateFilteredApplicants, 'applicationSource')).sort((a, b) => b[1].length - a[1].length);
    return {
      labels: entries.map((e) => e[0]),
      datasets: [{ label: 'Applicants', data: entries.map((e) => e[1].length), backgroundColor: CHART_COLORS.map((c) => c + 'bb'), borderColor: CHART_COLORS, borderWidth: 1 }],
    };
  }, [dateFilteredApplicants]);

  const srcHireChartData = useMemo(() => {
    const entries = Object.entries(groupByKey(hiredApplicants, 'applicationSource')).sort((a, b) => b[1].length - a[1].length);
    return {
      labels: entries.map((e) => e[0]),
      datasets: [{ data: entries.map((e) => e[1].length), backgroundColor: CHART_COLORS.slice(0, entries.length), borderWidth: 2, borderColor: '#fff' }],
    };
  }, [hiredApplicants]);

  const monthlyTrendChartData = useMemo(() => {
    const byMonth = {}, hiredByMonth = {};
    dateFilteredApplicants.forEach((a) => {
      if (!a.dateApplied) return;
      const mk = a.dateApplied.getFullYear() + '-' + String(a.dateApplied.getMonth() + 1).padStart(2, '0');
      byMonth[mk] = (byMonth[mk] || 0) + 1;
      if (a.isHired) hiredByMonth[mk] = (hiredByMonth[mk] || 0) + 1;
    });
    const keys   = Object.keys(byMonth).sort();
    const labels = keys.map((mk) => { const [y, m] = mk.split('-'); return new Date(+y, +m - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' }); });
    return {
      labels,
      datasets: [
        { label: 'Applications', data: keys.map((k) => byMonth[k] || 0),      borderColor: '#1677ff',    backgroundColor: 'rgba(22,119,255,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
        { label: 'Hired',        data: keys.map((k) => hiredByMonth[k] || 0), borderColor: PRIMARY_GREEN, backgroundColor: 'rgba(56,158,13,0.1)',   fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 },
      ],
    };
  }, [dateFilteredApplicants]);

  const ageChartData = useMemo(() => ({
    labels: AGE_BAND_LABELS,
    datasets: [
      { label: 'Applied', data: AGE_BAND_LABELS.map((b) => dateFilteredApplicants.filter((a) => a.applicantAgeBand === b).length), backgroundColor: 'rgba(22,119,255,0.65)' },
      { label: 'Hired',   data: AGE_BAND_LABELS.map((b) => hiredApplicants.filter((a) => a.applicantAgeBand === b).length),        backgroundColor: 'rgba(56,158,13,0.75)' },
    ],
  }), [dateFilteredApplicants, hiredApplicants]);

  const stageTimeChartData = useMemo(() => ({
    labels: avgDaysPerStage.labels,
    datasets: [{ label: 'Avg Days', data: avgDaysPerStage.data, backgroundColor: STAGE_COLORS.slice(0, 6), borderRadius: 4 }],
  }), [avgDaysPerStage]);

  const stageOutcomeChartData = useMemo(() => ({
    labels: stageOutcomeData.labels,
    datasets: [
      { label: 'On Process',    data: stageOutcomeData.onProcess,   backgroundColor: '#1677ffcc' },
      { label: 'Failed',        data: stageOutcomeData.failed,       backgroundColor: '#f5222dcc' },
      { label: 'Non-Compliant', data: stageOutcomeData.nonCompliant, backgroundColor: '#faad14cc' },
    ],
  }), [stageOutcomeData]);

  const nonCompliantChartData = useMemo(() => ({
    labels: nonCompliantByMonth.labels,
    datasets: [{ label: 'Non-Compliant', data: nonCompliantByMonth.data, borderColor: '#f5222d', backgroundColor: 'rgba(245,34,45,0.1)', fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2 }],
  }), [nonCompliantByMonth]);

  const educChartData = useMemo(() => ({
    labels: educAttainStats.map((e) => e.educ),
    datasets: [
      { type: 'bar',  label: 'Applied',     data: educAttainStats.map((e) => e.count),    backgroundColor: 'rgba(22,119,255,0.65)', yAxisID: 'y' },
      { type: 'bar',  label: 'Hired',       data: educAttainStats.map((e) => e.hired),    backgroundColor: 'rgba(56,158,13,0.75)',  yAxisID: 'y' },
      { type: 'line', label: 'Hire Rate %', data: educAttainStats.map((e) => e.hireRate), borderColor: '#722ed1', backgroundColor: 'transparent', pointRadius: 5, borderWidth: 2, yAxisID: 'y1' },
    ],
  }), [educAttainStats]);

  const civilStatusChartData = useMemo(() => ({
    labels: civilStatusStats.map((c) => c.status),
    datasets: [{ data: civilStatusStats.map((c) => c.count), backgroundColor: CHART_COLORS.slice(0, civilStatusStats.length), borderWidth: 2, borderColor: '#fff' }],
  }), [civilStatusStats]);

  const iqChartData = useMemo(() => ({
    labels: iqPassRateByPosition.map((d) => d.pos),
    datasets: [
      { label: 'Passed', data: iqPassRateByPosition.map((d) => d.passed), backgroundColor: 'rgba(56,158,13,0.75)' },
      { label: 'Failed', data: iqPassRateByPosition.map((d) => d.failed), backgroundColor: 'rgba(245,34,45,0.65)' },
    ],
  }), [iqPassRateByPosition]);

  // ── Table columns ───────────────────────────────────────────────────────────
  const positionColumns = [
    { title: '#',        dataIndex: 'rank',         width: 40,  render: (v) => <span style={{ fontWeight: 900, color: getRankColor(v) }}>{v}</span> },
    { title: 'Position', dataIndex: 'positionName',             render: (v) => <span style={{ color: '#1677ff' }}>{v}</span> },
    { title: 'Applied',  dataIndex: 'appliedCount',  align: 'right' },
    { title: 'Hired',    dataIndex: 'hiredCount',    align: 'right' },
    { title: 'Rate',     key: 'rate',                align: 'right', render: (_, r) => <Tag color='success'>{pct(r.hiredCount, r.appliedCount)}%</Tag> },
  ];

  const branchColumns = [
    { title: '#',       dataIndex: 'rank',         width: 40, render: (v) => <span style={{ fontWeight: 900, color: getRankColor(v) }}>{v}</span> },
    { title: 'Branch',  dataIndex: 'branchName',              render: (v) => <span style={{ color: '#1677ff' }}>{v}</span> },
    { title: 'Applied', dataIndex: 'appliedCount',  align: 'right' },
    { title: 'Hired',   dataIndex: 'hiredCount',    align: 'right' },
    { title: 'Rate',    key: 'rate',                align: 'right', render: (_, r) => <Tag color='success'>{pct(r.hiredCount, r.appliedCount)}%</Tag> },
  ];

  const officerColumns = [
    { title: '#',         dataIndex: 'rank',            width: 40, render: (v) => <span style={{ fontWeight: 900, color: getRankColor(v) }}>{v}</span> },
    { title: 'Officer',   dataIndex: 'officerName' },
    { title: 'Position',  dataIndex: 'officerPosition' },
    { title: 'Hired',     dataIndex: 'hiredCount',      align: 'right' },
    { title: 'Avg Days',  dataIndex: 'avgDays',         align: 'right', render: (v) => <span style={{ color: v > 30 ? '#f5222d' : v > 20 ? '#faad14' : '#389e0d' }}>{v != null ? v + 'd' : 'N/A'}</span> },
    { title: 'Hire Rate', dataIndex: 'hireRate',        align: 'right', render: (v) => <Tag color='success'>{v}%</Tag> },
  ];

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!allApplicantRows.length && !isLoadingApplicants) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Card style={{ maxWidth: 420, borderRadius: 16, borderTop: `4px solid ${PRIMARY_GREEN}`, textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <Title level={4} style={{ marginBottom: 4 }}>Recruitment Dashboard</Title>
          <Text type='secondary' style={{ fontSize: 12 }}>Human Resource Division · Recruitment &amp; Hiring Department</Text>
          <Divider />
          <Text type='secondary' style={{ display: 'block', marginBottom: 16 }}>No applicant data found or failed to load.</Text>
          <Button type='primary' icon={<ReloadOutlined />} onClick={fetchApplicants}>Retry</Button>
        </Card>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif" }}>
      <Spin spinning={isLoadingApplicants} size='large' style={{ position: 'fixed', top: '50%', left: '50%', zIndex: 999 }} />

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <Row justify='space-between' align='middle' style={{ marginBottom: 20 }}>
        <Tag color='success' icon={<CheckCircleOutlined />}>
          {allApplicantRows.length} records loaded
        </Tag>
        <Button size='small' icon={<ReloadOutlined />} onClick={fetchApplicants} loading={isLoadingApplicants}>
          Refresh
        </Button>
      </Row>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <Card size='small' style={{ marginBottom: 20, borderRadius: 8 }}>
        <Row gutter={[12, 12]} align='bottom'>
          {applicantFilterDefs.map(({ label, key }) => (
            <Col key={key} xs={12} sm={8} md={4}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
                {label}
              </Text>
              <Select
                allowClear
                placeholder={`All ${label}s`}
                style={{ width: '100%' }}
                options={getFilterOptions(key)}
                value={applicantFilters[key] || undefined}
                onChange={(v) => setApplicantFilters((f) => ({ ...f, [key]: v || '' }))}
              />
            </Col>
          ))}
          <Col xs={12} sm={8} md={4}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>
              Gender
            </Text>
            <Select
              allowClear
              placeholder='All'
              style={{ width: '100%' }}
              options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]}
              value={applicantFilters.gender || undefined}
              onChange={(v) => setApplicantFilters((f) => ({ ...f, gender: v || '' }))}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Button icon={<ReloadOutlined />} onClick={resetAllFilters} block>Reset</Button>
          </Col>
        </Row>
      </Card>

      {/* ── Date Range ──────────────────────────────────────────────────────── */}
      <Card size='small' style={{ marginBottom: 20, borderRadius: 8 }}>
        <Row align='middle' gutter={[12, 8]}>
          <Col>
            <Text style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>
              Date Range
            </Text>
          </Col>
          <Col>
            <RangePicker
              size='small'
              value={[
                analyticsDateRange.from ? dayjs(analyticsDateRange.from) : null,
                analyticsDateRange.to   ? dayjs(analyticsDateRange.to)   : null,
              ]}
              onChange={(dates) => {
                setAnalyticsDateRange({
                  from: dates?.[0] ? dates[0].format('YYYY-MM-DD') : '',
                  to:   dates?.[1] ? dates[1].format('YYYY-MM-DD') : '',
                });
              }}
            />
          </Col>
          <Col>
            <Button size='small' danger type='text' icon={<ReloadOutlined />}
              onClick={() => setAnalyticsDateRange({ from: getJanFirstThisYearIso(), to: getTodayIso() })}>
              Reset to Default
            </Button>
          </Col>
          <Col>
            <Text type='secondary' style={{ fontSize: 11 }}>
              Showing: <strong>{analyticsDateRange.from || 'All time'}</strong> → <strong>{analyticsDateRange.to || 'Today'}</strong>
            </Text>
          </Col>
        </Row>
      </Card>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <SectionLabel>Key Performance Indicators</SectionLabel>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {kpiCards.map((k) => (
          <Col key={k.label} xs={12} sm={8} md={4}>
            <KpiCard {...k} />
          </Col>
        ))}
      </Row>

      {/* ── Stage Pipeline ──────────────────────────────────────────────────── */}
      <SectionLabel>Applicant Pipeline</SectionLabel>
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {recruitmentStageCards.map((card) => (
          <Col key={card.stageName} xs={24} sm={12} md={8} lg={6} xl={3} style={{ flex: 1, minWidth: 150 }}>
            <StageCard stageCard={card} onClick={() => navigate(card.routePath)} />
          </Col>
        ))}
      </Row>

      {/* ── Recruitment Funnel + Embudo ─────────────────────────────────────── */}
      <SectionLabel>Recruitment Funnel</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>

        {/* Existing Progress bar funnel */}
        <Col xs={24} md={8}>
          <Card size='small' title='Recruitment Funnel' style={{ borderRadius: 8 }}
            extra={<Text type='secondary' style={{ fontSize: 11 }}>Drop-off &amp; conversion per stage</Text>}>
            {recruitmentFunnelRows.map((row, i) => (
              <div key={row.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#666' }}>{row.label}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Text strong style={{ fontSize: 12 }}>{row.count}</Text>
                    <Text type='secondary' style={{ fontSize: 11 }}>{pct(row.count, dateFilteredApplicants.length)}% of total</Text>
                    {i > 0 && recruitmentFunnelRows[i - 1].count > 0 && (
                      <Tag color={conversionColor(row.count, recruitmentFunnelRows[i - 1].count)} style={{ fontSize: 10, margin: 0 }}>
                        {pct(row.count, recruitmentFunnelRows[i - 1].count)}% pass
                      </Tag>
                    )}
                  </div>
                </div>
                <Progress
                  percent={pct(row.count, recruitmentFunnelRows[0].count || 1)}
                  strokeColor={STAGE_COLORS[i % STAGE_COLORS.length]}
                  showInfo={false}
                  size='small'
                />
              </div>
            ))}
          </Card>
        </Col>

        {/* NEW — Embudo SVG funnel */}
        <Col xs={24} md={8}>
          <Card size='small' title='Recruitment Funnel Chart' style={{ borderRadius: 8, height: '100%' }}
            extra={<Text type='secondary' style={{ fontSize: 11 }}>Visual conversion flow</Text>}>
            <RecruitmentFunnelChart funnelRows={recruitmentFunnelRows} />
          </Card>
        </Col>

        {/* Avg days per stage */}
        <Col xs={24} md={8}>
          <Card size='small' title='Avg. Days per Stage' style={{ borderRadius: 8, height: '100%' }}>
            <ChartBox type='bar' data={stageTimeChartData} options={CHART_OPTS} height={220} />
          </Card>
        </Col>

      </Row>

      {/* ── Sourcing Metrics ────────────────────────────────────────────────── */}
      <SectionLabel>Sourcing Metrics</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Source of Application' style={{ borderRadius: 8 }}>
            <ChartBox type='bar' data={srcAppChartData} options={{ ...CHART_OPTS, indexAxis: 'y' }} height={260} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='Hired by Source' style={{ borderRadius: 8 }}>
            <ChartBox type='doughnut' data={srcHireChartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 9, padding: 6 } } } }} height={260} />
          </Card>
        </Col>
      </Row>

      {/* ── Applicant Distribution ──────────────────────────────────────────── */}
      <SectionLabel>Applicant Distribution</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Applications & Hires by Month' style={{ borderRadius: 8 }}>
            <ChartBox type='line' data={monthlyTrendChartData} options={CHART_OPTS_LEGEND} height={240} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='Age Group Distribution' style={{ borderRadius: 8 }}>
            <ChartBox type='bar' data={ageChartData} options={CHART_OPTS_LEGEND} height={240} />
          </Card>
        </Col>
      </Row>

      {/* ── Gender + Outcomes ───────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Gender Breakdown' style={{ borderRadius: 8 }}>
            <GenderBreakdownCard genderBreakdownStats={genderBreakdownStats} totalCount={allDateFilteredApplicants.length} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='Stage Outcome Distribution' style={{ borderRadius: 8 }}>
            <ChartBox type='bar' data={stageOutcomeChartData} options={CHART_OPTS_STACKED} height={240} />
          </Card>
        </Col>
      </Row>

      {/* ── Compliance & Onboarding ─────────────────────────────────────────── */}
      <SectionLabel>Compliance &amp; Onboarding Metrics</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Non-Compliant Trend by Month' style={{ borderRadius: 8 }}
            extra={<Text type='secondary' style={{ fontSize: 11 }}>Rising = process issue</Text>}>
            <ChartBox type='line' data={nonCompliantChartData} options={CHART_OPTS} height={240} />
          </Card>
        </Col>
      </Row>

      {/* ── Reserved Applicant Aging ────────────────────────────────────────── */}
      <SectionLabel>Reserved Applicant Aging</SectionLabel>
      <Card size='small' style={{ borderRadius: 8, marginBottom: 24 }}
        title='Reserved Applicants — Days Waiting'
        extra={<Tag color='error'>{reservedAgingRows.filter((r) => r.daysWaiting > 30).length} critical (&gt;30d)</Tag>}>
        <ReservedAgingSection agingRows={reservedAgingRows} agingBuckets={reservedAgingBuckets} />
      </Card>

      {/* ── Applicant Demographics ──────────────────────────────────────────── */}
      <SectionLabel>Applicant Demographics</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Education Attainment vs Hire Rate' style={{ borderRadius: 8 }}>
            <ChartBox type='bar' data={educChartData} options={{
              ...CHART_OPTS_LEGEND,
              scales: {
                x:  { grid: { display: false }, ticks: { color: '#888', font: { size: 9 } } },
                y:  { id: 'y',  position: 'left',  ticks: { color: '#888', font: { size: 10 } } },
                y1: { id: 'y1', position: 'right', ticks: { color: '#888', font: { size: 10 }, callback: (v) => v + '%' }, grid: { display: false } },
              },
            }} height={260} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='Civil Status Breakdown' style={{ borderRadius: 8 }}>
            <ChartBox type='doughnut' data={civilStatusChartData} options={{ responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { font: { size: 10 }, boxWidth: 9, padding: 8 } } } }} height={260} />
          </Card>
        </Col>
      </Row>

      {/* ── Hiring Officer Performance ──────────────────────────────────────── */}
      <SectionLabel>Hiring Officer Performance</SectionLabel>
      <Card size='small' title='Hiring Officer Leaderboard' style={{ borderRadius: 8, marginBottom: 24 }}>
        <Table size='small' dataSource={hiringOfficerStats} columns={officerColumns} pagination={false} />
      </Card>

      {/* ── Placement Match Analysis ────────────────────────────────────────── */}
      <SectionLabel>Placement Match Analysis</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Position Preference Match Rate' style={{ borderRadius: 8 }}>
            <PlacementMatchCard stats={placementMatchStats} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='IQ Exam Pass Rate by Position' style={{ borderRadius: 8 }}>
            <ChartBox type='bar' data={iqChartData} options={{ ...CHART_OPTS_STACKED, indexAxis: 'y' }} height={260} />
          </Card>
        </Col>
      </Row>

      {/* ── Deep Analysis ───────────────────────────────────────────────────── */}
      <SectionLabel>Deep Analysis</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card size='small' title='Top Positions Applied' style={{ borderRadius: 8 }}>
            <Table size='small' dataSource={topPositionEntries} columns={positionColumns} pagination={false} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size='small' title='Branch Breakdown' style={{ borderRadius: 8 }}>
            <Table size='small' dataSource={branchBreakdownEntries} columns={branchColumns} pagination={false} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card size='small' title='Source × Stage Heatmap' style={{ borderRadius: 8 }}
            extra={<Text type='secondary' style={{ fontSize: 11 }}>Applicant volume intensity matrix</Text>}>
            <HeatmapTable
              sourceLabels={heatmapSourceLabels}
              stageLabels={heatmapStageLabels}
              dataGrid={heatmapDataGrid}
              maxValue={heatmapMaxValue}
            />
          </Card>
        </Col>
      </Row>

      {/* ── Recruitment Insights ────────────────────────────────────────────── */}
      <SectionLabel>Recruitment Insights</SectionLabel>
      <Card size='small' title='Recruitment Insights' style={{ borderRadius: 8, marginBottom: 32 }}>
        {recruitmentInsights.map((insight, i) => (
          <Alert
            key={i}
            type={insight.type}
            icon={insight.icon}
            title={insight.text}
            showIcon
            style={{ marginBottom: 12, borderRadius: 8 }}
          />
        ))}
      </Card>

    </div>
  );
};

export default DashboardPage;