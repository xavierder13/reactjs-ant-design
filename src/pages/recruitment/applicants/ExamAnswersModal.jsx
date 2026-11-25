import { useEffect, useState } from 'react';
import { Modal, Table, Tag, Typography, Space, Segmented, Alert, Spin } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';

import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import { errorMessage } from './requirements';

// One submitted online exam's answer sheet (OnlineExamTab → View answers):
// every question with the applicant's answer. Aptitude (MDQ): the correct
// option and ✓ / ✗, filter Wrong / Unanswered. Personality (MPQ): the scale
// answer, Reverse items and the score each counted for (6 − answer).
export default function ExamAnswersModal({ attemptId, onClose }) {
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!attemptId) return undefined;
    let alive = true;
    recruitmentApi.getOnlineExamAnswers(attemptId)
      .then(({ data }) => {
        if (!alive) return;
        if (!data?.success) throw Object.assign(new Error(), { response: { data } });
        setSheet(data);
      })
      .catch((err) => alive && setError(errorMessage(err, 'The answers could not be loaded.')));
    return () => { alive = false; };
  }, [attemptId]);

  const aptitude = sheet?.exam.kind === 'aptitude';
  const optionText = (q, key) => q.options?.find((o) => o.key === key)?.text;
  const rows = (sheet?.questions || []).filter((q) => {
    if (filter === 'wrong') return q.answer !== null && !q.correct;
    if (filter === 'unanswered') return q.answer === null;
    return true;
  });

  const columns = aptitude ? [
    { title: '#', dataIndex: 'no', width: 48 },
    {
      title: 'Question', dataIndex: 'question',
      render: (v, q) => <><div>{v}</div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.section}</Typography.Text></>,
    },
    {
      title: 'Answer', key: 'answer', width: 220,
      render: (_, q) => (q.answer === null ? <Typography.Text type="secondary">No answer</Typography.Text> : (
        <Space size={6} align="start">
          {q.correct ? <CheckCircleFilled style={{ color: '#52c41a' }} /> : <CloseCircleFilled style={{ color: '#ff4d4f' }} />}
          <span>{q.answer}. {optionText(q, q.answer)}</span>
        </Space>
      )),
    },
    {
      title: 'Correct', key: 'correct', width: 200,
      render: (_, q) => (q.correct ? <Typography.Text type="secondary">—</Typography.Text> : `${q.correct_option}. ${optionText(q, q.correct_option)}`),
    },
  ] : [
    { title: '#', dataIndex: 'no', width: 48 },
    {
      title: 'Statement', dataIndex: 'question',
      render: (v, q) => (
        <>
          <div>{v}</div>
          <Space size={4}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{q.section}</Typography.Text>
            {q.reverse_scored && <Tag style={{ fontSize: 11 }}>Reverse</Tag>}
          </Space>
        </>
      ),
    },
    { title: 'Answer', key: 'answer', width: 170, render: (_, q) => q.answer_label || <Typography.Text type="secondary">No answer</Typography.Text> },
    { title: 'Counted as', dataIndex: 'scored_as', width: 100, align: 'center', render: (v) => (v === null ? '—' : `${v} / 5`) },
  ];

  const wrong = (sheet?.questions || []).filter((q) => q.answer !== null && !q.correct).length;
  const unanswered = (sheet?.questions || []).filter((q) => q.answer === null).length;

  return (
    <Modal
      keyboard={false}
      open={Boolean(attemptId)}
      title={sheet ? `${sheet.exam.title} — answers` : 'Answers'}
      footer={null}
      width={{ xs: '100%', md: 900 }}
      onCancel={onClose}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon title={error} />}
      {!sheet && !error && <Spin style={{ display: 'block', margin: '32px auto' }} />}
      {sheet && (
        <>
          <Space wrap style={{ marginBottom: 12 }}>
            <Typography.Text>
              Submitted {new Date(sheet.submitted_at.replace(' ', 'T')).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
              {aptitude && <> · Score <strong>{sheet.score} / {sheet.max_score}</strong> ({sheet.percent}%)</>}
            </Typography.Text>
            {aptitude && sheet.passed !== null && <Tag color={sheet.passed ? 'success' : 'error'}>{sheet.passed ? 'Passed' : 'Failed'}</Tag>}
            {aptitude && (
              <Segmented
                size="small" value={filter} onChange={setFilter}
                options={[
                  { label: `All (${sheet.questions.length})`, value: 'all' },
                  { label: `Wrong (${wrong})`, value: 'wrong' },
                  { label: `Unanswered (${unanswered})`, value: 'unanswered' },
                ]}
              />
            )}
          </Space>
          {!aptitude && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              1 Strongly Disagree … 5 Strongly Agree. Reverse statements count as 6 − the answer; each trait's
              average is shown on the Online Exam tab. No right or wrong answers.
            </Typography.Paragraph>
          )}
          <Table rowKey="id" size="small" columns={columns} dataSource={rows} pagination={false} scroll={{ y: 480 }} />
        </>
      )}
    </Modal>
  );
}
