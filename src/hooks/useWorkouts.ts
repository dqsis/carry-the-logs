import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabaseClient'
import type { Workout } from '../lib/types'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('workout_date', { ascending: false })
      .order('start_time', { ascending: false })
    if (error) throw error
    setWorkouts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Finds the current open (unfinished) workout if one exists, otherwise
  // creates one with the most recently used location pre-filled. "Open" means
  // ended_at is null -- there's a partial unique index enforcing at most one
  // per user, so if two calls race to create one (e.g. React StrictMode's
  // double-effect in dev), the loser's insert fails with a unique violation
  // and falls back to selecting the row the winner just created.
  const getOrCreateActiveWorkout = useCallback(async (): Promise<Workout> => {
    const { data: existing, error: findError } = await supabase
      .from('workouts')
      .select('*')
      .is('ended_at', null)
      .maybeSingle()
    if (findError) throw findError
    if (existing) return existing

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) throw new Error('Not signed in')

    const { data: mostRecent } = await supabase
      .from('workouts')
      .select('location')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Local date, not toISOString() (UTC) -- otherwise a workout started just
    // after midnight local time gets yesterday's date.
    const today = format(new Date(), 'yyyy-MM-dd')
    const nowTime = new Date().toTimeString().slice(0, 8)
    const { data: created, error: insertError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        workout_date: today,
        start_time: nowTime,
        location: mostRecent?.location ?? null,
      })
      .select()
      .single()

    if (!insertError && created) {
      await refresh()
      return created
    }

    if (insertError?.code === '23505') {
      const { data: winner, error: selectError } = await supabase
        .from('workouts')
        .select('*')
        .is('ended_at', null)
        .single()
      if (selectError) throw selectError
      return winner
    }

    throw insertError
  }, [refresh])

  const finishWorkout = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('workouts').update({ ended_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const updateWorkout = useCallback(
    async (id: string, patch: Partial<Pick<Workout, 'location' | 'notes' | 'start_time' | 'workout_date'>>) => {
      const { error } = await supabase.from('workouts').update(patch).eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  const deleteWorkout = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id)
      if (error) throw error
      await refresh()
    },
    [refresh],
  )

  return { workouts, loading, refresh, getOrCreateActiveWorkout, finishWorkout, updateWorkout, deleteWorkout }
}

export async function fetchWorkoutById(id: string): Promise<Workout | null> {
  const { data, error } = await supabase.from('workouts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
