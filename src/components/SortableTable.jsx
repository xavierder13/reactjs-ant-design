import { createContext, useContext, useMemo } from 'react';
import { Table } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// An AntD Table whose rows reorder by dragging their handle (the first
// column, HolderOutlined — like the KPI template items), on
// @hello-pangea/dnd. `onReorder(rows, { from, to })` gets the rows in their
// new order; the caller saves it (and may refuse a move). `dragDisabled`
// (e.g. while a search hides rows) greys the handles. Not paginated: the
// whole list is one droppable.
const TableContext = createContext(null);
const HandleContext = createContext(null);

const DragHandle = () => {
  const handle = useContext(HandleContext);
  const { disabled } = useContext(TableContext);

  return (
    <span {...(handle || {})} style={{ cursor: disabled ? 'not-allowed' : 'grab', color: '#bfbfbf', fontSize: 16 }} aria-label='Drag to reorder'>
      <HolderOutlined />
    </span>
  );
};

const SortableBody = (props) => {
  const { droppableId, disabled } = useContext(TableContext);

  return (
    <Droppable droppableId={droppableId} isDropDisabled={disabled}>
      {(provided) => (
        <tbody ref={provided.innerRef} {...provided.droppableProps} {...props}>
          {props.children}
          {provided.placeholder}
        </tbody>
      )}
    </Droppable>
  );
};

const SortableRow = (props) => {
  const { indexOf, disabled } = useContext(TableContext);
  const key = props['data-row-key'];
  const index = indexOf.get(String(key));
  if (index === undefined) return <tr {...props} />; // the empty-table row

  return (
    <Draggable draggableId={String(key)} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <HandleContext.Provider value={provided.dragHandleProps}>
          <tr
            {...props}
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={{
              ...props.style,
              ...provided.draggableProps.style,
              ...(snapshot.isDragging ? { display: 'table', tableLayout: 'fixed', background: '#fff', boxShadow: '0 6px 16px rgba(0,0,0,0.12)' } : {}),
            }}
          />
        </HandleContext.Provider>
      )}
    </Draggable>
  );
};

const COMPONENTS = { body: { wrapper: SortableBody, row: SortableRow } };

const SortableTable = ({ dataSource, rowKey = 'id', columns, onReorder, dragDisabled = false, droppableId = 'sortable-rows', ...rest }) => {
  const indexOf = useMemo(() => new Map(dataSource.map((r, i) => [String(r[rowKey]), i])), [dataSource, rowKey]);
  const context = useMemo(() => ({ indexOf, disabled: dragDisabled, droppableId }), [indexOf, dragDisabled, droppableId]);

  const onDragEnd = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const rows = [...dataSource];
    const [moved] = rows.splice(source.index, 1);
    rows.splice(destination.index, 0, moved);
    onReorder(rows, { from: source.index, to: destination.index });
  };

  return (
    <TableContext.Provider value={context}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Table
          {...rest}
          rowKey={rowKey}
          dataSource={dataSource}
          components={COMPONENTS}
          tableLayout='fixed'
          pagination={false}
          columns={[{ key: '__drag', width: 44, align: 'center', render: () => <DragHandle /> }, ...columns]}
        />
      </DragDropContext>
    </TableContext.Provider>
  );
};

export default SortableTable;
