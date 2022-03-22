import NextLink from 'next/link'
export default function Link({
  href = '/',
  children,
  variant = 'plain',
  className = ''
}) {
  const style = {
    underline: 'text-xs  text-gray-600 dark:text-gray-400 hover:underline',
    bold: 'font-bold',
    footer: 'text-base leading-6 text-white hover:text-gray-700',
    plain: ''
  }

  return (
    <NextLink href={href}>
      <a className={` ${style[variant]} ${className}`}>{children}</a>
    </NextLink>
  )
}
