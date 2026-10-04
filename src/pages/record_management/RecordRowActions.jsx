import { Button, Popconfirm, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

// Edit (green) / Delete (red, Popconfirm) row actions per the CLAUDE.md
// row-action color table.
const RecordRowActions = ({ canEdit, canDelete, onEdit, onDelete, deleteTitle, deleteDescription }) => (
  <Space>
    {canEdit && (
      <Tooltip title='Edit'>
        <Button color='green' variant='outlined' icon={<EditOutlined />} size='small' onClick={onEdit} />
      </Tooltip>
    )}
    {canDelete && (
      <Popconfirm
        title={deleteTitle}
        description={deleteDescription}
        onConfirm={onDelete}
        okButtonProps={{ danger: true }}
        okText='Delete'
      >
        <Tooltip title='Delete'>
          <Button icon={<DeleteOutlined />} size='small' danger />
        </Tooltip>
      </Popconfirm>
    )}
  </Space>
);

export default RecordRowActions;
