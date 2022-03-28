import NextLink from 'next/link'
export default function Link({ children, href, className, ...props }) {
  return (
    <NextLink href={href}>
      <a {...props} className={`${className}`}>
        {children}
      </a>
    </NextLink>
  )
}
