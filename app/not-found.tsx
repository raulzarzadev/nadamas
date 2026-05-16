import Link from '@comps/Link'

export default function NotFound() {
  return (
    <div className="py-16 text-center text-base-content">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="my-4">Página no encontrada</p>
      <Link href="/">Volver al inicio</Link>
    </div>
  )
}
