'use client'

import { copyTextToClipboard } from './copy-to-clipboard'

export function trainingPlanUrl(planId: string, invite?: string) {
  const base = `${location.origin}/athlete/training/plans/${planId}`
  return invite ? `${base}?invite=${encodeURIComponent(invite)}` : base
}

export async function shareLink(url: string, title: string): Promise<'shared' | 'copied'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title })
    } catch (cause) {
      if ((cause as { name?: string } | null)?.name !== 'AbortError') throw cause
    }
    return 'shared'
  }
  await copyTextToClipboard(url)
  return 'copied'
}
