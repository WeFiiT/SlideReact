import { useState } from 'react'

// Shows the first `limit` options; selected items beyond limit always stay visible.
// Clicking "···" expands all; "↑" collapses back.
export default function CollapsibleChips({
  options,
  selected,
  onToggle,
  activeColor = '#0E2A6B',
  limit = 10,
}) {
  const [expanded, setExpanded] = useState(false)

  const before        = options.slice(0, limit)
  const after         = options.slice(limit)
  const selectedAfter = after.filter(o => selected.includes(o))
  const visible       = expanded ? options : [...before, ...selectedAfter]
  const hasHidden     = !expanded && after.length > selectedAfter.length

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {visible.map(o => {
        const active = selected.includes(o)
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            style={{
              background: active ? activeColor : '#f1f5f9',
              color:      active ? '#fff'       : '#475569',
              border:     `2px solid ${active ? activeColor : 'transparent'}`,
              borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {o}
          </button>
        )
      })}
      {(hasHidden || expanded) && (
        <button type="button" onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', color: '#94a3b8',
            border: '1.5px dashed #cbd5e1', borderRadius: 20,
            padding: '4px 10px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {expanded ? '↑' : '···'}
        </button>
      )}
    </div>
  )
}
