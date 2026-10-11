import { AppShell } from '../layout/AppShell'
import { useExerciseStats } from '../../hooks/useExerciseStats'

export function StatsScreen() {
  const { maxes, loading } = useExerciseStats()

  return (
    <AppShell title="Stats">
      {loading && <p className="text-mid">Loading…</p>}
      <div className="space-y-2">
        {maxes.map((max) => (
          <div key={max.exerciseId} className="rounded border border-border bg-bg px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-medium text-ink">{max.name}</span>
              <span className="shrink-0 font-medium text-ink">{max.maxWeightKg} kg</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm text-mid">
              <span>{max.date}</span>
              <span>× {max.reps} reps</span>
            </div>
          </div>
        ))}
        {!loading && maxes.length === 0 && <p className="text-mid">No sets logged yet.</p>}
      </div>
    </AppShell>
  )
}
