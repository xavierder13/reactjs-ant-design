import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Table, Tag, Button, Space, Tooltip, Popconfirm, Avatar, Row, Col, Typography, App } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, UserOutlined } from '@ant-design/icons';
import compensationApi from '../../services/compensation/compensationApi';
import handleApiError from '../../utils/handleApiError';
import { DISPLAY_DATE_FORMAT, formatDate } from '../../utils/formatDate';
import { CHANGE_TYPE_COLORS, peso, rateLabel } from './compensationHelpers';
import CompensationFormModal from './CompensationFormModal';

// One employee's salary history, newest first: the version in force today
// is tagged Current, later ones Upcoming; each shows the change from the
// version before it (same pay basis). Add / edit / delete by permission.
const CompensationHistoryModal = ({ employeeId, options, canCreate, canEdit, canDelete, onClose, onChanged }) => {
  const { message } = App.useApp();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // {} = add

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: res } = await compensationApi.history(employeeId);
      setData(res);
    } catch (error) {
      handleApiError(error, message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!employeeId) return;
    const load = async () => {
      setData(null);
      await fetchHistory();
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const changed = () => { fetchHistory(); onChanged(); };

  const remove = async (record) => {
    try {
      const { data: res } = await compensationApi.delete(record.id);
      message.success(res.message);
      changed();
    } catch (error) {
      handleApiError(error, message);
    }
  };

  const versions = data?.versions || [];
  const today = dayjs().format('YYYY-MM-DD');
  const employee = data?.employee;
  const current = versions.find((v) => v.id === data?.current_id) || null;
  const employeeOption = employee ? { id: employee.id, label: `${employee.employee_code} - ${employee.name}` } : null;

  const columns = [
    {
      title: 'Effective Date',
      dataIndex: 'effective_date',
      width: 150,
      render: (v, r) => (
        <Space size={4}>
          {formatDate(v)}
          {r.id === data?.current_id && <Tag color='green'>Current</Tag>}
          {v > today && <Tag color='blue'>Upcoming</Tag>}
        </Space>
      ),
    },
    { title: 'Pay Basis', dataIndex: 'pay_basis', width: 90 },
    { title: 'Basic Rate', dataIndex: 'basic_rate', width: 130, align: 'right', render: peso },
    {
      title: 'Change',
      key: 'change',
      width: 150,
      align: 'right',
      render: (_, r, i) => {
        const before = versions[i + 1];
        if (!before) return <Typography.Text type='secondary'>first</Typography.Text>;
        if (before.pay_basis !== r.pay_basis) return <Typography.Text type='secondary'>{before.pay_basis} → {r.pay_basis}</Typography.Text>;
        const diff = Number(r.basic_rate) - Number(before.basic_rate);
        if (!diff) return <Typography.Text type='secondary'>no change</Typography.Text>;
        const pct = (diff / Number(before.basic_rate)) * 100;
        return (
          <Typography.Text type={diff > 0 ? 'success' : 'danger'}>
            {diff > 0 ? '+' : '−'}{peso(Math.abs(diff))} ({diff > 0 ? '+' : '−'}{Math.abs(pct).toFixed(1)}%)
          </Typography.Text>
        );
      },
    },
    { title: 'Change Type', dataIndex: 'change_type', width: 140, render: (v) => <Tag color={CHANGE_TYPE_COLORS[v]}>{v}</Tag> },
    { title: 'Reason', dataIndex: 'reason', render: (v) => v || '-' },
    {
      title: 'Saved By',
      key: 'saved_by',
      width: 170,
      render: (_, r) => (
        <div>
          <div>{(r.updater || r.creator)?.name || '-'}</div>
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>{dayjs(r.updated_at).format(`${DISPLAY_DATE_FORMAT} hh:mm A`)}</Typography.Text>
        </div>
      ),
    },
  ];
  if (canEdit || canDelete) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Space>
          {canEdit && (
            <Tooltip title='Edit'>
              <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => setEditing(r)} />
            </Tooltip>
          )}
          {canDelete && (
            <Popconfirm
              title='Delete this salary record?'
              description='Use it only for a wrong entry — a real change is a new salary.'
              okText='Delete'
              okButtonProps={{ danger: true }}
              onConfirm={() => remove(r)}
            >
              <Tooltip title='Delete'>
                <Button size='small' danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    });
  }

  return (
    <Modal
      open={!!employeeId}
      title='Salary History'
      // wide on desktop (Reason gets room); near full width below that
      width={{ xs: '100%', sm: '95%', md: '95%', lg: 1100, xl: 1250, xxl: 1400 }}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
    >
      {employee && (
        <div
          style={{
            background: '#f6ffed',
            border: '1px solid #d9f7be',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <Row gutter={[16, 12]} align='middle'>
            <Col xs={24} md={10}>
              <Space size={12} align='center'>
                <Avatar size={44} icon={<UserOutlined />} style={{ background: '#d9f7be', color: '#276221', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <Typography.Text strong style={{ fontSize: 15, color: '#1a4d0f', display: 'block' }}>
                    {employee.name}
                  </Typography.Text>
                  <Tag style={{ marginTop: 2 }}>{employee.employee_code}</Tag>
                </div>
              </Space>
            </Col>
            {[
              { label: 'Current Salary', value: current ? rateLabel(current.pay_basis, current.basic_rate) : 'No salary yet', strong: !!current },
              { label: 'Since', value: current ? formatDate(current.effective_date) : '-' },
              { label: 'Date Employed', value: formatDate(employee.date_employed) },
              { label: 'Versions', value: versions.length },
            ].map((item) => (
              <Col key={item.label} xs={12} sm={6} md={item.label === 'Current Salary' ? 5 : 3}>
                <Typography.Text type='secondary' style={{ fontSize: 11, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {item.label}
                </Typography.Text>
                <Typography.Text strong={item.strong} style={{ fontSize: 14 }}>{item.value}</Typography.Text>
              </Col>
            ))}
          </Row>
        </div>
      )}
      {canCreate && (
        <Button type='primary' icon={<PlusOutlined />} style={{ marginBottom: 12 }} disabled={!employee} onClick={() => setEditing({})}>
          Add Salary Change
        </Button>
      )}
      <Table
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={versions}
        loading={loading}
        pagination={false}
        scroll={{ x: 950 }}
        locale={{ emptyText: 'No salary saved yet' }}
      />
      <CompensationFormModal
        open={!!editing}
        employee={employeeOption}
        version={editing?.id ? editing : null}
        options={options}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); changed(); }}
      />
    </Modal>
  );
};

export default CompensationHistoryModal;
