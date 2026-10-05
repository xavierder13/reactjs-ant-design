import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button, Select, Tooltip, Typography, Flex } from 'antd';
import { DeleteOutlined, HolderOutlined, UndoOutlined } from '@ant-design/icons';

const { Text } = Typography;

const reorder = (list, from, to) => {
  const result = [...list];
  const [removed] = result.splice(from, 1);
  result.splice(to, 0, removed);
  return result;
};

// Report position columns: add positions from the picker, drag rows by the
// handle to set the column order (same drag-and-drop as the KPI template
// items), remove with the delete button. `value` is the ordered list of
// position names.
export default function PositionColumnsPicker({ value, onChange, positions, defaultPositions }) {
  const available = useMemo(
    () => positions.filter((name) => !value.includes(name)).map((name) => ({ label: name, value: name })),
    [positions, value],
  );

  const onDragEnd = ({ source, destination }) => {
    if (!destination || source.index === destination.index) return;
    onChange(reorder(value, source.index, destination.index));
  };

  return (
    <div>
      <Flex gap={8} style={{ marginBottom: 8 }}>
        <Select
          mode='multiple'
          style={{ flex: 1 }}
          placeholder='Add position columns'
          value={[]}
          options={available}
          onChange={(added) => onChange([...value, ...added])}
          showSearch
          filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
        />
        <Tooltip title='Reset to the default columns'>
          <Button icon={<UndoOutlined />} onClick={() => onChange(defaultPositions)}>Reset</Button>
        </Tooltip>
      </Flex>

      {value.length === 0 && <Text type='secondary'>No columns selected.</Text>}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId='branch-manpower-columns'>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ maxHeight: 320, overflowY: 'auto' }}>
              {value.map((name, index) => (
                <Draggable key={name} draggableId={name} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          8,
                        marginBottom: 4,
                        padding:      '4px 8px',
                        border:       '1px solid #f0f0f0',
                        borderRadius: 6,
                        background:   snapshot.isDragging ? '#f6ffed' : '#fff',
                        ...dragProvided.draggableProps.style,
                      }}
                    >
                      <span {...dragProvided.dragHandleProps} style={{ cursor: 'grab', color: '#bfbfbf', fontSize: 16 }}>
                        <HolderOutlined />
                      </span>
                      <span style={{ minWidth: 24, color: '#8c8c8c', fontSize: 12 }}>{index + 1}.</span>
                      <span style={{ flex: 1 }}>{name}</span>
                      <Tooltip title='Remove column'>
                        <Button
                          size='small'
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => onChange(value.filter((item) => item !== name))}
                        />
                      </Tooltip>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
