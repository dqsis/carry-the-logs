import { useEffect, useState } from 'react'
import { AppShell } from '../layout/AppShell'
import { useExercises } from '../../hooks/useExercises'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useWorkoutSets } from '../../hooks/useSets'
import type { ExerciseGroup } from '../../hooks/useSets'
import type { Exercise, Workout } from '../../lib/types'
import { ExerciseBlock } from './ExerciseBlock'
import { ExercisePicker } from './ExercisePicker'
import { WorkoutMetaBar } from './WorkoutMetaBar'

export function LogWorkoutScreen() {
  const { getOrCreateActiveWorkout, finishWorkout, updateWorkout, deleteWorkout } = useWorkouts()
  const { exercises, findOrCreateExercise } = useExercises()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Exercises added to this session that don't have a logged set yet — kept
  // client-side only until "Add Set" actually writes the first one.
  const [pendingExercises, setPendingExercises] = useState<Exercise[]>([])

  useEffect(() => {
    getOrCreateActiveWorkout().then(setWorkout)
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { groups, addSets, updateSet, deleteSet, deleteExerciseSets } = useWorkoutSets(workout?.id ?? null)

  if (!workout) {
    return (
      <AppShell title="Log Workout">
        <p className="text-mid">Loading…</p>
      </AppShell>
    )
  }

  async function handleDone() {
    if (!workout) return
    setFinishing(true)
    try {
      await finishWorkout(workout.id)
      setPendingExercises([])
      setWorkout(null)
      setWorkout(await getOrCreateActiveWorkout())
    } finally {
      setFinishing(false)
    }
  }

  async function handleDelete() {
    if (!workout) return
    if (!confirm('Delete this entire workout and all its sets?')) return
    setDeleting(true)
    try {
      await deleteWorkout(workout.id)
      setPendingExercises([])
      setWorkout(null)
      setWorkout(await getOrCreateActiveWorkout())
    } finally {
      setDeleting(false)
    }
  }

  const activeExerciseIds = new Set(groups.map((g) => g.exerciseId))
  const emptyGroups: ExerciseGroup[] = pendingExercises
    .filter((e) => !activeExerciseIds.has(e.id))
    .map((e) => ({ exerciseId: e.id, exerciseName: e.name, sets: [] }))
  const displayGroups = [...groups, ...emptyGroups]
  const excludeFromPickerIds = new Set([...activeExerciseIds, ...pendingExercises.map((e) => e.id)])

  return (
    <AppShell title="Log Workout">
      <WorkoutMetaBar
        workout={workout}
        onUpdate={async (patch) => {
          await updateWorkout(workout.id, patch)
          setWorkout({ ...workout, ...patch })
        }}
      />

      {displayGroups.map((group) => (
        <ExerciseBlock
          key={group.exerciseId}
          group={group}
          onAddSet={(reps, weightKg, setsCount) => addSets(group.exerciseId, reps, weightKg, setsCount)}
          onUpdateSet={updateSet}
          onDeleteSet={deleteSet}
          onDeleteExercise={async () => {
            await deleteExerciseSets(group.exerciseId)
            setPendingExercises((prev) => prev.filter((e) => e.id !== group.exerciseId))
          }}
        />
      ))}

      <button
        onClick={() => setPickerOpen(true)}
        className="w-full rounded border border-dashed border-border py-3 font-semibold text-terracotta"
      >
        + Add Exercise
      </button>

      <button
        onClick={handleDone}
        disabled={finishing}
        className="mt-3 w-full rounded bg-ink px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {finishing ? 'Finishing…' : 'Done — Start New Workout'}
      </button>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className="mt-6 w-full text-sm text-terracotta disabled:opacity-50"
      >
        Delete this workout
      </button>

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises.filter((e) => !excludeFromPickerIds.has(e.id))}
          onClose={() => setPickerOpen(false)}
          onCreateNew={async (name) => {
            const exercise = await findOrCreateExercise(name)
            return exercise
          }}
          onSelect={(exercise) => {
            setPickerOpen(false)
            setPendingExercises((prev) => [...prev, exercise])
          }}
        />
      )}
    </AppShell>
  )
}
