import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { SetRow } from '../lib/types'

export interface SetWithExercise extends SetRow {
  exercise: { name: string } | null
}

export interface ExerciseGroup {
  exerciseId: string
  exerciseName: string
  sets: SetWithExercise[]
}

// Preserves the order exercises were first added within the workout, so the
// screen doesn't reshuffle blocks around while you're mid-session.
function groupByExercise(sets: SetWithExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = []
  const index = new Map<string, ExerciseGroup>()
  for (const set of sets) {
    let group = index.get(set.exercise_id)
    if (!group) {
      group = { exerciseId: set.exercise_id, exerciseName: set.exercise?.name ?? '(deleted exercise)', sets: [] }
      index.set(set.exercise_id, group)
      groups.push(group)
    }
    group.sets.push(set)
  }
  return groups
}

export function useWorkoutSets(workoutId: string | null) {
  const [sets, setSets] = useState<SetWithExercise[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!workoutId) {
      setSets([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('sets')
      .select('*, exercise:exercises(name)')
      .eq('workout_id', workoutId)
      .order('created_at', { ascending: true })
    if (error) throw error
    setSets((data as unknown as SetWithExercise[]) ?? [])
    setLoading(false)
  }, [workoutId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // count > 1 logs several identical sets at once (e.g. "4x5" in one tap)
  // instead of requiring one round trip per set.
  const addSets = useCallback(
    async (exerciseId: string, reps: number, weightKg: number, count: number) => {
      if (!workoutId) throw new Error('No active workout')
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Not signed in')

      // max + 1 rather than count + 1, so deleting a set mid-list can't lead to
      // two sets sharing a number.
      const startingSetNumber =
        Math.max(0, ...sets.filter((s) => s.exercise_id === exerciseId).map((s) => s.set_number)) + 1
      const rows = Array.from({ length: count }, (_, i) => ({
        user_id: userId,
        workout_id: workoutId,
        exercise_id: exerciseId,
        set_number: startingSetNumber + i,
        reps,
        weight_kg: weightKg,
      }))
      const { error } = await supabase.from('sets').insert(rows)
      if (error) throw error
      await refresh()
    },
    [workoutId, sets, refresh],
  )

  const updateSet = useCallback(
    async (id: string, patch: Partial<Pick<SetRow, 'reps' | 'weight_kg'>>) => {
      const { error } = await supabase.from('sets').update(patch).eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const deleteSet = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('sets').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const deleteExerciseSets = useCallback(
    async (exerciseId: string) => {
      if (!workoutId) return
      const { error } = await supabase.from('sets').delete().eq('workout_id', workoutId).eq('exercise_id', exerciseId)
      if (error) throw error
      await refresh()
    },
    [workoutId, refresh],
  )

  return { sets, groups: groupByExercise(sets), loading, addSets, updateSet, deleteSet, deleteExerciseSets, refresh }
}

// Looks up the most recently logged set for an exercise (any workout), used to
// default reps/weight when that exercise is added to a new workout.
export async function fetchLastSetForExercise(exerciseId: string): Promise<SetRow | null> {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
