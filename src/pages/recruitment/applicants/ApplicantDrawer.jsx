import { useEffect, useState } from 'react';
import {
  Drawer, Spin, Alert, Tabs, Card, Descriptions, Row, Col, Tag, Typography, Space,
  Table, Button, Tooltip, Empty, Timeline, App,
} from 'antd';
import {
  CheckCircleFilled, CloseCircleFilled, ClockCircleOutlined, MinusCircleOutlined,
  ReloadOutlined, DownloadOutlined, UserOutlined, SolutionOutlined, TeamOutlined, PaperClipOutlined,
} from '@ant-design/icons';

import useAuth from '../../../hooks/useAuth';
import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import handleApiError from '../../../utils/handleApiError';
import downloadBlobResponse from '../../../utils/downloadBlobResponse';
import { formatDate } from '../../../utils/formatDate';
import { progressTagProps, ageFromBirthdate } from './applicantStatus';
import { PIPELINE, STATUS_LABELS, stepState, currentStep } from './stageProgress';

const show = (v) => (v === null || v === undefined || v === '' ? '-' : v);
const names = (ids, map) => (ids ? String(ids).split(',').map((id) => map[id.trim()] || id).join(', ') : '-');

const TONES = {
  done: { color: 'success', icon: <CheckCircleFilled /> },
  error: { color: 'error', icon: <CloseCircleFilled /> },
  process: { color: 'warning', icon: <ClockCircleOutlined /> },
  idle: { color: 'default', icon: <MinusCircleOutlined /> },
};

// The six pipeline steps as chips joined by connectors — the portal's
// progress bar. `onStepClick` (Phase 3) is offered only on the current,
// on-process step.
function StageChips({ applicant, onStepClick }) {
  const current = currentStep(applicant);
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      {PIPELINE.map((p, i) => {
        const state = stepState(applicant, p.step);
        const tone = TONES[state.tone];
        const clickable = onStepClick && state.tone === 'process' && i === current;
        const tag = (
          <Tag
            color={tone.color}
            icon={tone.icon}
            style={{ margin: 0, padding: '4px 10px', fontSize: 13, cursor: clickable ? 'pointer' : 'default' }}
            onClick={clickable ? () => onStepClick(p.step) : undefined}
          >
            {p.label}
          </Tag>
        );
        return (
          <Space key={p.step} size={6}>
            {clickable ? <Tooltip title="Update status">{tag}</Tooltip> : tag}
            {i < PIPELINE.length - 1 && (
              <span style={{ width: 18, borderTop: `2px solid ${state.tone === 'done' ? '#52c41a' : '#d9d9d9'}` }} />
            )}
          </Space>
        );
      })}
    </div>
  );
}

const DESC = { size: 'small', column: { xs: 1, sm: 2, lg: 3 } };

// Age when the applicant applied — computed from the birthday and the
// application date (ageFromBirthdate), the same moment the portal's stored
// `age` captures, but without trusting the value the browser sent. Under 18
// on that date means the birthday itself was likely mistyped (e.g. the
// current year), so flag it for HR instead of showing a bare 0.
const MIN_APPLICANT_AGE = 18;
const renderPersonal = (a, key) => {
  const age = ageFromBirthdate(a.birthdate, a.date_applied || a.date_submitted);
  const value = key === 'age' ? (age ?? a.age) : a[key];
  if ((key === 'age' || key === 'birthdate') && age !== null && age < MIN_APPLICANT_AGE) {
    return (
      <Space size={6} wrap>
        <span>{show(value)}</span>
        <Tooltip title={`Under ${MIN_APPLICANT_AGE} when they applied by this birthday — likely entered wrong. Verify with the applicant.`}>
          <Tag color="warning" style={{ margin: 0 }}>Check birthday</Tag>
        </Tooltip>
      </Space>
    );
  }
  return show(value);
};

// Personal Information, grouped. Labels sit above values (vertical layout) so
// long text — addresses, e-mail — gets the column's full width instead of
// sharing a row with its label. [label, applicant field, span?]
const PERSONAL_SECTIONS = [
  {
    title: 'Basic Information',
    fields: [
      ['Full Name', 'name', 2], ['Gender', 'gender'], ['Birthday', 'birthdate'], ['Age When Applied', 'age'],
      ['Birth Place', 'birth_place'], ['Civil Status', 'civil_status'], ['Citizenship', 'citizenship'],
      ['Religion', 'religion'], ['Height', 'height'], ['Weight', 'weight'],
    ],
  },
  {
    title: 'Contact & Address',
    fields: [
      ['Contact Number', 'contact_no'], ['Email', 'email', 2],
      ['Present Address', 'address', 'filled'], ['Home Address', 'address2', 'filled'],
    ],
  },
  {
    title: 'Government IDs',
    fields: [['SSS No.', 'sss_no'], ['Pag-IBIG No.', 'pagibig_no'], ['PhilHealth No.', 'philhealth_no'], ['TIN No.', 'tin_no']],
  },
  {
    title: 'Education & Application',
    fields: [
      ['Highest Attainment', 'educ_attain'], ['Course', 'course'], ['Source', 'how_learn'], ['Referral Code', 'referral_code'],
    ],
  },
];

function PersonalTab({ data }) {
  const a = data.applicant;
  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      {PERSONAL_SECTIONS.map(({ title, fields }) => (
        <Card key={title} size="small" title={title}>
          <Descriptions
            {...DESC}
            layout="vertical"
            items={fields.map(([label, key, span]) => ({ key, label, span, children: renderPersonal(a, key) }))}
          />
        </Card>
      ))}

      <Card size="small" title="Educational Background">
        {data.educ_attains.length ? (
          <Table
            rowKey="id" size="small" pagination={false} dataSource={data.educ_attains} scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Level', dataIndex: 'educ_level', render: (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : '-') },
              { title: 'School', dataIndex: 'school', render: show },
              { title: 'Course / Strand', dataIndex: 'course', render: show },
              { title: 'S.Y. Attended', dataIndex: 'sy_attended', render: show },
              { title: 'Honors', dataIndex: 'honors', render: show },
            ]}
          />
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No education records." />}
      </Card>

      <Card size="small" title="Parents / Guardian / Spouse">
        <PeopleTable rows={data.fam_members} empty="No family members." firstColumn={{ title: 'Relationship', dataIndex: 'relationship' }} />
      </Card>

      <Card size="small" title="Dependents">
        <PeopleTable rows={data.dependents} empty="No dependents." firstColumn={{ title: 'Relationship', dataIndex: 'relationship' }} />
      </Card>
    </Space>
  );
}

function PeopleTable({ rows, empty, firstColumn }) {
  if (!rows?.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;
  return (
    <Table
      rowKey="id" size="small" pagination={false} dataSource={rows} scroll={{ x: 'max-content' }}
      columns={[
        { ...firstColumn, render: show },
        { title: 'Name', dataIndex: 'name', render: show },
        { title: 'Age', dataIndex: 'age', render: show },
        { title: 'Address', dataIndex: 'address', render: show },
        { title: 'Contact', dataIndex: 'contact', render: show },
        { title: 'Occupation', dataIndex: 'occupation', render: show },
      ]}
    />
  );
}

function FilesTab({ files, canDownload }) {
  const { message: messageApi } = App.useApp();
  const download = async (file) => {
    try {
      const response = await recruitmentApi.downloadFile(file.id);
      await downloadBlobResponse(response, `${file.title || 'file'}.${file.file_type || ''}`.replace(/\.$/, ''), messageApi);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };
  if (!files.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No files uploaded." />;
  return (
    <Table
      rowKey="id" size="small" pagination={false} dataSource={files}
      columns={[
        { title: 'Document', dataIndex: 'title', render: (v) => <Tag>{show(v)}</Tag> },
        { title: 'Type', dataIndex: 'file_type', render: (v) => show(v)?.toUpperCase?.() ?? '-' },
        { title: 'Uploaded', dataIndex: 'created_at', render: (v) => formatDate(v) },
        ...(canDownload ? [{
          title: 'Actions', key: 'actions', width: 80,
          render: (_, file) => (
            <Tooltip title="Download">
              <Button color="purple" variant="outlined" size="small" icon={<DownloadOutlined />} onClick={() => download(file)} />
            </Tooltip>
          ),
        }] : []),
      ]}
    />
  );
}

// Right-hand summary of every step: status, date and the step's own details
// (the portal's ApplicationProgressCard, read-only).
function ProgressSummary({ applicant, maps }) {
  const extra = {
    0: [['Date Applied', applicant.date_submitted || formatDate(applicant.date_applied)], ['Position Applied', applicant.position_name], ['Branch Applied', applicant.branch_name]],
    1: [['Position Preference', names(applicant.position_preference, maps.positions)], ['Branch Preference', names(applicant.branch_preference, maps.branches)]],
    2: [['Branch Complied', applicant.branch_complied]],
    4: [
      ['Employment Position', maps.positions[String(applicant.employment_position)] || applicant.employment_position],
      ['Employment Branch', maps.branches[String(applicant.employment_branch)] || applicant.employment_branch],
      ['Hiring Officer', [applicant.hiring_officer_name, applicant.hiring_officer_position].filter(Boolean).join(' — ')],
      ['Non-Compliant Reason', applicant.final_interview_remarks],
    ],
    5: [['Contract Signed', formatDate(applicant.signing_of_contract_date)], ['Non-Compliant Reason', applicant.orientation_remarks]],
  };
  return (
    <Card size="small" title="Application Progress">
      <Timeline
        items={PIPELINE.map((p) => {
          const state = stepState(applicant, p.step);
          const rows = (extra[p.step] || []).filter(([, v]) => v && v !== '-');
          return {
            key: p.step,
            color: { done: 'green', error: 'red', process: 'orange', idle: 'gray' }[state.tone],
            title: (
              <Space size={6} wrap>
                <Typography.Text strong>{p.label}</Typography.Text>
                {state.status !== null && <Tag color={TONES[state.tone].color}>{STATUS_LABELS[state.status]}</Tag>}
              </Space>
            ),
            content: (
              <div style={{ fontSize: 12 }}>
                {applicant[p.dateField] && <div>Date: {formatDate(applicant[p.dateField])}</div>}
                {rows.map(([label, value]) => <div key={label}><Typography.Text type="secondary">{label}:</Typography.Text> {value}</div>)}
              </div>
            ),
          };
        })}
      />
    </Card>
  );
}

// Applicant details drawer (Phase 2: view). `maps` = { branches, positions }
// id→name lookups from the list response.
export default function ApplicantDrawer({ applicantId, open, onClose, maps }) {
  const { message: messageApi } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const can = (p) => hasRole('Administrator') || hasPermission(p);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || !applicantId) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: res } = await recruitmentApi.viewApplicant(applicantId);
        if (cancelled) return;
        if (!res?.success || !res.applicant) {
          setError(res?.error || 'Could not load this applicant.');
          return;
        }
        setData(res);
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Could not load this applicant.');
        handleApiError(err, messageApi);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, applicantId, reloadKey, messageApi]);

  const applicant = data?.applicant;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      destroyOnHidden
      afterOpenChange={(isOpen) => { if (!isOpen) setData(null); }}
      size="min(1280px, 100vw)"
      title={applicant ? (
        <Space size={8} wrap>
          <span>{applicant.name}</span>
          {applicant.progress_status && <Tag {...progressTagProps(applicant)}>{applicant.progress_status}</Tag>}
        </Space>
      ) : 'Applicant'}
      extra={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)} loading={loading}>Refresh</Button>}
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        {applicant && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small">
              <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text type="secondary">
                  {applicant.position_name} · {applicant.branch_name} · applied {applicant.date_submitted || formatDate(applicant.date_applied)}
                </Typography.Text>
                <StageChips applicant={applicant} />
              </Space>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} xl={16}>
                <Tabs
                  items={[
                    { key: 'personal', label: 'Personal Information', icon: <UserOutlined />, children: <PersonalTab data={data} /> },
                    {
                      key: 'experience', label: 'Work Experience', icon: <SolutionOutlined />,
                      children: data.experiences.length ? (
                        <Table
                          rowKey="id" size="small" pagination={false} dataSource={data.experiences} scroll={{ x: 'max-content' }}
                          columns={[
                            { title: 'Company / Employer', dataIndex: 'employer', render: show },
                            { title: 'Position', dataIndex: 'position', render: show },
                            { title: 'Salary', dataIndex: 'salary', render: show },
                            { title: 'Date of Service', dataIndex: 'date_of_service', render: show },
                            { title: 'Job Description', dataIndex: 'job_description', render: show },
                          ]}
                        />
                      ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No work experience." />,
                    },
                    {
                      key: 'references', label: 'References', icon: <TeamOutlined />,
                      children: data.references.length ? (
                        <Table
                          rowKey="id" size="small" pagination={false} dataSource={data.references} scroll={{ x: 'max-content' }}
                          columns={[
                            { title: 'Name', dataIndex: 'name', render: show },
                            { title: 'Address', dataIndex: 'address', render: show },
                            { title: 'Contact', dataIndex: 'contact', render: show },
                            { title: 'Company', dataIndex: 'company', render: show },
                            { title: 'Position', dataIndex: 'position', render: show },
                          ]}
                        />
                      ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No references." />,
                    },
                    ...(can('careers-file-list') ? [{
                      key: 'files', label: `Files (${data.applicant_files.length})`, icon: <PaperClipOutlined />,
                      children: <FilesTab files={data.applicant_files} canDownload={can('careers-file-download')} />,
                    }] : []),
                  ]}
                />
              </Col>
              <Col xs={24} xl={8}>
                <ProgressSummary applicant={applicant} maps={maps} />
              </Col>
            </Row>
          </Space>
        )}
      </Spin>
    </Drawer>
  );
}
