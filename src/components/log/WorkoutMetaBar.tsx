import { useState } from 'react'
import type { Workout } from '../../lib/types'

export function WorkoutMetaBar({
  workout,
  onUpdate,
}: {
  workout: Workout
  onUpdate: (patch: Partial<Pick<Workout, 'location' | 'notes' | 'start_time' | 'workout_date'>>) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [date, setDate] = useState(workout.workout_date)
  const [location, setLocation] = useState(workout.location ?? '')
  const [notes, setNotes] = useState(workout.notes ?? '')

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mb-4 flex w-full items-center justify-between rounded border border-border bg-bg px-3 py-2 text-left"
      >
        <span className="text-sm text-ink">
          {workout.workout_date}
          {workout.location ? ` · ${workout.location}` : ''}
        </span>
        <span className="text-xs text-mid underline">edit</span>
      </button>
    )
  }

  return (
    <div className="mb-4 space-y-2 rounded border border-border bg-bg p-3">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded border border-border px-2 py-1.5 text-sm"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        className="w-full rounded border border-border px-2 py-1.5 text-sm"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full rounded border border-border px-2 py-1.5 text-sm"
        rows={2}
      />
      <div className="flex justify-end gap-3">
        <button onClick={() => setExpanded(false)} className="text-sm text-mid">
          Cancel
        </button>
        <button
          onClick={async () => {
            await onUpdate({ workout_date: date || workout.workout_date, location, notes })
            setExpanded(false)
          }}
          className="text-sm font-semibold text-olive"
        >
          Save
        </button>
      </div>
    </div>
  )
}
