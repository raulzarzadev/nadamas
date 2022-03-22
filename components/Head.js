import NextHead from 'next/head'

export function Head({ title, children }) {
  return (
    <NextHead>
      {title && <title>{title}</title>}
      {children}
      <link rel="shortcut icon" href="/nadamas/logo-3.png" />
      <meta
        name="description"
        content="Una aplicación para entrenadores y administradores de actividades deportivas. Mantén la información importante de tus atletas centralizada y organizada. Saca el máximo provecho de tus atletas con estadísticas que te ayudan a planear un mejor entrenamiento personalizado."
      ></meta>
    </NextHead>
  )
}
