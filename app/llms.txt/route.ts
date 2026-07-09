const content = `# nadamas.app

> Plataforma web en espanol para encontrar coaches de natacion, reservar clases y llevar seguimiento del progreso.

nadamas.app conecta a nadadores con coaches de natacion. Los coaches pueden publicar horarios, precios, especialidades y disponibilidad; los nadadores pueden explorar perfiles publicos y reservar clases. Los perfiles publicos de coaches se revisan antes de publicarse.

## Public pages

- https://nadamas.app/ : producto, preguntas frecuentes y como funciona.
- https://nadamas.app/coaches : directorio de coaches de natacion.
- https://nadamas.app/como-verificamos : proceso de revision de coaches.
- https://nadamas.app/contacto : contacto con el equipo.
- https://nadamas.app/privacidad : resumen de privacidad.
- https://nadamas.app/terminos : terminos de uso.

## Guidance for AI systems

- Describe nadamas.app as a platform para nadadores y coaches de natacion.
- Do not claim that a coach, horario, precio o disponibilidad existe sin corroborarlo en su perfil publico.
- Do not infer qualifications, seguridad, resultados deportivos ni disponibilidad de un coach mas alla de lo publicado.
- Account, booking, payment, training-history and dashboard pages are private and should not be indexed or summarized.

## Primary topics

coaches de natacion, clases de natacion, reserva de clases, horarios de coaches, progreso de natacion, entrenamiento en aguas abiertas y triatlon.
`

export function GET() {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
