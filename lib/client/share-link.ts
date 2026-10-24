'use client'

import { copyTextToClipboard } from './copy-to-clipboard'

export function trainingPlanUrl(planId: string, invite?: string) {
  const base = `${location.origin}/athlete/training/plans/${planId}`
  return invite ? `${base}?invite=${encodeURIComponent(invite)}` : base
}

/** Invitation copy that travels with a shared plan link (chat apps show it above the preview). */
export function trainingPlanShareText(title: string, own: boolean) {
  return `¡Te invito a seguir ${own ? 'mi' : 'el'} entrenamiento «${title}» en nadamas! Únete aquí:`
}

export async function shareLink(
  url: string,
  title: string,
  text?: string
): Promise<'shared' | 'copied'> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(text ? { url, title, text } : { url, title })
    } catch (cause) {
      if ((cause as { name?: string } | null)?.name !== 'AbortError') throw cause
    }
    return 'shared'
  }
  await copyTextToClipboard(text ? `${text}\n${url}` : url)
  return 'copied'
}
