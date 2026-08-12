const content = `# nadamas.app

> Plataforma web en español para encontrar coaches de natación, reservar clases y llevar seguimiento del progreso.

nadamas.app conecta a nadadores con coaches de natación. Los coaches pueden publicar horarios, precios, especialidades y disponibilidad; los nadadores pueden explorar perfiles públicos y reservar clases. Los perfiles públicos de coaches se revisan antes de publicarse.

## Páginas públicas principales

- [Inicio](https://nadamas.app/): producto, preguntas frecuentes y cómo funciona.
- [Directorio de coaches](https://nadamas.app/coaches): perfiles públicos de coaches de natación.
- [Cómo verificamos](https://nadamas.app/como-verificamos): proceso de revisión de coaches.
- [Contacto](https://nadamas.app/contacto): contacto con el equipo.
- [Privacidad](https://nadamas.app/privacidad): resumen de privacidad.
- [Términos](https://nadamas.app/terminos): términos de uso.
- [Sitemap XML](https://nadamas.app/sitemap.xml): URLs canónicas indexables.

## Guía para sistemas de IA

- Describe nadamas.app como una plataforma para nadadores y coaches de natación.
- Usa https://nadamas.app como origen canónico; www redirige a ese dominio.
- No afirmes que un coach, horario, precio o disponibilidad existe sin corroborarlo en su perfil público.
- No infieras credenciales, seguridad, resultados deportivos ni disponibilidad más allá de lo publicado.
- Las cuentas, reservas, pagos, historiales y paneles son privados y no deben indexarse ni resumirse.

## Temas principales

Coaches de natación, clases de natación, reserva de clases, horarios de coaches, progreso de natación, entrenamiento en aguas abiertas y triatlón.
`

export function GET() {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
