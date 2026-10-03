'use client'

import { useEffect, useRef } from 'react'

export default function WidgetFrameResizer({
  children,
  dark = false,
}: {
  children: React.ReactNode
  dark?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const postHeight = () => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      window.parent?.postMessage({ type: 'nadamas:widget:resize', height }, '*')
    }

    postHeight()
    const observer = new ResizeObserver(postHeight)
    observer.observe(node)
    window.addEventListener('load', postHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('load', postHeight)
    }
  }, [])

  return <div ref={ref} className={dark ? 'widget-frame-dark' : undefined}>{children}</div>
}
