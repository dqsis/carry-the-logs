import { useEffect, useState } from 'react'
import { fetchLastSetForExercise } from '../../hooks/useSets'
import type { ExerciseGroup } from '../../hooks/useSets'
import { SetEntryForm } from './SetEntryForm'
import { SetRow } from './SetRow'

const FALLBACK_REPS = 8
const FALLBACK_WEIGHT_KG = 20

export function ExerciseBlock({
  group,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onDeleteExercise,
}: {
  group: ExerciseGroup
  onAddSet: (reps: number, weightKg: number, setsCount: number) => Promise<void>
  onUpdateSet: (id: string, patch: { reps: number; weight_kg: number }) => Promise<void>
  onDeleteSet: (id: string) => Promise<void>
  onDeleteExercise: () => Promise<void>
}) {
  const [defaults, setDefaults] = useState<{ reps: number; weightKg: number } | null>(null)
  // A freshly added exercise opens in edit mode; one that already has sets
  // starts collapsed. Adding a set means "done with this exercise", so it
  // collapses again until Edit is tapped.
  const [editing, setEditing] = useState(group.sets.length === 0)
  const [deleting, setDeleting] = useState(false)

  async function handleAdd(reps: number, weightKg: number, setsCount: number) {
    await onAddSet(reps, weightKg, setsCount)
    setEditing(false)
  }

  async function handleDeleteExercise() {
    if (!confirm(`Remove ${group.exerciseName} and all its sets from this workout?`)) return
    setDeleting(true)
    try {
      await onDeleteExercise()
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (group.sets.length > 0) {
      const last = group.sets[group.sets.length - 1]
      setDefaults({ reps: last.reps, weightKg: last.weight_kg })
      return
    }
    let cancelled = false
    fetchLastSetForExercise(group.exerciseId).then((last) => {
      if (cancelled) return
      setDefaults(
        last ? { reps: last.reps, weightKg: last.weight_kg } : { reps: FALLBACK_REPS, weightKg: FALLBACK_WEIGHT_KG },
      )
    })
    return () => {
      cancelled = true
    }
    // Re-derive defaults only when the set count changes, not on every set edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.exerciseId, group.sets.length])

  return (
    <div className="mb-4 rounded border border-border bg-bg">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="font-semibold text-ink">{group.exerciseName}</span>
        <div className="flex shrink-0 gap-3 text-sm">
          {editing ? (
            group.sets.length > 0 && (
              <button onClick={() => setEditing(false)} className="font-semibold text-olive">
                Done
              </button>
            )
          ) : (
            <button onClick={() => setEditing(true)} className="text-mid underline">
              Edit
            </button>
          )}
          <button onClick={handleDeleteExercise} disabled={deleting} className="text-terracotta disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>
      <div className="px-3">
        {group.sets.map((set, i) =>
          editing ? (
            <SetRow
              key={set.id}
              set={set}
              number={i + 1}
              onUpdate={(patch) => onUpdateSet(set.id, patch)}
              onDelete={() => onDeleteSet(set.id)}
            />
          ) : (
            <div
              key={set.id}
              className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
            >
              <span className="text-sm text-mid">Set {i + 1}</span>
              <span className="font-medium text-ink tabular-nums">
                {set.reps} reps × {set.weight_kg} kg
              </span>
            </div>
          ),
        )}
      </div>
      {editing && (
        <div className="p-3">
          {defaults && (
            <SetEntryForm defaultReps={defaults.reps} defaultWeightKg={defaults.weightKg} onAdd={handleAdd} />
          )}
        </div>
      )}
    </div>
  )
}
