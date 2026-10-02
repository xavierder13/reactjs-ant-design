import { useEffect, useState } from 'react';
import {
  Drawer, Spin, Alert, Tabs, Card, Descriptions, Row, Col, Tag, Typography, Space,
  Table, Button, Tooltip, Empty, Timeline, App,
} from 'antd';
import {
  ReloadOutlined, EditOutlined, LockOutlined, MailOutlined, FilePdfOutlined, UserOutlined, SolutionOutlined, TeamOutlined, PaperClipOutlined,
} from '@ant-design/icons';

import useAuth from '../../../hooks/useAuth';
import recruitmentApi from '../../../services/recruitment/recruitmentApi';
import handleApiError from '../../../utils/handleApiError';
import { formatDate } from '../../../utils/formatDate';
import { progressTagProps, ageFromBirthdate } from './applicantStatus';
import { PIPELINE, STATUS_LABELS, stepState, currentStep } from './stageProgress';
import StatusUpdateModal from './StatusUpdateModal';
import ApplicantFilesTab from './ApplicantFilesTab';
import SendNotificationModal from './SendNotificationModal';
import { typeForResend } from './notifications';
import { downloadApplicationFormPdf } from './applicationFormPdf';

// Steps a Branch Manager may not update (portal userHasPermissionToUpdateStatus;
// the gateway refuses them too).
const BRANCH_MANAGER_LOCKED_STEPS = [1, 4, 5];

const show = (v) => (v === null || v === undefined || v === '' ? '-' : v);
const names = (ids, map) => (ids ? String(ids).split(',').map((id) => map[id.trim()] || id).join(', ') : '-');

// Status tag colour per step state (portal progressStatus()).
const TONES = { done: 'success', error: 'error', process: 'warning', idle: 'default' };

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

// Right-hand summary of every step: status, date and the step's own details
// (the portal's ApplicationProgressCard). The current on-process step
// carries the status update: `onUpdateStatus(step)` when the user may
// update it, else `lockedNote` explains why not. `onEdit` opens the
// hiring details; `onNotify` (envelope) resends the current step's
// email / SMS.
function ProgressSummary({ applicant, maps, onEdit, onNotify, onUpdateStatus, lockedNote }) {
  const current = currentStep(applicant);
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
    <Card
      size="small"
      title="Application Progress"
      extra={(onEdit || onNotify) && (
        <Space size={4}>
          {onEdit && (
            <Tooltip title="Edit hiring details">
              <Button color="green" variant="outlined" size="small" icon={<EditOutlined />} onClick={onEdit} />
            </Tooltip>
          )}
          {onNotify && (
            <Tooltip title="Send notification">
              <Button color="cyan" variant="outlined" size="small" icon={<MailOutlined />} onClick={onNotify} />
            </Tooltip>
          )}
        </Space>
      )}
    >
      <Timeline
        items={PIPELINE.map((p) => {
          const state = stepState(applicant, p.step);
          const rows = (extra[p.step] || []).filter(([, v]) => v && v !== '-');
          const isCurrent = p.step === current && state.tone === 'process';
          return {
            key: p.step,
            color: { done: 'green', error: 'red', process: 'orange', idle: 'gray' }[state.tone],
            title: (
              <Space size={6} wrap>
                <Typography.Text strong>{p.label}</Typography.Text>
                {state.status !== null && <Tag color={TONES[state.tone]}>{STATUS_LABELS[state.status]}</Tag>}
              </Space>
            ),
            content: (
              <div style={{ fontSize: 12 }}>
                {isCurrent && onUpdateStatus && (
                  <Button
                    color="green" variant="outlined" size="small" icon={<EditOutlined />}
                    style={{ margin: '-1px 0 6px' }} onClick={() => onUpdateStatus(p.step)}
                  >
                    Update Status
                  </Button>
                )}
                {applicant[p.dateField] && <div>Date: {formatDate(applicant[p.dateField])}</div>}
                {rows.map(([label, value]) => <div key={label}><Typography.Text type="secondary">{label}:</Typography.Text> {value}</div>)}
                {isCurrent && !onUpdateStatus && lockedNote && (
                  <Typography.Text type="secondary" italic style={{ display: 'block', marginTop: 4 }}>
                    <LockOutlined /> {lockedNote}
                  </Typography.Text>
                )}
              </div>
            ),
          };
        })}
      />
    </Card>
  );
}

// Applicant details drawer: view, status update (current stage chip),
// hiring details (progress card pencil) and files. `maps` = { branches,
// positions } id→name lookups from the list response. `onApplicantChange(id,
// row?)` tells the list a save happened — `row` (list-row shape) when the
// portal returned the updated applicant.
export default function ApplicantDrawer({ applicantId, open, onClose, maps, onApplicantChange }) {
  const { message: messageApi } = App.useApp();
  const { hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('Administrator');
  const can = (p) => isAdmin || hasPermission(p);
  const isBranchManager = !isAdmin && hasRole('Branch Manager');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // { mode: 'status' | 'details', step } while the update modal is open.
  const [editing, setEditing] = useState(null);
  // { step, notifType, scheduleDate?, afterSave } while the notification dialog is open.
  const [notifying, setNotifying] = useState(null);

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
  const lockedForBranchManager = isBranchManager && BRANCH_MANAGER_LOCKED_STEPS.includes(currentStep(applicant));
  const canUpdateStatus = can('careers-update-status') && !lockedForBranchManager;
  const statusLockedNote = can('careers-update-status') && lockedForBranchManager
    ? 'Branch Managers can\'t update this stage — HR updates it.' : null;
  const canEditHiringDetails = can('careers-update-hiring-details') && !isBranchManager;
  const canEmail = can('careers-notification-send-email');
  const canSms = can('careers-notification-send-sms');
  // Manual resend: not Branch Managers (portal card), only when the current
  // state has a notification.
  const resendType = applicant && (canEmail || canSms) && !isBranchManager ? typeForResend(applicant) : '';

  // Application form PDF (portal: anyone who can open the applicant).
  const [pdfBusy, setPdfBusy] = useState(false);
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadApplicationFormPdf(data);
    } catch (err) {
      messageApi.error(err.message || 'The application form could not be generated.');
    } finally {
      setPdfBusy(false);
    }
  };

  const handleChanged = (row) => {
    setReloadKey((k) => k + 1);
    onApplicantChange?.(applicantId, row);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      destroyOnHidden
      afterOpenChange={(isOpen) => { if (!isOpen) setData(null); }}
      size="min(1440px, 100vw)"
      title={applicant ? (
        <Space size={8} wrap>
          <span>{applicant.name}</span>
          {applicant.progress_status && <Tag {...progressTagProps(applicant)}>{applicant.progress_status}</Tag>}
        </Space>
      ) : 'Applicant'}
      extra={(
        <Space>
          <Button icon={<FilePdfOutlined />} onClick={downloadPdf} loading={pdfBusy} disabled={!applicant}>Application Form</Button>
          <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)} loading={loading}>Refresh</Button>
        </Space>
      )}
    >
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        {applicant && (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={15}>
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
                      children: (
                        <ApplicantFilesTab
                          applicant={applicant} files={data.applicant_files} maps={maps} can={can}
                          onChanged={() => handleChanged()}
                        />
                      ),
                    }] : []),
                  ]}
                />
              </Col>
              <Col xs={24} lg={9}>
                <ProgressSummary
                  applicant={applicant}
                  maps={maps}
                  onUpdateStatus={canUpdateStatus ? (step) => setEditing({ mode: 'status', step }) : undefined}
                  lockedNote={statusLockedNote}
                  onNotify={resendType ? () => setNotifying({ step: currentStep(applicant), notifType: resendType, afterSave: false }) : undefined}
                  onEdit={canEditHiringDetails ? () => setEditing({ mode: 'details', step: currentStep(applicant) }) : undefined}
                />
              </Col>
            </Row>
          </Space>
        )}
      </Spin>

      <StatusUpdateModal
        open={Boolean(editing && applicant)}
        mode={editing?.mode}
        step={editing?.step}
        data={data}
        maps={maps}
        isBranchManager={isBranchManager}
        canEditHiringDetails={can('careers-update-hiring-details')}
        onClose={() => setEditing(null)}
        onSaved={(row, notify) => {
          setEditing(null);
          handleChanged(row);
          if (notify && (canEmail || canSms)) setNotifying({ ...notify, afterSave: true });
        }}
      />

      <SendNotificationModal
        open={Boolean(notifying && applicant)}
        applicant={applicant}
        step={notifying?.step}
        notifType={notifying?.notifType}
        scheduleDate={notifying?.scheduleDate}
        afterSave={notifying?.afterSave}
        maps={maps}
        canEmail={canEmail}
        canSms={canSms}
        onClose={() => setNotifying(null)}
      />
    </Drawer>
  );
}
