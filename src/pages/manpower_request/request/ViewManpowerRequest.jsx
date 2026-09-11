import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Tag, Divider, Button, Space,
  Popconfirm, Spin, Result, Breadcrumb, Modal, Input, Timeline, message,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, SendOutlined, CloseCircleOutlined,
  CheckCircleOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import useAuth from '../../../hooks/useAuth';
import useManpowerRequestStore from '../../../store/manpowerRequestStore';
import manpowerRequestApi from '../../../services/manpower_request/manpowerRequestApi';
import handleApiError from '../../../utils/handleApiError';

const STATUS_COLORS = {
  Draft:              'default',
  // 'Submitted' is confirmed dead — submit() moves Draft straight to
  // 'Pending Approval' — kept only so an unexpected value doesn't look broken.
  Submitted:          'blue',
  'Pending Approval':  'gold',
  Approved:           'green',
  Rejected:           'red',
  Returned:           'orange',
  Cancelled:          'default',
};

const HISTORY_COLORS = {
  Approved: 'green',
  Rejected: 'red',
  Returned: 'orange',
  Pending:  'gray',
};

// Display-only relabeling — the underlying status/action VALUE returned by
// the backend and used in all comparisons below stays 'Rejected'; only the
// text shown to users is changed to "Disapproved".
const STATUS_LABELS = {
  Rejected: 'Disapproved',
};
const displayStatus = (status) => STATUS_LABELS[status] || status;

const ViewManpowerRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission, user } = useAuth();
  const fetchById = useManpowerRequestStore((state) => state.fetchById);
  const [messageApi, contextHolder] = message.useMessage();

  const [record, setRecord]                 = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);

  // Shared modal for Disapprove / Return for Revision — both just collect
  // required remarks and call a different endpoint.
  const [remarksModalMode, setRemarksModalMode] = useState(null); // 'reject' | 'return' | null
  const [remarksText, setRemarksText]           = useState('');
  const [remarksSubmitting, setRemarksSubmitting] = useState(false);

  const [historyOpen, setHistoryOpen]       = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);

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

  const canEdit =
    hasAnyPermission('manpower-request-create', 'manpower-request-edit') &&
    ['Draft', 'Returned'].includes(record.status) &&
    record.user_id === user.id;

  // Submit and Resubmit are the same backend action/permission — only the
  // label differs. Backend currently only allows this from Draft/Returned;
  // Rejected is NOT resubmittable server-side yet (pending product decision).
  const canSubmit =
    hasPermission('manpower-request-submit') &&
    ['Draft', 'Returned'].includes(record.status) &&
    record.user_id === user.id;

  const canCancel =
    hasPermission('manpower-request-cancel') &&
    ['Draft', 'Pending Approval', 'Returned'].includes(record.status) &&
    record.user_id === user.id;

  const canApprove =
    hasPermission('manpower-request-approve') &&
    record.status === 'Pending Approval' &&
    canActOnApproval;

  const canReject =
    hasPermission('manpower-request-reject') &&
    record.status === 'Pending Approval' &&
    canActOnApproval;

  const canReturn =
    hasPermission('manpower-request-return') &&
    record.status === 'Pending Approval' &&
    canActOnApproval;

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
                {displayStatus(record.status)}
              </Tag>
            </Col>
          </Row>
        }
        extra={
          <Button icon={<FileTextOutlined />} onClick={openHistory}>
            Approval History
          </Button>
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

        {['Rejected', 'Returned'].includes(record.status) && record.remarks && (
          <div style={{
            background: record.status === 'Rejected' ? '#fff2f0' : '#fff7e6',
            border: `1px solid ${record.status === 'Rejected' ? '#ffccc7' : '#ffd591'}`,
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 16,
          }}>
            <Typography.Text type={record.status === 'Rejected' ? 'danger' : 'warning'} strong>
              {record.status === 'Rejected' ? 'Disapproval Reason: ' : 'Return Remarks: '}
            </Typography.Text>
            <Typography.Text type={record.status === 'Rejected' ? 'danger' : 'warning'}>
              {record.remarks}
            </Typography.Text>
          </div>
        )}

        <Divider style={{ borderColor: '#b7eb8f' }} />

        {/* ── Position Requirements ─────────────────────────────────────── */}
        <Typography.Title level={5}>Position Requirements</Typography.Title>

        {(record.details || []).map((d) => (
          <Card key={d.id} size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Position</Typography.Text>
                <div><Typography.Text strong>{d.position?.name || '—'}</Typography.Text></div>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Employment Type</Typography.Text>
                <div><Typography.Text strong>{d.employment_type || '—'}</Typography.Text></div>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text type="secondary">Quantity</Typography.Text>
                <div><Typography.Text strong>{d.quantity ?? '—'}</Typography.Text></div>
              </Col>
            </Row>

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
          </Card>
        ))}

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
                  title={`${record.status === 'Returned' ? 'Resubmit' : 'Submit'} this request for approval?`}
                  onConfirm={handleSubmit}
                >
                  <Button type="primary" icon={<SendOutlined />} loading={actionLoading}>
                    {record.status === 'Returned' ? 'Resubmit' : 'Submit'}
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
                children: (
                  <div>
                    <Typography.Text strong>
                      Level {entry.level} — {displayStatus(entry.action)}
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
      </Card>
    </>
  );
};

export default ViewManpowerRequest;
