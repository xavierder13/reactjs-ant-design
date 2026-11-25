import { Button, Progress, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { STATUS_LABELS } from './stageProgress';
import { ClockCircleOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons';

// One exam's result on the Online Exam tab (OnlineExamTab). Aptitude (MDQ):
// the score against the passing mark, then each ability area as a bar with
// a strength label. Personality (MPQ): each trait's 1–5 average as a bar
// with a level (Low < 2.5 ≤ Moderate < 4.0 ≤ High) and what that level
// usually means at work — a reading aid for the interviewer, not a grade.

const EXAM_STATUS = {
  not_started: { color: 'default', label: 'Not started' },
  in_progress: { color: 'warning', label: 'In progress' },
  submitted: { color: 'success', label: 'Submitted' },
};

// area strength from its share of correct answers
const strength = (ratio) => {
  if (ratio >= 0.8) return { label: 'Strong', color: 'success', stroke: 'colorSuccess' };
  if (ratio >= 0.6) return { label: 'Average', color: 'processing', stroke: 'colorPrimary' };
  return { label: 'Needs work', color: 'error', stroke: 'colorError' };
};

const level = (avg) => {
  if (avg === null || avg === undefined) return null;
  if (avg >= 4) return 'High';
  if (avg >= 2.5) return 'Moderate';
  return 'Low';
};
const LEVEL_COLOR = { High: 'success', Moderate: 'processing', Low: 'warning' };

// what each level usually means at work (sample MPQ traits)
const TRAIT_READING = {
  Conscientiousness: {
    High: 'Dependable and organised; finishes work on time with little supervision.',
    Moderate: 'Generally reliable; may need deadlines and follow-up on detailed work.',
    Low: 'May procrastinate or miss details; benefits from close supervision.',
  },
  Extraversion: {
    High: 'Outgoing and talkative; comfortable with customers and groups.',
    Moderate: 'Comfortable with people but also works well alone.',
    Low: 'Reserved; prefers independent, focused work over constant contact.',
  },
  Agreeableness: {
    High: 'Cooperative and considerate; works well in teams and with customers.',
    Moderate: 'Generally cooperative; can be firm when needed.',
    Low: 'Direct and competitive; may clash in teams — check in the interview.',
  },
  'Emotional Stability': {
    High: 'Calm under pressure; takes criticism and setbacks well.',
    Moderate: 'Usually steady; some stress under heavy pressure.',
    Low: 'Tends to worry or get irritated under pressure — explore in the interview.',
  },
  Openness: {
    High: 'Curious and adaptable; open to new methods and change.',
    Moderate: 'Accepts change when it makes sense; likes some routine.',
    Low: 'Prefers routine and proven methods; may resist sudden changes.',
  },
};

const minutesBetween = (from, to) => (from && to
  ? Math.max(1, Math.round((new Date(to.replace(' ', 'T')) - new Date(from.replace(' ', 'T'))) / 60000))
  : null);

function Row({ label, children, value, tag }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 150px) minmax(60px, 1fr) 48px 92px', gap: 10, alignItems: 'center' }}>
      <Typography.Text>{label}</Typography.Text>
      <div style={{ minWidth: 0 }}>{children}</div>
      <Typography.Text style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography.Text>
      <div>{tag}</div>
    </div>
  );
}

// The exam's result, large: PASSED / FAILED with the score against the mark.
export function Verdict({ passed, percent, pass, size = 'default' }) {
  const { token } = theme.useToken();
  const color = passed ? token.colorSuccess : token.colorError;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, padding: size === 'small' ? '2px 10px' : '6px 14px',
      borderRadius: token.borderRadius, background: passed ? token.colorSuccessBg : token.colorErrorBg,
      border: `1px solid ${passed ? token.colorSuccessBorder : token.colorErrorBorder}`,
    }}
    >
      <span style={{ fontWeight: 700, letterSpacing: '0.06em', color, fontSize: size === 'small' ? 13 : 16 }}>{passed ? 'PASSED' : 'FAILED'}</span>
      {percent !== undefined && pass !== null && pass !== undefined && (
        <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{percent}% · pass mark {pass}%</span>
      )}
    </div>
  );
}

// The score bar with the passing mark: the part below the mark shaded, a
// tall amber marker line across the bar and a "Pass 60%" label above it
// (amber = threshold; distinct from the green / red score colors).
function ScoreBar({ percent, pass, passed }) {
  const { token } = theme.useToken();
  const fill = passed === false ? token.colorError : token.colorSuccess;
  return (
    <div style={{ position: 'relative', paddingTop: pass !== null ? 22 : 4, marginTop: 4 }}>
      <div style={{ position: 'relative', height: 12, borderRadius: 6, background: token.colorFillSecondary, overflow: 'hidden' }}>
        {pass !== null && (
          <div style={{ position: 'absolute', inset: `0 ${100 - pass}% 0 0`, background: token.colorErrorBg }} />
        )}
        <div style={{ position: 'absolute', inset: `0 ${100 - Math.min(100, percent)}% 0 0`, background: fill, borderRadius: 6 }} />
      </div>
      {pass !== null && (
        <Tooltip title={`Passing mark ${pass}% — at or above it is Passed`}>
          <div style={{ position: 'absolute', left: `${pass}%`, top: 0, bottom: -4, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
            <span style={{ fontSize: 11, fontWeight: 600, lineHeight: '16px', padding: '0 6px', borderRadius: 4, background: token.colorWarning, color: 'rgba(0, 0, 0, 0.88)', whiteSpace: 'nowrap' }}>
              Pass {pass}%
            </span>
            <span style={{ flex: 1, width: 3, background: token.colorWarning, borderRadius: 2, marginTop: 2, boxShadow: `0 0 0 1px ${token.colorBgContainer}` }} />
          </div>
        </Tooltip>
      )}
    </div>
  );
}

// "Examination result" for one link: the scored exams' verdict (all passed →
// Passed, any failed → Failed), each scored exam's percent, the personality
// traits rated High, and the applicant's current Exam status in the HRIS —
// the result doesn't change it; HR sets it with Update Status.
export function ExamSummary({ inv, applicant }) {
  const done = inv.exams.filter((e) => e.status === 'submitted');
  if (!done.length) return null;
  const scored = done.filter((e) => e.passed !== null);
  const verdict = scored.length ? scored.every((e) => e.passed) : null;
  const highs = done.filter((e) => e.kind === 'personality')
    .flatMap((e) => (e.section_scores || []).filter((s) => s.average >= 4).map((s) => s.section));
  const pending = inv.exams.length - done.length;
  const iq = applicant.iq_status;
  const examStatus = iq === null || iq === undefined ? 'not reached' : STATUS_LABELS[Number(iq)];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px', marginBottom: 12 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Examination result</Typography.Text>
      {verdict !== null ? <Verdict passed={verdict} size="small" /> : <Tag>No pass / fail</Tag>}
      <Typography.Text style={{ fontSize: 13 }}>
        {scored.map((e) => `${e.code} ${e.percent}%${e.passing_percent !== null ? ` (pass mark ${e.passing_percent}%)` : ''}`).join(' · ')}
        {highs.length ? `${scored.length ? ' · ' : ''}MPQ high: ${highs.join(', ')}` : ''}
        {pending ? ` · ${pending} exam${pending > 1 ? 's' : ''} not submitted yet` : ''}
      </Typography.Text>
      <Tooltip title="The exam result doesn't change it — set Passed / Failed with Update Status on the Application Progress.">
        <Tag color={Number(iq) === 0 ? 'warning' : undefined}>HRIS Exam status: {examStatus}</Tag>
      </Tooltip>
    </div>
  );
}

export default function ExamResultCard({ exam, onViewAnswers }) {
  const { token } = theme.useToken();
  const submitted = exam.status === 'submitted';
  const aptitude = exam.kind === 'aptitude';
  const took = minutesBetween(exam.started_at, exam.submitted_at);
  const flagged = exam.focus_lost_count > 0 || exam.copy_attempt_count > 0;

  return (
    <div style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Space wrap size={6}>
          <Typography.Text strong>{exam.title || exam.code}</Typography.Text>
          <Tag color={EXAM_STATUS[exam.status]?.color}>{EXAM_STATUS[exam.status]?.label}</Tag>
          {exam.late && <Tooltip title="Submitted more than 2 minutes after the time limit"><Tag color="orange">Late</Tag></Tooltip>}
        </Space>
        {submitted && exam.attempt_id && (
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => onViewAnswers(exam.attempt_id)}>View answers</Button>
        )}
      </div>

      {(took || flagged) && (
        <Space wrap size={12} style={{ marginTop: 4, fontSize: 12 }}>
          {took && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> Took {took} min{exam.time_limit_minutes ? ` of ${exam.time_limit_minutes}` : ''}
            </Typography.Text>
          )}
          {flagged && (
            <Tooltip title="Times the exam page was hidden or left (another tab, window or app), and blocked copy / print / screenshot attempts. For HR to judge — they don't change the score.">
              <Typography.Text style={{ fontSize: 12, color: token.colorWarningText }}>
                <WarningOutlined /> {exam.focus_lost_count} focus lost · {exam.copy_attempt_count} copy / screenshot
              </Typography.Text>
            </Tooltip>
          )}
        </Space>
      )}

      {!submitted && (
        <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
          {exam.status === 'in_progress' ? 'Started — waiting for the applicant to submit.' : 'The applicant has not started this exam yet.'}
        </Typography.Paragraph>
      )}

      {submitted && aptitude && (
        <div style={{ marginTop: 12, display: 'grid', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Space align="baseline" size={10} wrap>
                <Typography.Title level={4} style={{ margin: 0 }}>{exam.score} / {exam.max_score}</Typography.Title>
                <Typography.Text strong>{exam.percent}%</Typography.Text>
              </Space>
              {exam.passed !== null && <Verdict passed={exam.passed} percent={exam.percent} pass={exam.passing_percent} />}
            </div>
            <ScoreBar percent={exam.percent} pass={exam.passing_percent} passed={exam.passed} />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>By ability area</Typography.Text>
            {(exam.section_scores || []).map((s) => {
              const ratio = s.items ? s.correct / s.items : 0;
              const st = strength(ratio);
              return (
                <Row key={s.section} label={s.section} value={`${s.correct} / ${s.items}`} tag={<Tag color={st.color}>{st.label}</Tag>}>
                  <Progress percent={Math.round(ratio * 100)} showInfo={false} size="small" status="normal" strokeColor={token[st.stroke]} />
                </Row>
              );
            })}
          </div>
        </div>
      )}

      {submitted && !aptitude && (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Average of each trait&apos;s statements, 1 (low) – 5 (high). A profile to read against the job — no pass / fail.
          </Typography.Text>
          {(exam.section_scores || []).map((s) => {
            const lv = level(s.average);
            return (
              <div key={s.section} style={{ display: 'grid', gap: 2 }}>
                <Row
                  label={s.section}
                  value={s.average === null ? '-' : Number(s.average).toFixed(1)}
                  tag={lv && <Tag color={LEVEL_COLOR[lv]}>{lv}</Tag>}
                >
                  <Progress percent={s.average === null ? 0 : ((s.average - 1) / 4) * 100} showInfo={false} size="small" />
                </Row>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {lv && TRAIT_READING[s.section]?.[lv]}
                  {s.answered < s.items ? ` (${s.answered} of ${s.items} statements answered)` : ''}
                </Typography.Text>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
