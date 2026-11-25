// src/hooks/useTableColumns.jsx
//
// Which columns a table shows, and in what order, chosen by the user and
// kept in this browser (store/tableLayoutStore → localStorage, per user and
// table) so a refresh keeps them. Reference: sap-b1-web's useTableColumns.
//   const { columns: shownColumns, chooser } = useTableColumns('table:roles', columns)
//   … {chooser} in the toolbar, <Table columns={shownColumns} />
// Two ways to change it: drag a column header onto another one, or the
// "Columns" button (ColumnChooser: tick to show / hide, drag ⠿ or ↑ ↓ to
// reorder, Show all, Reset to default).
//
// A column's id is its `key`, else its `dataIndex`, else its plain-text
// `title` — give a column without any of them a `key`. The default: every
// column in its defined order but those marked `defaultHidden: true`.
// `hideable: false` and the actions column (key or title `actions` /
// `Actions` / `Action`) always show. Pinned columns —
// `fixed: 'left'` ones and the actions / `fixed: 'right'` ones — stay at
// their edge (AntD needs them there); the rest can be reordered. A column
// with AntD's own `hidden: true` (e.g. by permission) is left as it is and
// not listed. `chooserTitle` names a column whose `title` isn't plain text.
// A column added later shows, after its neighbour in the defined order,
// until the user hides or moves it. Only top-level columns move (a group
// moves with its children). `{ maxShown }` caps how many hideable columns
// can be ticked (e.g. a list whose shown columns are sent to the API —
// the employee lists read `columns` back for their `table_headers`).

import { useState } from 'react'
import { theme } from 'antd'
import ColumnChooser from '../components/ColumnChooser'
import useAuthStore from '../store/authStore'
import useTableLayoutStore, { readTableLayout, tableLayoutKey } from '../store/tableLayoutStore'

const columnId = (column, index) => {
  if (column.key !== undefined && column.key !== null) return String(column.key)
  if (Array.isArray(column.dataIndex) && column.dataIndex.length) return column.dataIndex.join('.')
  if (column.dataIndex !== undefined && column.dataIndex !== null && column.dataIndex !== '') return String(column.dataIndex)
  if (typeof column.title === 'string' && column.title) return `title:${column.title}`
  return `#${index}`
}
// the row-actions column, by key or by title (most pages key it by its title only)
const ACTION_IDS = ['actions', 'action', 'title:Actions', 'title:Action']
const isActions = (column) => ACTION_IDS.includes(column.__id)
const isHideable = (column) => column.hideable !== false && !isActions(column)
const pinnedLeft = (column) => column.fixed === 'left' || column.fixed === true
const pinnedRight = (column) => column.fixed === 'right' || isActions(column)

// the movable columns in the saved order; new ones after their defined neighbour
const ordered = (movable, order) => {
  if (!Array.isArray(order) || !order.length) return movable
  const byId = new Map(movable.map((c) => [c.__id, c]))
  const result = order.filter((id) => byId.has(id)).map((id) => byId.get(id))
  movable.forEach((c, i) => {
    if (result.includes(c)) return
    const before = i > 0 ? result.indexOf(movable[i - 1]) : -1
    result.splice(before + 1, 0, c)
  })
  return result
}

const titleText = (column) => {
  if (column.chooserTitle) return column.chooserTitle
  if (typeof column.title === 'string' && column.title) return column.title
  if (typeof column.title === 'number') return String(column.title)
  return column.__id.startsWith('#') ? `Column ${Number(column.__id.slice(1)) + 1}` : column.__id
}

// the columns as AntD gets them: without our own props
const strip = (column) => {
  const { __id, hideable, defaultHidden, chooserTitle, ...rest } = column
  void __id; void hideable; void defaultHidden; void chooserTitle
  return rest
}

const useTableColumns = (tableKey, columns, { maxShown } = {}) => {
  const { token } = theme.useToken()
  const userId = useAuthStore((state) => state.user?.id)
  const storageKey = tableLayoutKey(userId, tableKey)
  useTableLayoutStore((state) => state.version) // re-render when a layout changes
  const setLayout = useTableLayoutStore((state) => state.setLayout)
  const resetLayout = useTableLayoutStore((state) => state.resetLayout)
  const saved = readTableLayout(storageKey)

  const [dragging, setDragging] = useState(null) // header id being dragged
  const [over, setOver] = useState(null)         // header id hovered while dragging

  const withIds = columns.filter(Boolean).map((c, i) => ({ ...c, __id: columnId(c, i) }))
  const managed = withIds.filter((c) => !c.hidden)

  const left = managed.filter(pinnedLeft)
  const right = managed.filter((c) => !pinnedLeft(c) && pinnedRight(c))
  const movable = ordered(managed.filter((c) => !pinnedLeft(c) && !pinnedRight(c)), saved?.order)
  const all = [...left, ...movable, ...right]
  const movableIds = movable.map((c) => c.__id)

  const defaultHidden = managed.filter((c) => c.defaultHidden && isHideable(c)).map((c) => c.__id)
  const hidden = Array.isArray(saved?.hidden) ? saved.hidden : defaultHidden

  const save = (changes) => setLayout(storageKey, { hidden, order: movableIds, ...changes })

  // `id` to the place of `target` among the movable columns
  const moveTo = (id, target) => {
    if (id === target || !movableIds.includes(id) || !movableIds.includes(target)) return
    const order = movableIds.filter((m) => m !== id)
    const at = order.indexOf(target)
    order.splice(movableIds.indexOf(id) < movableIds.indexOf(target) ? at + 1 : at, 0, id)
    save({ order })
  }

  const endDrag = () => { setDragging(null); setOver(null) }

  // a movable header can be dragged onto another movable header
  const withHeaderDrag = (column) => {
    if (!movableIds.includes(column.__id)) return column
    const id = column.__id
    const own = column.onHeaderCell
    return {
      ...column,
      onHeaderCell: (col) => {
        const props = own ? own(col) || {} : {}
        const isOver = over === id && dragging && dragging !== id
        const fromLeft = isOver && movableIds.indexOf(dragging) < movableIds.indexOf(id)
        return {
          ...props,
          draggable: true,
          onDragStart: (e) => {
            props.onDragStart?.(e)
            setDragging(id)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', id)
          },
          onDragOver: (e) => {
            props.onDragOver?.(e)
            if (!dragging) return // not one of this table's headers
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (over !== id) setOver(id)
          },
          onDragLeave: (e) => {
            props.onDragLeave?.(e)
            if (!e.currentTarget.contains(e.relatedTarget)) setOver((o) => (o === id ? null : o))
          },
          onDrop: (e) => {
            props.onDrop?.(e)
            if (!dragging) return
            e.preventDefault()
            moveTo(dragging, id)
            endDrag()
          },
          onDragEnd: (e) => { props.onDragEnd?.(e); endDrag() },
          style: {
            ...props.style,
            cursor: column.sorter ? props.style?.cursor : 'grab', // a sortable header keeps its pointer
            opacity: dragging === id ? 0.5 : props.style?.opacity,
            boxShadow: isOver ? `inset ${fromLeft ? -3 : 3}px 0 0 ${token.colorPrimary}` : props.style?.boxShadow,
          },
        }
      },
    }
  }

  const shown = [
    ...all.filter((c) => !isHideable(c) || !hidden.includes(c.__id)).map(withHeaderDrag),
    ...withIds.filter((c) => c.hidden),
  ].map(strip)

  const chooser = (
    <ColumnChooser
      items={all.map((c) => ({
        id: c.__id,
        title: titleText(c),
        hideable: isHideable(c),
        movable: movableIds.includes(c.__id),
      }))}
      hidden={hidden}
      maxShown={maxShown}
      isDefault={!saved}
      onHiddenChange={(next) => save({ hidden: next })}
      onMove={moveTo}
      onReset={() => resetLayout(storageKey)}
    />
  )

  return { columns: shown, chooser }
}

export default useTableColumns
