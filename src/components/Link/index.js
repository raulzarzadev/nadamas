import NextLink from 'next/link'
export default function Link({ href = '/', children, variant }) {
  const textOptions = {
    bold: 'font-bold'
  }

  return (
    <NextLink href={href}>
      <a
        className={`text-xs  text-gray-600 dark:text-gray-400 hover:underline ${textOptions[variant]}`}
      >
        {children}
      </a>
    </NextLink>
  )
}
