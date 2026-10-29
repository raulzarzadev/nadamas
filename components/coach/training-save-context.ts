'use client'

import { createContext, useContext } from 'react'

// Lets a nested editor (a day's session sheet) persist the planner's pending changes
// without threading a callback through every cycle component in between.
// Resolves true when saved (or nothing to save), false when it failed.
export const TrainingSaveContext = createContext<(() => Promise<boolean>) | null>(null)

export function useTrainingSave() {
  return useContext(TrainingSaveContext)
}
