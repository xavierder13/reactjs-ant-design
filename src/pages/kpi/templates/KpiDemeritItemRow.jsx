import { Button, Input, Form, Tooltip, Space } from 'antd';
import { DeleteOutlined, HolderOutlined, InfoCircleOutlined } from '@ant-design/icons';
import useAuth from '../../../hooks/useAuth';

const KpiDemeritItemRow = ({
  item,
  index,
  dragHandleProps,
  isDragging,
  onUpdate,
  onRemove,
  errors,
}) => {
  const { hasRole } = useAuth();

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          8,
        marginBottom: 4,
        padding:      '4px 8px',
        background:   isDragging ? '#fff7e6' : 'transparent',
        borderRadius: 6,
      }}
    >
      {/* Drag handle */}
      <span
        {...dragHandleProps}
        style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 16, paddingTop: 6 }}
      >
        <HolderOutlined />
      </span>

      {/* Order number */}
      <span style={{ paddingTop: 6, minWidth: 20, color: '#8c8c8c', fontSize: 12 }}>
        {index + 1}.
      </span>

      {/* Component Code */}
      <Form.Item
        style={{ margin: 0, width: 80 }}
        validateStatus={errors?.component_code ? 'error' : ''}
        help={errors?.component_code}
      >
        <Input
          placeholder='Code'
          value={item.component_code}
          size='small'
          onChange={(e) => onUpdate(item.id, 'component_code', e.target.value.toUpperCase())}
        />
      </Form.Item>

      {/* Component Name */}
      <Form.Item
        style={{ margin: 0, flex: 1 }}
        validateStatus={errors?.component_name ? 'error' : ''}
        help={errors?.component_name}
      >
        <Input
          placeholder='Demerit component name'
          value={item.component_name}
          size='small'
          onChange={(e) => onUpdate(item.id, 'component_name', e.target.value)}
        />
      </Form.Item>

      {/* Max Deduction */}
      <Form.Item
        style={{ margin: 0, width: 120 }}
        validateStatus={errors?.max_deduction ? 'error' : ''}
        help={errors?.max_deduction}
      >
        <Input
          placeholder='0'
          value={item.max_deduction}
          suffix='% max'
          size='small'
          onChange={(e) => onUpdate(item.id, 'max_deduction', e.target.value)}
        />
      </Form.Item>

      {/* Computation Class — Admin only */}
      {hasRole('Administrator') && (
        <Form.Item style={{ margin: 0, width: 220 }}>
          <Space>
            <Input
              placeholder='e.g. AccountAnalyst/DemeritService'
              value={item.computation_class || ''}
              size='small'
              onChange={(e) => onUpdate(item.id, 'computation_class', e.target.value)}
              style={{ width: 200 }}
            />
            <Tooltip
              title={
                <div>
                  <div>Format: <strong>Position/ServiceName</strong></div>
                  <div style={{ marginTop: 4 }}>Example: AccountAnalyst/DemeritService</div>
                  <div style={{ marginTop: 4 }}>Leave empty for manual entry.</div>
                </div>
              }
              placement='top'
            >
              <InfoCircleOutlined style={{ color: '#fa8c16', cursor: 'pointer' }} />
            </Tooltip>
          </Space>
        </Form.Item>
      )}

      {/* Remove button */}
      <Tooltip title='Remove item'>
        <Button
          danger
          type='text'
          size='small'
          icon={<DeleteOutlined />}
          onClick={() => onRemove(item.id)}
          style={{ marginTop: 2 }}
        />
      </Tooltip>
    </div>
  );
};

export default KpiDemeritItemRow;