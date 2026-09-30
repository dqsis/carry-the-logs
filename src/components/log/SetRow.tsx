import { useState } from 'react'
import type { SetRow as SetRowData } from '../../lib/types'

export function SetRow({
  set,
  number,
  onUpdate,
  onDelete,
}: {
  set: SetRowData
  number: number
  onUpdate: (patch: { reps: number; weight_kg: number }) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [reps, setReps] = useState(set.reps)
  const [weightKg, setWeightKg] = useState(set.weight_kg)
  const [busy, setBusy] = useState(false)

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between border-b border-border py-2 text-left last:border-b-0"
      >
        <span className="text-sm text-mid">Set {number}</span>
        <span className="font-medium text-ink tabular-nums">
          {set.reps} reps × {set.weight_kg} kg
        </span>
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-mid">Set {number}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(Number(e.target.value))}
          className="w-14 rounded border border-border py-1 text-center"
        />
        <span className="text-xs text-mid">reps</span>
        <input
          type="number"
          inputMode="decimal"
          value={weightKg}
          onChange={(e) => setWeightKg(Number(e.target.value))}
          className="w-16 rounded border border-border py-1 text-center"
        />
        <span className="text-xs text-mid">kg</span>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onUpdate({ reps, weight_kg: weightKg })
            setBusy(false)
            setEditing(false)
          }}
          className="text-sm font-semibold text-olive"
        >
          Save
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onDelete()
          }}
          className="text-sm text-terracotta"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
