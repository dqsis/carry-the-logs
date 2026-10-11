import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface ExerciseMax {
  exerciseId: string
  name: string
  maxWeightKg: number
  reps: number // reps of the heaviest set
  date: string // yyyy-mm-dd of the workout the heaviest set was first hit in
}

// Heaviest set per exercise, across every exercise that has at least one set
// logged, sorted by exercise name. Ties on weight go to the set with more reps,
// then to the earliest date (when the max was first achieved).
export function useExerciseStats() {
  const [maxes, setMaxes] = useState<ExerciseMax[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('sets')
      .select('exercise_id, reps, weight_kg, exercise:exercises(name), workout:workouts(workout_date)')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) throw error
        const byExercise = new Map<string, ExerciseMax>()
        for (const row of (data as unknown as {
          exercise_id: string
          reps: number
          weight_kg: number
          exercise: { name: string } | null
          workout: { workout_date: string } | null
        }[]) ?? []) {
          const name = row.exercise?.name
          const date = row.workout?.workout_date
          if (!name || !date) continue
          const current = byExercise.get(row.exercise_id)
          const isBetter =
            !current ||
            row.weight_kg > current.maxWeightKg ||
            (row.weight_kg === current.maxWeightKg &&
              (row.reps > current.reps || (row.reps === current.reps && date < current.date)))
          if (isBetter) {
            byExercise.set(row.exercise_id, {
              exerciseId: row.exercise_id,
              name,
              maxWeightKg: row.weight_kg,
              reps: row.reps,
              date,
            })
          }
        }
        setMaxes([...byExercise.values()].sort((a, b) => a.name.localeCompare(b.name)))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { maxes, loading }
}
