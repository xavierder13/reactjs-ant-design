// src/components/ColumnChooser.jsx
//
// "Columns" button for a table (reference: sap-b1-web's ColumnChooser):
// every column listed in table order — tick to show (at least one stays;
// always-shown ones greyed), drag the handle (or ↑ ↓, for touch screens) to
// reorder; pinned columns (lock) keep their edge. Show all, Reset to
// default. The table's headers can be dragged too (hooks/useTableColumns).
// Drag and drop is the browser's own (no extra package).

import { useRef, useState } from 'react'
import { Button, Checkbox, Divider, Popover, Space, Tooltip, Typography, theme } from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined, HolderOutlined, LockOutlined, SettingOutlined } from '@ant-design/icons'

const { Text } = Typography

const ColumnChooser = ({ items, hidden, maxShown, isDefault, onHiddenChange, onMove, onReset }) => {
  const { token } = theme.useToken()
  const [dragging, setDragging] = useState(null) // id being dragged
  const [over, setOver] = useState(null)         // id hovered while dragging
  const buttonRef = useRef(null)
  const [fit, setFit] = useState({ placement: 'bottomRight', list: 380 })

  const hideable = items.filter((i) => i.hideable)
  const visibleCount = hideable.filter((i) => !hidden.includes(i.id)).length
  const movableIds = items.filter((i) => i.movable).map((i) => i.id)

  const full = maxShown !== undefined && visibleCount >= maxShown

  const toggle = (id, show) => {
    if (!show && visibleCount <= 1) return // keep one column
    if (show && full) return
    onHiddenChange(show ? hidden.filter((h) => h !== id) : [...hidden, id])
  }

  const step = (id, delta) => {
    const target = movableIds[movableIds.indexOf(id) + delta]
    if (target) onMove(id, target)
  }

  const content = (
    <div style={{ minWidth: 260 }}>
      <div style={{ maxHeight: fit.list, overflowY: 'auto' }}>
        {items.map((item) => {
          const checked = !item.hideable || !hidden.includes(item.id)
          const i = movableIds.indexOf(item.id)
          const isOver = over === item.id && dragging !== item.id
          return (
            <div
              key={item.id}
              draggable={item.movable}
              onDragStart={(e) => { setDragging(item.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.id) }}
              onDragOver={(e) => { if (dragging && item.movable) { e.preventDefault(); setOver(item.id) } }}
              onDragLeave={() => setOver((o) => (o === item.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragging && item.movable) onMove(dragging, item.id); setDragging(null); setOver(null) }}
              onDragEnd={() => { setDragging(null); setOver(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '3px 4px', borderRadius: 4,
                opacity: dragging === item.id ? 0.4 : 1,
                background: isOver ? token.colorPrimaryBg : undefined,
                borderTop: `2px solid ${isOver ? token.colorPrimary : 'transparent'}`,
              }}
            >
              {item.movable
                ? <HolderOutlined style={{ cursor: 'grab', color: token.colorTextTertiary }} title='Drag to reorder' />
                : <Tooltip title="Pinned to the table's edge"><LockOutlined style={{ color: token.colorTextQuaternary }} /></Tooltip>}
              <Checkbox
                checked={checked}
                disabled={!item.hideable || (checked && visibleCount <= 1) || (!checked && full)}
                onChange={(e) => toggle(item.id, e.target.checked)}
                style={{ flex: 1 }}
              >
                {item.title}
              </Checkbox>
              {item.movable && (
                <span style={{ whiteSpace: 'nowrap' }}>
                  <Button type='text' size='small' icon={<ArrowUpOutlined />} disabled={i <= 0} onClick={() => step(item.id, -1)} aria-label={`Move ${item.title} up`} />
                  <Button type='text' size='small' icon={<ArrowDownOutlined />} disabled={i >= movableIds.length - 1} onClick={() => step(item.id, 1)} aria-label={`Move ${item.title} down`} />
                </span>
              )}
            </div>
          )
        })}
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <Space>
        {maxShown === undefined && (
          <Button size='small' disabled={!hidden.length} onClick={() => onHiddenChange([])}>Show all</Button>
        )}
        <Button size='small' disabled={isDefault} onClick={onReset}>Reset to default</Button>
      </Space>
      <div style={{ marginTop: 6, maxWidth: 300 }}>
        {maxShown !== undefined && (
          <div><Text type='secondary' style={{ fontSize: 12 }}>{visibleCount} of {maxShown} columns shown{full ? ' (the most)' : ''}.</Text></div>
        )}
        <Text type='secondary' style={{ fontSize: 12 }}>
          Drag a column header, or ⠿ / ↑ ↓ here, to reorder. Saved in this browser.
        </Text>
      </div>
    </div>
  )

  // a button low on the screen opens the panel above it, and the list takes only the room there (it scrolls)
  const measure = (open) => {
    if (!open || !buttonRef.current) return
    const box = buttonRef.current.getBoundingClientRect()
    const below = window.innerHeight - box.bottom - 16
    const above = box.top - 16
    const down = below >= 400 || below >= above
    // the room minus the panel's title, buttons, hint and a margin (~160 px)
    setFit({ placement: down ? 'bottomRight' : 'topRight', list: Math.max(80, Math.min(380, (down ? below : above) - 160)) })
  }

  const hiddenCount = hideable.filter((i) => hidden.includes(i.id)).length
  return (
    // inside a modal the panel opens within it (a modal keeps focus to itself); on a page, over the page
    <Popover
      trigger='click'
      placement={fit.placement}
      autoAdjustOverflow={false}
      title='Columns'
      content={content}
      onOpenChange={measure}
      getPopupContainer={(trigger) => trigger?.closest('.ant-modal-container, .ant-modal-content, .ant-drawer-content') || document.body}
    >
      <Button ref={buttonRef} icon={<SettingOutlined />}>
        Columns{hiddenCount ? ` (${visibleCount}/${hideable.length})` : ''}
      </Button>
    </Popover>
  )
}

export default ColumnChooser
