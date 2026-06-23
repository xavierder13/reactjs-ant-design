import { Button, Input, Form, Tooltip } from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';

const KpiTemplateItemRow = ({
  item,
  index,
  dragHandleProps,
  isDragging,
  onUpdate,
  onRemove,
  errors,
}) => {
  return (
    <div
      style={{
        display:       'flex',
        alignItems:    'flex-start',
        gap:           8,
        marginBottom:  4,
        padding:       '4px 8px',
        background:    isDragging ? '#f6ffed' : 'transparent',
        borderRadius:  6,
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
          placeholder='KPI component name'
          value={item.component_name}
          size='small'
          onChange={(e) => onUpdate(item.id, 'component_name', e.target.value)}
        />
      </Form.Item>

      {/* Weight */}
      <Form.Item
        style={{ margin: 0, width: 100 }}
        validateStatus={errors?.weight ? 'error' : ''}
        help={errors?.weight}
      >
        <Input
          placeholder='0'
          value={item.weight}
          suffix='%'
          size='small'
          onChange={(e) => onUpdate(item.id, 'weight', e.target.value)}
        />
      </Form.Item>

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

export default KpiTemplateItemRow;