import NextHead from 'next/head'

export function Head({ title, children }) {
  return (
    <NextHead>
      {title && <title>{title}</title>}
      {children}
    </NextHead>
  )
}
