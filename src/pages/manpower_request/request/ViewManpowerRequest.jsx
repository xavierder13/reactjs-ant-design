import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Tag, Divider, Button, Space,
  Popconfirm, Spin, Result, Breadcrumb, Modal, Input, Timeline, Upload, message,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, SendOutlined, CloseCircleOutlined,
  CheckCircleOutlined, FileTextOutlined, DeleteOutlined, PrinterOutlined,
  UserAddOutlined, ReloadOutlined, UploadOutlined, DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../../hooks/useAuth';
import useManpowerRequestStore from '../../../store/manpowerRequestStore';
import manpowerRequestApi from '../../../services/manpower_request/manpowerRequestApi';
import handleApiError from '../../../utils/handleApiError';
import EmployeeSelect from './EmployeeSelect';

const STATUS_COLORS = {
  Draft:              'default',
  // 'Submitted' is confirmed dead — submit() moves Draft straight to
  // 'Pending Approval' — kept only so an unexpected value doesn't look broken.
  Submitted:          'blue',
  'Pending Approval':  'gold',
  Approved:           'green',
  Disapproved:        'red',
  Returned:           'orange',
  Cancelled:          'default',
};

const HISTORY_COLORS = {
  Approved:    'green',
  Disapproved: 'red',
  Returned:    'orange',
  Pending:     'gray',
};

const ViewManpowerRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission, hasRole, user } = useAuth();
  const fetchById = useManpowerRequestStore((state) => state.fetchById);
  const [messageApi, contextHolder] = message.useMessage();

  const [record, setRecord]                 = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // Shared modal for Disapprove / Return for Revision — both just collect
  // required remarks and call a different endpoint.
  const [remarksModalMode, setRemarksModalMode] = useState(null); // 'reject' | 'return' | null
  const [remarksText, setRemarksText]           = useState('');
  const [remarksSubmitting, setRemarksSubmitting] = useState(false);

  const [historyOpen, setHistoryOpen]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);

  // Record Hires modal — "FOR HR USE ONLY" step, only available once the
  // request is Approved. One row per position line item.
  const [hireModalOpen, setHireModalOpen]   = useState(false);
  const [hireRows, setHireRows]             = useState([]);
  const [hireSubmitting, setHireSubmitting] = useState(false);

  // Attachment — required for Additional/New Position lines before the
  // request can be submitted (enforced server-side in
  // ManpowerRequestService::submit()). Tracks which detail line is
  // currently mid-upload/mid-delete so only that line's button shows a
  // loading state.
  const [attachmentBusyId, setAttachmentBusyId] = useState(null);

  const loadRecord = useCallback(async () => {
    const result = await fetchById(id);
    setRecord(result ? result.manpower_request : null);
    setApprovalStatus(result ? result.approval_status : null);
  }, [fetchById, id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadRecord();
      setLoading(false);
    })();
  }, [loadRecord]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  }

  if (!record) {
    return (
      <Result
        status="404"
        title="Manpower request not found"
        extra={
          <Button type="primary" onClick={() => navigate('/manpower-requests')}>
            Back to List
          </Button>
        }
      />
    );
  }

  const canActOnApproval = approvalStatus?.can_approve === true;

  // Editing is Administrator-or-owner, same pattern as canDelete: Admin
  // bypasses ownership, everyone else needs the permission AND to be the
  // requestor. Status gate applies to both.
  const canEdit =
    ['Draft', 'Disapproved', 'Cancelled', 'Returned'].includes(record.status) &&
    (hasRole('Administrator') ||
      (hasAnyPermission('manpower-request-create', 'manpower-request-edit') && record.user_id === user.id));

  // Submit and Resubmit are the same backend action/permission — only the
  // label differs. Backend allows this from Draft/Disapproved/Cancelled/
  // Returned; resubmitting from Returned resumes approval at the same level
  // instead of restarting the chain — see ManpowerRequestService::submit().
  const canSubmit =
    hasPermission('manpower-request-submit') &&
    ['Draft', 'Disapproved', 'Cancelled', 'Returned'].includes(record.status) &&
    record.user_id === user.id;

  const canCancel =
    hasPermission('manpower-request-cancel') &&
    ['Draft', 'Pending Approval', 'Returned'].includes(record.status) &&
    record.user_id === user.id;

  // Delete is a permanent hard-delete, unlike Cancel (which just changes
  // status). Administrators can delete any Draft/Cancelled request
  // regardless of who created it; everyone else needs the permission AND
  // to be the requestor.
  const canDelete =
    ['Draft', 'Cancelled'].includes(record.status) &&
    (hasRole('Administrator') || (hasPermission('manpower-request-delete') && record.user_id === user.id));

  const canApprove =
    hasPermission('manpower-request-approve') &&
    record.status === 'Pending Approval' &&
    canActOnApproval;

  const canReject =
    hasPermission('manpower-request-disapprove') &&
    record.status === 'Pending Approval' &&
    canActOnApproval;

  const canReturn =
    hasPermission('manpower-request-return') &&
    record.status === 'Pending Approval' &&
    canActOnApproval;

  // Recording hires is the "FOR HR USE ONLY" step — only meaningful once
  // the request is fully Approved, gated by its own permission (not tied
  // to ownership, since this is an HR/approver-side clerical step, not an
  // approval decision).
  const canRecordHire =
    hasPermission('manpower-request-record-hire') &&
    record.status === 'Approved';

  const totalManpower = (record.details || []).reduce((sum, d) => sum + (d.quantity || 0), 0);

  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      const { data } = await manpowerRequestApi.submit(record.id);
      messageApi.success(data.message);
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const { data } = await manpowerRequestApi.cancel(record.id);
      messageApi.success(data.message);
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const { data } = await manpowerRequestApi.delete(record.id);
      messageApi.success(data.message);
      navigate('/manpower-requests');
    } catch (error) {
      handleApiError(error, messageApi);
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const { data } = await manpowerRequestApi.approve(record.id);
      messageApi.success(data.message);
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setActionLoading(false);
    }
  };

  const openRemarksModal = (mode) => {
    setRemarksModalMode(mode);
    setRemarksText('');
  };

  const closeRemarksModal = () => {
    setRemarksModalMode(null);
    setRemarksText('');
  };

  const handleRemarksConfirm = async () => {
    if (!remarksText.trim()) {
      messageApi.warning('Please enter a reason.');
      return;
    }
    setRemarksSubmitting(true);
    try {
      const { data } = remarksModalMode === 'reject'
        ? await manpowerRequestApi.reject(record.id, remarksText)
        : await manpowerRequestApi.returnForRevision(record.id, remarksText);
      messageApi.success(data.message);
      closeRemarksModal();
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setRemarksSubmitting(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data } = await manpowerRequestApi.approvalHistory(record.id);
      setHistoryEntries(data.approval_history || []);
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Each row now carries `quantity` employee slots (2026-09-21) instead of
  // a single hire — an Additional/New Position line with quantity >= 2
  // needs that many hires recorded against it (see
  // ManpowerRequestDetailHire / ManpowerRequestService::recordHires()).
  // Pre-fills from any hires already recorded; the remaining slots up to
  // quantity start empty, same "may be left unfilled" allowance the old
  // single-slot version had.
  const openHireModal = () => {
    setHireRows((record.details || []).map((d) => {
      const existingHires = d.hires || [];
      const quantity = d.quantity || 1;
      const slots = Array.from({ length: quantity }, (_, i) => ({
        hired_employee_id:    existingHires[i]?.hired_employee_id || null,
        hired_employee_label: existingHires[i]?.employee?.full_name || null,
        // Read-only display only — Date Hired is always server-derived
        // (see resolveHireDate()); never entered here.
        date_hired: existingHires[i]?.date_hired || null,
      }));
      return {
        detail_id:     d.id,
        position_id:   d.position_id,
        position_name: d.position?.name || '—',
        type:           d.replacement_or_additional,
        slots,
      };
    }));
    setHireModalOpen(true);
  };

  const closeHireModal = () => setHireModalOpen(false);

  const updateHireSlot = (detailId, slotIndex, changes) => {
    setHireRows((rows) => rows.map((r) => (
      r.detail_id === detailId
        ? { ...r, slots: r.slots.map((s, i) => (i === slotIndex ? { ...s, ...changes } : s)) }
        : r
    )));
  };

  const handleHireConfirm = async () => {
    // One employee can't be recorded as hired for more than one position
    // (or more than one slot within the same position) on the same
    // request — checked client-side first for immediate feedback; the
    // backend re-checks this too (recordHires()).
    const chosenIds = hireRows.flatMap((r) => r.slots.map((s) => s.hired_employee_id)).filter(Boolean);
    const duplicateId = chosenIds.find((id, idx) => chosenIds.indexOf(id) !== idx);
    if (duplicateId) {
      const duplicateRow = hireRows.find((r) => r.slots.some((s) => s.hired_employee_id === duplicateId));
      const duplicateLabel = duplicateRow?.slots.find((s) => s.hired_employee_id === duplicateId)?.hired_employee_label;
      messageApi.error(
        `${duplicateLabel || 'This employee'} is selected for more than one position. Please choose a different employee for each position.`
      );
      return;
    }

    setHireSubmitting(true);
    try {
      // date_hired is not sent — the backend always derives it and ignores
      // any client value.
      const hires = hireRows.map((r) => ({
        detail_id:           r.detail_id,
        hired_employee_ids:  r.slots.map((s) => s.hired_employee_id).filter(Boolean),
      }));
      const { data } = await manpowerRequestApi.recordHire(record.id, hires);
      messageApi.success(data.message);
      closeHireModal();
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setHireSubmitting(false);
    }
  };

  const handleAttachmentUpload = async (detailId, file) => {
    setAttachmentBusyId(detailId);
    try {
      const { data } = await manpowerRequestApi.detailFileUpload(detailId, file);
      if (data.success) {
        messageApi.success(data.message);
        await loadRecord();
      } else {
        messageApi.error(data.message || 'Failed to attach file.');
      }
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setAttachmentBusyId(null);
    }
  };

  const handleAttachmentDownload = async (detail) => {
    try {
      const response = await manpowerRequestApi.detailFileDownload(detail.id);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = detail.file_name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      handleApiError(error, messageApi);
    }
  };

  const handleAttachmentDelete = async (detailId) => {
    setAttachmentBusyId(detailId);
    try {
      const { data } = await manpowerRequestApi.detailFileDelete(detailId);
      messageApi.success(data.message);
      await loadRecord();
    } catch (error) {
      handleApiError(error, messageApi);
    } finally {
      setAttachmentBusyId(null);
    }
  };

  return (
    <>
      {contextHolder}

      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: <Link to="/">Home</Link> },
          { title: <Link to="/manpower-requests">Manpower Requests</Link> },
          { title: 'View Request' },
        ]}
      />

      <Card
        title={
          <Row align="middle" gutter={8}>
            <Col>
              <Button
                icon={<ArrowLeftOutlined />}
                type="text"
                onClick={() => navigate('/manpower-requests')}
              />
            </Col>
            <Col>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {record.mrf_number}
              </Typography.Title>
            </Col>
            <Col>
              <Tag color={STATUS_COLORS[record.status] || 'default'}>
                {record.status}
              </Tag>
            </Col>
          </Row>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
              Refresh
            </Button>
            {canRecordHire && (
              <Button icon={<UserAddOutlined />} onClick={openHireModal}>
                Record Hires
              </Button>
            )}
            {hasPermission('manpower-request-print') && (
              <Button
                icon={<PrinterOutlined />}
                onClick={() => window.open(`/manpower-requests/${record.id}/print`, '_blank')}
              >
                Print
              </Button>
            )}
            <Button icon={<FileTextOutlined />} onClick={openHistory}>
              Approval History
            </Button>
          </Space>
        }
      >
        {/* ── Request Details ───────────────────────────────────────────── */}
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Requestor</Typography.Text>
            <div><Typography.Text strong>{record.user?.name || '—'}</Typography.Text></div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Branch</Typography.Text>
            <div><Typography.Text strong>{record.branch?.name || '—'}</Typography.Text></div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Request Date</Typography.Text>
            <div>
              <Typography.Text strong>
                {record.request_date ? dayjs(record.request_date).format('MM-DD-YYYY') : '—'}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Target Hiring Date</Typography.Text>
            <div>
              <Typography.Text strong>
                {record.target_hiring_date ? dayjs(record.target_hiring_date).format('MM-DD-YYYY') : '—'}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Priority</Typography.Text>
            <div><Typography.Text strong>{record.priority || '—'}</Typography.Text></div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Current Level</Typography.Text>
            <div><Typography.Text strong>{record.current_level || '—'}</Typography.Text></div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Approved Date</Typography.Text>
            <div>
              <Typography.Text strong>
                {record.date_approved ? dayjs(record.date_approved).format('MM-DD-YYYY') : '—'}
              </Typography.Text>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Manpower Required</Typography.Text>
            <div><Typography.Text strong>{totalManpower}</Typography.Text></div>
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Created</Typography.Text>
            <div>
              <Typography.Text strong>
                {record.created_at ? dayjs(record.created_at).format('MM-DD-YYYY') : '—'}
              </Typography.Text>
            </div>
          </Col>
          {record.status === 'Pending Approval' && approvalStatus?.current_level_approvers?.length > 0 && (
            <Col xs={24} md={12}>
              <Typography.Text type="secondary">Pending With</Typography.Text>
              <div>
                <Typography.Text strong>
                  {approvalStatus.current_level_approvers.map((a) => a.name).join(', ')}
                </Typography.Text>
              </div>
            </Col>
          )}
          <Col xs={24}>
            <Typography.Text type="secondary">Reason / Justification</Typography.Text>
            <div><Typography.Paragraph style={{ marginBottom: 0 }}>{record.reason || '—'}</Typography.Paragraph></div>
          </Col>
        </Row>

        {['Disapproved', 'Returned'].includes(record.status) && record.remarks && (
          <div style={{
            background: record.status === 'Disapproved' ? '#fff2f0' : '#fff7e6',
            border: `1px solid ${record.status === 'Disapproved' ? '#ffccc7' : '#ffd591'}`,
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 16,
          }}>
            <Typography.Text type={record.status === 'Disapproved' ? 'danger' : 'warning'} strong>
              {record.status === 'Disapproved' ? 'Disapproval Reason: ' : 'Return Remarks: '}
            </Typography.Text>
            <Typography.Text type={record.status === 'Disapproved' ? 'danger' : 'warning'}>
              {record.remarks}
            </Typography.Text>
          </div>
        )}

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* ── Position Requirements ─────────────────────────────────────── */}
        <Typography.Title level={5}>Position Requirements</Typography.Title>

        {(record.details || []).map((d) => {
          // Frontend-only, derived — not a stored field. "Open" while no
          // hire has been recorded against this line yet, "Closed" once at
          // least one has (matches this line's own `hires`, not the
          // quantity — a partially-filled line with quantity > 1 already
          // shows Closed the moment its first hire lands). User-confirmed
          // mapping (2026-09-22): the opposite direction reads more
          // naturally but was explicitly checked against, not assumed.
          const hiredCount = (d.hires || []).length;
          const lineStatus = hiredCount > 0 ? 'Closed' : 'Open';

          // Same concept as each hire's own "Time to Fill" below (Date
          // Approved -> Date Hired), but for a line that isn't filled yet:
          // Date Approved -> today. Only meaningful once the MRF itself has
          // an approval date and only while the line is still Open — once
          // a hire lands, Time to Fill (per hire, below) is the relevant
          // number instead.
          const agingDays = lineStatus === 'Open' && record.date_approved
            ? dayjs().diff(dayjs(record.date_approved), 'day')
            : null;

          return (
          <Card key={d.id} size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Typography.Text type="secondary">Position</Typography.Text>
                <div><Typography.Text strong>{d.position?.name || '—'}</Typography.Text></div>
              </Col>
              <Col xs={24} md={6}>
                <Typography.Text type="secondary">Employment Type</Typography.Text>
                <div><Typography.Text strong>{d.employment_type || '—'}</Typography.Text></div>
              </Col>
              <Col xs={24} md={4}>
                <Typography.Text type="secondary">Quantity</Typography.Text>
                <div><Typography.Text strong>{d.quantity ?? '—'}</Typography.Text></div>
              </Col>
              <Col xs={24} md={4}>
                <Typography.Text type="secondary">Status</Typography.Text>
                <div>
                  <Tag color={lineStatus === 'Open' ? 'processing' : 'success'}>{lineStatus}</Tag>
                </div>
              </Col>
              {agingDays !== null && (
                <Col xs={24} md={4}>
                  <Typography.Text type="secondary">Aging</Typography.Text>
                  <div><Typography.Text strong>{agingDays} day(s)</Typography.Text></div>
                </Col>
              )}
            </Row>

            {/* Required before the parent request can be submitted for
                approval — enforced server-side in
                ManpowerRequestService::submit(), not just a UI nudge.
                Reuses `canEdit` (status + Administrator-or-owner +
                permission) for upload/delete, same as every other
                mutation on this line — download has no gate beyond being
                able to view the page at all. */}
            {['Additional', 'New Position'].includes(d.replacement_or_additional) && (
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col xs={24}>
                  <Typography.Text type="secondary">Supporting Attachment</Typography.Text>
                  <div style={{ marginTop: 4 }}>
                    {d.file_name ? (
                      <Space>
                        <Typography.Text strong>{d.file_name}</Typography.Text>
                        <Button size="small" icon={<DownloadOutlined />} onClick={() => handleAttachmentDownload(d)}>
                          Download
                        </Button>
                        {canEdit && (
                          <Popconfirm title="Delete this attachment?" onConfirm={() => handleAttachmentDelete(d.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} loading={attachmentBusyId === d.id}>
                              Delete
                            </Button>
                          </Popconfirm>
                        )}
                      </Space>
                    ) : (
                      <Space direction="vertical" size={4}>
                        {canEdit && (
                          <Upload
                            accept=".jpeg,.jpg,.png,.docs,.docx,.pdf"
                            showUploadList={false}
                            beforeUpload={(file) => { handleAttachmentUpload(d.id, file); return false; }}
                            disabled={attachmentBusyId === d.id}
                          >
                            <Button size="small" icon={<UploadOutlined />} loading={attachmentBusyId === d.id}>
                              Attach File
                            </Button>
                          </Upload>
                        )}
                        <Typography.Text type="warning" style={{ fontSize: 12 }}>
                          Required before this request can be submitted for approval.
                        </Typography.Text>
                      </Space>
                    )}
                  </div>
                </Col>
              </Row>
            )}

            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Replacement / Additional</Typography.Text>
                <div><Typography.Text strong>{d.replacement_or_additional || '—'}</Typography.Text></div>
              </Col>
              {d.replacement_or_additional === 'Replacement' && (
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Replacement Employee</Typography.Text>
                  <div>
                    <Typography.Text strong>
                      {d.replacement_employee?.full_name || d.replacement_employee_id || '—'}
                    </Typography.Text>
                  </div>
                </Col>
              )}
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Salary Grade</Typography.Text>
                <div><Typography.Text strong>{d.salary_grade || '—'}</Typography.Text></div>
              </Col>
            </Row>

            {d.replacement_or_additional === 'Replacement' && (
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Reason for Replacement</Typography.Text>
                  <div>
                    <Typography.Text strong>
                      {d.replacement_reason === 'Others' ? d.replacement_reason_other : d.replacement_reason || '—'}
                    </Typography.Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Last Working Day</Typography.Text>
                  <div>
                    <Typography.Text strong>
                      {d.last_working_day ? dayjs(d.last_working_day).format('MM-DD-YYYY') : '—'}
                    </Typography.Text>
                  </div>
                </Col>
              </Row>
            )}

            {/* Snapshotted at save time (create/update), not live — see
                ManpowerRequestService::resolveHeadcountSnapshot(). */}
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Required Plantilla</Typography.Text>
                <div><Typography.Text strong>{d.required_plantilla ?? 'N/A'}</Typography.Text></div>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Existing Headcount</Typography.Text>
                <div><Typography.Text strong>{d.existing_headcount ?? '—'}</Typography.Text></div>
              </Col>
            </Row>

            {/* A line can now have more than one recorded hire (Additional/
                New Position with quantity > 1) — one row per hire, since
                each can have its own employee/date/time-to-fill. */}
            {(d.hires || []).map((hire) => (
              <Row gutter={16} style={{ marginTop: 12 }} key={hire.id}>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Hired Employee</Typography.Text>
                  <div><Typography.Text strong>{hire.employee?.full_name || '—'}</Typography.Text></div>
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Date Hired</Typography.Text>
                  <div>
                    <Typography.Text strong>
                      {hire.date_hired ? dayjs(hire.date_hired).format('MM-DD-YYYY') : '—'}
                    </Typography.Text>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Time to Fill</Typography.Text>
                  <div>
                    <Typography.Text strong>
                      {/* Date Approved -> Date Hired. Date Hired is the
                          employee's latest branch-assignment date (or
                          date_employed if they have no assignment history
                          — see ManpowerRequestService::resolveHireDate()),
                          not necessarily their original hire date, since a
                          filled position can be an internal transfer. */}
                      {record.date_approved && hire.date_hired
                        ? `${dayjs(hire.date_hired).diff(dayjs(record.date_approved), 'day')} day(s)`
                        : '—'}
                    </Typography.Text>
                  </div>
                </Col>
              </Row>
            ))}

            {(d.qualifications || d.experience || d.education) && (
              <Row gutter={16} style={{ marginTop: 12 }}>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Qualifications</Typography.Text>
                  <div><Typography.Text>{d.qualifications || '—'}</Typography.Text></div>
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Experience</Typography.Text>
                  <div><Typography.Text>{d.experience || '—'}</Typography.Text></div>
                </Col>
                <Col xs={24} md={8}>
                  <Typography.Text type="secondary">Education</Typography.Text>
                  <div><Typography.Text>{d.education || '—'}</Typography.Text></div>
                </Col>
              </Row>
            )}

            {(d.gender || d.age_min || d.age_max || d.experience_required != null ||
              d.prc_license_status || d.drivers_license_status) && (
              <>
                <Divider style={{ margin: '12px 0' }} plain>Job Specifications</Divider>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Gender</Typography.Text>
                    <div><Typography.Text strong>{d.gender || '—'}</Typography.Text></div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Age Range</Typography.Text>
                    <div>
                      <Typography.Text strong>
                        {d.age_min || d.age_max ? `${d.age_min ?? '—'} - ${d.age_max ?? '—'}` : '—'}
                      </Typography.Text>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Work Experience</Typography.Text>
                    <div>
                      <Typography.Text strong>
                        {d.experience_required === true
                          ? `Required (${d.experience_years ?? '—'} yrs)`
                          : d.experience_required === false ? 'Not Required' : '—'}
                      </Typography.Text>
                    </div>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 12 }}>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">PRC License</Typography.Text>
                    <div>
                      <Typography.Text strong>
                        {d.prc_license_status === 'Required'
                          ? `Required — ${d.prc_license_type || '—'}`
                          : d.prc_license_status || '—'}
                      </Typography.Text>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">Driver's License</Typography.Text>
                    <div>
                      <Typography.Text strong>
                        {['Professional', 'Non-Professional'].includes(d.drivers_license_status)
                          ? `${d.drivers_license_status} — Code ${d.drivers_license_code || '—'}`
                          : d.drivers_license_status || '—'}
                      </Typography.Text>
                    </div>
                  </Col>
                </Row>
              </>
            )}
          </Card>
          );
        })}

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* ── Action Buttons ────────────────────────────────────────────── */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              {canApprove && (
                <Popconfirm
                  title="Approve this request?"
                  onConfirm={handleApprove}
                  okText="Yes, Approve"
                  okButtonProps={{ type: 'primary' }}
                >
                  <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading}>
                    Approve
                  </Button>
                </Popconfirm>
              )}

              {canReject && (
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => openRemarksModal('reject')}
                >
                  Disapprove
                </Button>
              )}

              {canReturn && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openRemarksModal('return')}
                >
                  Return for Revision
                </Button>
              )}
            </Space>
          </Col>

          <Col>
            <Space>
              {canEdit && (
                <Link to={`/manpower-requests/${record.id}/edit`}>
                  <Button icon={<EditOutlined />}>Edit</Button>
                </Link>
              )}

              {canSubmit && (
                <Popconfirm
                  title={`${['Disapproved', 'Cancelled', 'Returned'].includes(record.status) ? 'Resubmit' : 'Submit'} this request for approval?`}
                  onConfirm={handleSubmit}
                >
                  <Button type="primary" icon={<SendOutlined />} loading={actionLoading}>
                    {['Disapproved', 'Cancelled', 'Returned'].includes(record.status) ? 'Resubmit' : 'Submit'}
                  </Button>
                </Popconfirm>
              )}

              {canCancel && (
                <Popconfirm
                  title="Cancel this request?"
                  onConfirm={handleCancel}
                >
                  <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>
                    Cancel
                  </Button>
                </Popconfirm>
              )}

              {canDelete && (
                <Popconfirm
                  title="Delete this request?"
                  description="This permanently deletes the draft and cannot be undone."
                  onConfirm={handleDelete}
                >
                  <Button danger icon={<DeleteOutlined />} loading={actionLoading}>
                    Delete
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>

        {/* ── Disapprove / Return Remarks Modal ─────────────────────────── */}
        <Modal
          title={remarksModalMode === 'reject' ? 'Disapprove Request' : 'Return Request for Revision'}
          open={remarksModalMode !== null}
          onCancel={closeRemarksModal}
          footer={[
            <Button key="cancel" onClick={closeRemarksModal}>
              Cancel
            </Button>,
            <Button
              key="confirm"
              danger={remarksModalMode === 'reject'}
              type={remarksModalMode === 'return' ? 'primary' : undefined}
              loading={remarksSubmitting}
              onClick={handleRemarksConfirm}
            >
              {remarksModalMode === 'reject' ? 'Confirm Disapprove' : 'Confirm Return'}
            </Button>,
          ]}
        >
          <Typography.Paragraph type="secondary">
            Please provide a reason for {remarksModalMode === 'reject' ? 'disapproving' : 'returning'} this request.
          </Typography.Paragraph>
          <Input.TextArea
            rows={4}
            placeholder="Enter reason..."
            value={remarksText}
            onChange={(e) => setRemarksText(e.target.value)}
            maxLength={500}
          />
        </Modal>

        {/* ── Approval History Modal ────────────────────────────────────── */}
        <Modal
          title="Approval History"
          open={historyOpen}
          onCancel={() => setHistoryOpen(false)}
          footer={null}
          width={600}
        >
          {historyLoading ? (
            <Spin />
          ) : historyEntries.length === 0 ? (
            <Typography.Text type="secondary">No approval history yet.</Typography.Text>
          ) : (
            <Timeline
              items={historyEntries.map((entry, idx) => ({
                key: idx,
                color: HISTORY_COLORS[entry.action] || 'gray',
                content: (
                  <div>
                    <Typography.Text strong>
                      Level {entry.level} — {entry.action}
                    </Typography.Text>
                    {entry.approver && (
                      <div><Typography.Text type="secondary">{entry.approver.name}</Typography.Text></div>
                    )}
                    {entry.remarks && (
                      <div><Typography.Text>{entry.remarks}</Typography.Text></div>
                    )}
                    {entry.created_at && (
                      <div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(entry.created_at).format('MM-DD-YYYY HH:mm')}
                        </Typography.Text>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          )}
        </Modal>

        {/* ── Record Hires Modal — "FOR HR USE ONLY" step ───────────────── */}
        <Modal
          title="Record Hires"
          open={hireModalOpen}
          onCancel={closeHireModal}
          width={700}
          footer={[
            <Button key="cancel" onClick={closeHireModal}>
              Cancel
            </Button>,
            <Button key="confirm" type="primary" loading={hireSubmitting} onClick={handleHireConfirm}>
              Save
            </Button>,
          ]}
        >
          <Typography.Paragraph type="secondary">
            Select the employee hired or placed for each position, if known.
            Date Hired is read-only — it's the selected employee's actual
            hire/assign date on record, not something entered here.
          </Typography.Paragraph>
          {(() => {
            // Recomputed on every render from current hireRows — cheap
            // (a handful of position lines/slots) and keeps the red
            // highlight live as the user picks/changes employees, not
            // just on Save.
            const idCounts = {};
            hireRows.forEach((r) => {
              r.slots.forEach((s) => {
                if (s.hired_employee_id) {
                  idCounts[s.hired_employee_id] = (idCounts[s.hired_employee_id] || 0) + 1;
                }
              });
            });

            return hireRows.map((row) => (
              <Card key={row.detail_id} size="small" style={{ marginBottom: 12, background: '#fafafa' }}>
                <Typography.Text strong>{row.position_name}</Typography.Text>
                {row.type && <Typography.Text type="secondary"> ({row.type})</Typography.Text>}
                {row.slots.length > 1 && (
                  <Typography.Text type="secondary"> — {row.slots.length} hires needed</Typography.Text>
                )}
                {row.slots.map((slot, slotIndex) => {
                  const isDuplicate = slot.hired_employee_id && idCounts[slot.hired_employee_id] > 1;
                  return (
                    <div key={slotIndex}>
                      <Row style={{ marginTop: 8 }}>
                        <Col span={24}>
                          <Typography.Text type="secondary">
                            {row.slots.length > 1 ? `Hired Employee #${slotIndex + 1}` : 'Hired Employee'}
                          </Typography.Text>
                          <EmployeeSelect
                            activeOnly
                            placeholder="Search hired employee"
                            value={slot.hired_employee_id}
                            status={isDuplicate ? 'error' : undefined}
                            branchId={record.branch_id}
                            positionId={row.position_id}
                            hiredOnOrAfter={record.date_approved}
                            onChange={(val, option) => updateHireSlot(row.detail_id, slotIndex, {
                              hired_employee_id: val,
                              hired_employee_label: option?.label || null,
                              // preview_hire_date already applies the same
                              // branch-assignment-first priority the backend
                              // persists on save (see EmployeeSelect.jsx) —
                              // don't fall back to raw date_employed here,
                              // that's what caused this preview to disagree
                              // with the actual saved value.
                              date_hired: option?.preview_hire_date || null,
                            })}
                          />
                          {isDuplicate && (
                            <Typography.Text type="danger" style={{ fontSize: 12 }}>
                              This employee is already selected for another position.
                            </Typography.Text>
                          )}
                        </Col>
                      </Row>
                      <Row style={{ marginTop: 8 }}>
                        <Col span={24}>
                          {/* Not just "Date Hired" — resolveHireDate() prioritizes
                              the employee's Branch Assignment & Position history
                              (an internal transfer's assignment date) over
                              EmployeeMasterData.date_employed, falling back to the
                              latter only when no assignment history exists. */}
                          <Typography.Text type="secondary">Date Hired/Date Assigned</Typography.Text>
                          <div>
                            <Typography.Text strong>
                              {slot.date_hired ? dayjs(slot.date_hired).format('MM-DD-YYYY') : '—'}
                            </Typography.Text>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })}
              </Card>
            ));
          })()}
        </Modal>
      </Card>
    </>
  );
};

export default ViewManpowerRequest;
