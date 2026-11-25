import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Checkbox, Empty, Modal, Popconfirm, Space, Spin, Tag, Tooltip, Typography, Alert, App,
} from 'antd';
import { CopyOutlined, ExportOutlined, LinkOutlined, ReloadOutlined, SendOutlined, StopOutlined } from '@ant-design/icons';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import { copyText } from '../../../utils/referralLink';
import { gatewayMessage, errorMessage } from './requirements';
import { currentStep, STATUS_LABELS } from './stageProgress';
import ExamAnswersModal from './ExamAnswersModal';
import ExamResultCard, { ExamSummary } from './ExamResultCard';

// Applicant drawer → Online Exam: the links sent to this applicant (careers
// portal OnlineExamService) with each exam's result, Send exam link
// (careers-online-exam-send: pick the exams, optionally email it — the link
// is shown to copy either way) and Revoke. Sending is allowed while the
// applicant's current phase is Exam (On Process / Failed / Non-Compliant /
// Reserved); an Administrator may send at any phase after confirming. The
// careers portal enforces the same rule (online_exam_invite). The applicant takes the exams in
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
const when = (v) => (v ? new Date(v.replace(' ', 'T')).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '-');


const EXAM_STEP = 2;


export default function OnlineExamTab({ applicant, canSend, isAdmin }) {
  const { message, modal } = App.useApp();
  const atExam = applicant.iq_status !== null && applicant.iq_status !== undefined && currentStep(applicant) === EXAM_STEP;
  const mayOpen = canSend && (atExam || isAdmin);
  const [invitations, setInvitations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(false);
  // Active exams for the link dialog — null while they load.
  const [exams, setExams] = useState(null);
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
    setExams(null);
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

  const send = async (confirmAnyStage) => {
    setSaving(true);
    try {
      const { data } = await recruitmentApi.inviteOnlineExam({
        applicant_id: applicant.id, exam_ids: picked, send_email: sendEmail, confirm_any_stage: confirmAnyStage || undefined,
      });
      if (!data?.success) throw Object.assign(new Error(), { response: { data } });
      setCreated({ link: data.link, message: data.message });
      load();
    } catch (err) {
      // the applicant moved out of the Exam phase meanwhile: an Administrator may still confirm
      if (err?.response?.data?.needs_confirmation && isAdmin && !confirmAnyStage) { setSaving(false); confirmOutside(); return; }
      message.error(errorMessage(err, 'The exam link could not be created.'));
    } finally {
      setSaving(false);
    }
  };

  const phaseLabel = () => {
    const step = currentStep(applicant);
    const field = ['status', 'initial_interview_status', 'iq_status', 'bi_status', 'final_interview_status', 'orientation_status'][step];
    const names = ['Screening', 'Initial Interview', 'Exam', 'B.I & Basic Req', 'Final Interview', 'Orientation'];
    const status = applicant[field];
    return `${names[step]}${status !== null && status !== undefined ? ` (${STATUS_LABELS[Number(status)]})` : ''}`;
  };

  const confirmOutside = () => modal.confirm({
    keyboard: false,
    title: 'Send an exam link outside the Exam phase?',
    content: `${applicant.firstname || 'The applicant'} is at ${phaseLabel()}, not at the Exam phase. As Administrator you can still send it.`,
    okText: 'Send anyway',
    onOk: () => send(true),
  });

  const invite = () => {
    if (!picked.length) { message.warning('Pick at least one exam.'); return; }
    if (!atExam) { confirmOutside(); return; }
    send(false);
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

  // Administrator: open the exam as the applicant sees it (preview key —
  // nothing recorded, no timer started). The tab opens first so the browser
  // doesn't block it as a pop-up, then gets the link.
  const preview = async (id) => {
    const tab = window.open('', '_blank');
    try {
      const { data } = await recruitmentApi.previewOnlineExam(id);
      if (!data?.success || !data.link) throw Object.assign(new Error(), { response: { data } });
      if (tab) { tab.opener = null; tab.location.href = data.link; } else window.location.assign(data.link);
    } catch (err) {
      tab?.close();
      message.error(errorMessage(err, 'The preview link could not be created.'));
    }
  };

  const copy = (link) => copyText(link).then(() => message.success('Exam link copied.')).catch(() => message.error('Could not copy the link.'));

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        {canSend && (
          <Tooltip title={mayOpen ? (atExam ? null : 'Not at the Exam phase — Administrator only, with confirmation') : `Available while the applicant is at the Exam phase (now ${phaseLabel()})`}>
            <Button type="primary" icon={<SendOutlined />} onClick={openInvite} disabled={!mayOpen}>Send exam link</Button>
          </Tooltip>
        )}
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
          extra={(isAdmin || (inv.status === 'active' && canSend)) && (
            <Space size={4}>
              {isAdmin && (
                <Tooltip title="Preview the exam as the applicant sees it — nothing is saved and the applicant's timer doesn't start">
                  <Button size="small" icon={<ExportOutlined />} onClick={() => preview(inv.id)}>Preview</Button>
                </Tooltip>
              )}
              {inv.status === 'active' && canSend && (
                <>
                  <Tooltip title="Copy link"><Button size="small" icon={<CopyOutlined />} onClick={() => copy(inv.link)} /></Tooltip>
                  <Popconfirm title="Revoke this exam link?" description="The applicant can no longer open it." onConfirm={() => revoke(inv.id)}>
                    <Tooltip title="Revoke"><Button size="small" danger icon={<StopOutlined />} /></Tooltip>
                  </Popconfirm>
                </>
              )}
            </Space>
          )}
        >
          {inv.status === 'active' && inv.link && (canSend || isAdmin) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, minWidth: 0 }}>
              <LinkOutlined style={{ opacity: 0.6 }} />
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, minWidth: 0 }}
                ellipsis={{ tooltip: inv.link }}
                copyable={{ text: inv.link, tooltips: ['Copy the applicant\'s link', 'Copied'] }}
              >
                {inv.link}
              </Typography.Text>
            </div>
          )}
          <ExamSummary inv={inv} applicant={applicant} />
          {inv.exams.map((exam) => <ExamResultCard key={exam.exam_id} exam={exam} onViewAnswers={setViewingAttempt} />)}
        </Card>
      ))}

      <ExamAnswersModal attemptId={viewingAttempt} onClose={() => setViewingAttempt(null)} />

      <Modal
        keyboard={false}
        open={inviting}
        title="Send exam link"
        okText={created ? 'Done' : 'Create link'}
        onOk={created ? () => setInviting(false) : invite}
        okButtonProps={{ loading: saving, disabled: !created && !exams?.length }}
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
            {exams === null && <Spin style={{ display: 'block', margin: '12px auto' }} />}
            {exams?.length === 0 && (
              <Alert
                type="warning" showIcon
                title="No active exams are set up"
                description="Exams are added on the careers portal (OnlineExamSeeder); Recruitment → Setup → Online Exam lists them."
              />
            )}
            <Checkbox.Group value={picked} onChange={setPicked} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(exams || []).map((e) => (
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
