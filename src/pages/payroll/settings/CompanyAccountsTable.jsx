import { Table, Tag, Space, Tooltip, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { formatDate } from '../../../utils/formatDate';

// Payroll accounts (paid from) of one owner — the general ones (Payroll
// Settings → General) or one company's (Employers, expanded row). Edit /
// Delete when `canEdit`.
const CompanyAccountsTable = ({ accounts, canEdit, onEdit, onDelete, emptyText }) => (
  <Table
    rowKey='id'
    size='small'
    dataSource={accounts}
    pagination={false}
    scroll={{ x: 720 }}
    locale={{ emptyText }}
    columns={[
      { title: 'Bank', key: 'bank', render: (_, r) => r.bank?.name || '-' },
      { title: 'Account No.', dataIndex: 'account_no', width: 160 },
      { title: 'Account Name', dataIndex: 'account_name', width: 200 },
      {
        title: 'Used as default',
        key: 'default',
        width: 220,
        render: (_, r) => (
          <Space size={4} wrap>
            {r.is_default && <Tag color='green'>Default</Tag>}
            {r.default_from && <Tag color='blue'>{`${formatDate(r.default_from)} – ${r.default_to ? formatDate(r.default_to) : 'onward'}`}</Tag>}
            {!r.is_default && !r.default_from && '-'}
          </Space>
        ),
      },
      { title: 'Status', dataIndex: 'active', width: 90, render: (v) => (v ? <Tag color='green'>Active</Tag> : <Tag>Inactive</Tag>) },
      ...(canEdit ? [{
        title: 'Actions',
        key: 'actions',
        width: 90,
        render: (_, r) => (
          <Space>
            <Tooltip title='Edit'>
              <Button size='small' color='green' variant='outlined' icon={<EditOutlined />} onClick={() => onEdit(r)} />
            </Tooltip>
            <Popconfirm
              title='Delete this payroll account?'
              description='Approved payrolls keep the account they used. To stop using it, set it inactive instead.'
              okText='Delete'
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(r)}
            >
              <Tooltip title='Delete'>
                <Button size='small' danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      }] : []),
    ]}
  />
);

export default CompanyAccountsTable;
