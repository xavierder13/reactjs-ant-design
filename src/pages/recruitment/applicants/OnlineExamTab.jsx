import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Checkbox, Descriptions, Empty, Modal, Popconfirm, Progress, Space, Spin, Tag, Tooltip, Typography, Alert, App,
} from 'antd';
import { CopyOutlined, EyeOutlined, ReloadOutlined, SendOutlined, StopOutlined, WarningOutlined } from '@ant-design/icons';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import { copyText } from '../../../utils/referralLink';
import { gatewayMessage, errorMessage } from './requirements';
import ExamAnswersModal from './ExamAnswersModal';

// Applicant drawer → Online Exam: the links sent to this applicant (careers
// portal OnlineExamService) with each exam's result, Send exam link
// (careers-online-exam-send: pick the exams, optionally email it — the link
// is shown to copy either way) and Revoke. The applicant takes the exams in
// the separate exam app; the link expires per Recruitment → Setup → Online
// Exam. Results: aptitude (MDQ) score / passing mark per area; personality
// (MPQ) each trait's average on 1–5 (no pass / fail). Focus-lost and
// blocked copy / screenshot counts are what the exam page saw.

const LINK_STATUS = {
  active: { color: 'processing', label: 'Active' },
  completed: { color: 'success', label: 'Completed' },
  expired: { color: 'default', label: 'Expired' },
  revoked: { color: 'error', label: 'Revoked' },
};
const EXAM_STATUS = {
  not_started: { color: 'default', label: 'Not started' },
  in_progress: { color: 'warning', label: 'In progress' },
  submitted: { color: 'success', label: 'Submitted' },
};
const when = (v) => (v ? new Date(v.replace(' ', 'T')).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

function ExamResult({ exam, onViewAnswers }) {
  const head = (
    <Space wrap size={6}>
      <Typography.Text strong>{exam.title || exam.code}</Typography.Text>
      <Tag color={EXAM_STATUS[exam.status]?.color}>{EXAM_STATUS[exam.status]?.label}</Tag>
      {exam.late && <Tooltip title="Submitted after the time limit"><Tag color="orange">Late</Tag></Tooltip>}
      {exam.kind === 'aptitude' && exam.passed !== null && (
        <Tag color={exam.passed ? 'success' : 'error'}>{exam.passed ? 'Passed' : 'Failed'}</Tag>
      )}
      {exam.status === 'submitted' && exam.attempt_id && (
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => onViewAnswers(exam.attempt_id)}>View answers</Button>
      )}
      {(exam.focus_lost_count > 0 || exam.copy_attempt_count > 0) && (
        <Tooltip title="The exam page lost focus (another tab / window) or blocked a copy / screenshot attempt">
          <Tag icon={<WarningOutlined />} color="warning">
            {exam.focus_lost_count} focus lost · {exam.copy_attempt_count} copy / screenshot
          </Tag>
        </Tooltip>
      )}
    </Space>
  );
  if (exam.status !== 'submitted') return <div style={{ marginBottom: 8 }}>{head}</div>;

  return (
    <div style={{ marginBottom: 12 }}>
      {head}
      {exam.kind === 'aptitude' ? (
        <div style={{ marginTop: 6 }}>
          <Typography.Text>
            Score <strong>{exam.score} / {exam.max_score}</strong> ({exam.percent}%)
            {exam.passing_percent !== null && <Typography.Text type="secondary">{` · passing ${exam.passing_percent}%`}</Typography.Text>}
          </Typography.Text>
          <Descriptions
            size="small" column={{ xs: 1, sm: 2 }} style={{ marginTop: 4 }}
            items={(exam.section_scores || []).map((s) => ({ key: s.section, label: s.section, children: `${s.correct} / ${s.items}` }))}
          />
        </div>
      ) : (
        <div style={{ marginTop: 6, maxWidth: 460 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Average per trait, 1 (low) – 5 (high); no pass / fail.</Typography.Text>
          {(exam.section_scores || []).map((s) => (
            <div key={s.section} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 150 }}>{s.section}</span>
              <Progress
                style={{ flex: 1, margin: 0 }} size="small" showInfo={false}
                percent={s.average === null ? 0 : ((s.average - 1) / 4) * 100}
              />
              <span style={{ width: 70, textAlign: 'right' }}>{s.average ?? '-'}{s.answered < s.items ? ` (${s.answered}/${s.items})` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnlineExamTab({ applicant, canSend }) {
  const { message } = App.useApp();
  const [invitations, setInvitations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [exams, setExams] = useState([]);
  const [picked, setPicked] = useState([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // { link, message }
  const [viewingAttempt, setViewingAttempt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await recruitmentApi.getOnlineExamResults(applicant.id);
      if (!data?.success) throw Object.assign(new Error(), { response: { data } });
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(errorMessage(err, 'The exam results could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [applicant.id]);

  useEffect(() => {
    const run = async () => { await load(); };
    run();
  }, [load]);

  const openInvite = async () => {
    setCreated(null);
    setSendEmail(Boolean(applicant.email));
    setInviting(true);
    try {
      const { data } = await recruitmentApi.getOnlineExamSettings();
      const list = data?.exams || [];
      setExams(list);
      setPicked(list.map((e) => e.id));
    } catch (err) {
      message.error(errorMessage(err, 'The exam list could not be loaded.'));
      setInviting(false);
    }
  };

  const invite = async () => {
    if (!picked.length) { message.warning('Pick at least one exam.'); return; }
    setSaving(true);
    try {
      const { data } = await recruitmentApi.inviteOnlineExam({ applicant_id: applicant.id, exam_ids: picked, send_email: sendEmail });
      if (!data?.success) throw Object.assign(new Error(), { response: { data } });
      setCreated({ link: data.link, message: data.message });
      load();
    } catch (err) {
      message.error(errorMessage(err, 'The exam link could not be created.'));
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id) => {
    try {
      const { data } = await recruitmentApi.revokeOnlineExam(id);
      message.success(data?.message || 'Exam link revoked.');
      load();
    } catch (err) {
      message.error(errorMessage(err, 'The link could not be revoked.'));
    }
  };

  const copy = (link) => copyText(link).then(() => message.success('Exam link copied.')).catch(() => message.error('Could not copy the link.'));

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        {canSend && <Button type="primary" icon={<SendOutlined />} onClick={openInvite}>Send exam link</Button>}
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
      </Space>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      {invitations === null && loading ? <Spin style={{ display: 'block', margin: '24px auto' }} /> : null}
      {invitations?.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No exam link sent yet." />}
      {(invitations || []).map((inv) => (
        <Card
          key={inv.id}
          size="small"
          style={{ marginBottom: 12 }}
          title={(
            <Space wrap size={6}>
              <Tag color={LINK_STATUS[inv.status]?.color}>{LINK_STATUS[inv.status]?.label}</Tag>
              <Typography.Text type="secondary" style={{ fontWeight: 'normal', fontSize: 12 }}>
                Sent {when(inv.created_at)}{inv.created_by_email ? ` by ${inv.created_by_email}` : ''}
                {inv.emailed_at ? ' · emailed' : ''} · {inv.status === 'expired' ? 'expired' : 'expires'} {when(inv.expires_at)}
                {inv.opened_at ? ` · opened ${when(inv.opened_at)}` : ' · not opened yet'}
              </Typography.Text>
            </Space>
          )}
          extra={inv.status === 'active' && canSend && (
            <Space size={4}>
              <Tooltip title="Copy link"><Button size="small" icon={<CopyOutlined />} onClick={() => copy(inv.link)} /></Tooltip>
              <Popconfirm title="Revoke this exam link?" description="The applicant can no longer open it." onConfirm={() => revoke(inv.id)}>
                <Tooltip title="Revoke"><Button size="small" danger icon={<StopOutlined />} /></Tooltip>
              </Popconfirm>
            </Space>
          )}
        >
          {inv.exams.map((exam) => <ExamResult key={exam.exam_id} exam={exam} onViewAnswers={setViewingAttempt} />)}
        </Card>
      ))}

      <ExamAnswersModal attemptId={viewingAttempt} onClose={() => setViewingAttempt(null)} />

      <Modal
        keyboard={false}
        open={inviting}
        title="Send exam link"
        okText={created ? 'Done' : 'Create link'}
        onOk={created ? () => setInviting(false) : invite}
        okButtonProps={{ loading: saving }}
        cancelButtonProps={{ style: created ? { display: 'none' } : undefined }}
        onCancel={() => setInviting(false)}
        destroyOnHidden
        mask={{ closable: false }}
      >
        {created ? (
          <>
            <Alert type="success" showIcon title={gatewayMessage({ message: created.message }, 'Exam link created.')} style={{ marginBottom: 12 }} />
            <Typography.Paragraph copyable={{ text: created.link }} style={{ wordBreak: 'break-all' }}>{created.link}</Typography.Paragraph>
          </>
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              The link is personal to {applicant.firstname || 'the applicant'} and expires per Recruitment → Setup → Online Exam.
            </Typography.Paragraph>
            <Checkbox.Group value={picked} onChange={setPicked} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exams.map((e) => (
                <Checkbox key={e.id} value={e.id}>
                  <strong>{e.title}</strong>
                  <Typography.Text type="secondary">{` · ${e.questions_count} items · ${e.time_limit_minutes} min`}</Typography.Text>
                </Checkbox>
              ))}
            </Checkbox.Group>
            <Checkbox style={{ marginTop: 16 }} checked={sendEmail} disabled={!applicant.email} onChange={(e) => setSendEmail(e.target.checked)}>
              Email the link to {applicant.email || 'the applicant (no email on file)'}
            </Checkbox>
          </>
        )}
      </Modal>
    </div>
  );
}
