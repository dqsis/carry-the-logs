import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'
import { useExercises } from '../../hooks/useExercises'
import { useWorkoutSets } from '../../hooks/useSets'
import { fetchWorkoutById, useWorkouts } from '../../hooks/useWorkouts'
import type { ExerciseGroup } from '../../hooks/useSets'
import type { Exercise, Workout } from '../../lib/types'
import { ExerciseBlock } from '../log/ExerciseBlock'
import { ExercisePicker } from '../log/ExercisePicker'
import { WorkoutMetaBar } from '../log/WorkoutMetaBar'

export function WorkoutDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateWorkout, deleteWorkout } = useWorkouts()
  const { exercises, findOrCreateExercise } = useExercises()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Same as the Log screen: a newly picked exercise lives client-side until
  // its first set is added.
  const [pendingExercises, setPendingExercises] = useState<Exercise[]>([])

  useEffect(() => {
    if (id) fetchWorkoutById(id).then(setWorkout)
  }, [id])

  const { groups, addSets, updateSet, deleteSet, deleteExerciseSets } = useWorkoutSets(workout?.id ?? null)

  if (!workout) {
    return (
      <AppShell title="Workout">
        <p className="text-mid">Loading…</p>
      </AppShell>
    )
  }

  const activeExerciseIds = new Set(groups.map((g) => g.exerciseId))
  const emptyGroups: ExerciseGroup[] = pendingExercises
    .filter((e) => !activeExerciseIds.has(e.id))
    .map((e) => ({ exerciseId: e.id, exerciseName: e.name, sets: [] }))
  const displayGroups = [...groups, ...emptyGroups]
  const excludeFromPickerIds = new Set([...activeExerciseIds, ...pendingExercises.map((e) => e.id)])

  return (
    <AppShell title="Workout">
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
        onClick={async () => {
          if (!confirm('Delete this entire workout and all its sets?')) return
          await deleteWorkout(workout.id)
          navigate('/history')
        }}
        className="mt-6 w-full text-sm text-terracotta"
      >
        Delete workout
      </button>

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises.filter((e) => !excludeFromPickerIds.has(e.id))}
          onClose={() => setPickerOpen(false)}
          onCreateNew={(name) => findOrCreateExercise(name)}
          onSelect={(exercise) => {
            setPickerOpen(false)
            setPendingExercises((prev) => [...prev, exercise])
          }}
        />
      )}
    </AppShell>
  )
}
