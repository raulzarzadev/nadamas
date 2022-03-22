import { useState } from 'react'

function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState()
  const VISIBLE_FOR = 1000
  const [visible, setVisible] = useState(false)
  const copy = async (text) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }

    // Try to save to clipboard then save it in the state if worked
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setVisible(true)
      setTimeout(() => {
        setVisible(false)
      }, VISIBLE_FOR)
      return true
    } catch (error) {
      console.warn('Copy failed', error)
      setCopiedText(null)
      return false
    }
  }

  return [copiedText, copy, visible]
}

export default useCopyToClipboard
