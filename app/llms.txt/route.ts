import { FAQ_ITEMS } from '@comps/marketing/faq'
import { FEATURES } from '@comps/marketing/features'
import { SUMMARY_TEXT } from '@comps/marketing/summary'
import { resources } from '@/lib/marketing/resources'
import { NADAMAS_PRICING } from '@/lib/pricing'

const features = FEATURES.map(({ title, body }) => `- ${title}: ${body}`).join('\n')
const faq = FAQ_ITEMS.map(({ q, a }) => `### ${q}\n\n${a}`).join('\n\n')
const guides = resources
  .map((resource) => `- [${resource.title}](https://nadamas.app/recursos/${resource.slug})`)
  .join('\n')

const content = `# nadamas.app

> ${SUMMARY_TEXT}

## Datos clave

- Producto: app web (PWA) para organizar clases de natación. Funciona en celular y computadora sin descargar nada.
- Usuarios: atletas (y sus familias), entrenadores de natación independientes y coordinadores de escuelas o clubes.
- Precio: $${NADAMAS_PRICING.regularMonthly} ${NADAMAS_PRICING.currency} al mes por escuela, incluyendo todos sus profesores. Una prueba de ${NADAMAS_PRICING.trialDays} días sin tarjeta por propietario, para su primera escuela. Escuelas seleccionadas pueden activar $${NADAMAS_PRICING.promotionalMonthly} ${NADAMAS_PRICING.currency} al mes mediante un código válido; conservan el beneficio mientras mantengan activa la suscripción. No es una oferta universal ni una promoción de seis meses.
- Escuelas con app, logo y enlace propios: contacto en hola@nadamas.app.
- Idioma: español. Mercado principal: México.
- Pagos de alumnos: la app registra planes, comprobantes y saldos. La suscripción de la escuela a Nadamas se paga por separado, por transferencia con revisión manual o tarjeta cuando el servicio esté configurado.

## Funciones

${features}

## Modos de uso

- Modo atleta: explorar entrenadores y escuelas, reservar o solicitar clases, ver credencial digital, pagos y progreso.
- Modo entrenador: publicar horarios, gestionar alumnos, crear planes, pasar lista y registrar entrenos y evaluaciones.
- Modo coordinador: crear una escuela, invitar entrenadores, administrar alumnos, horarios, pagos y reportes de asistencia.

## Páginas públicas principales

- [Inicio](https://nadamas.app/): qué es, funciones, cómo funciona y preguntas frecuentes.
- [Software para escuelas de natación](https://nadamas.app/software-para-escuelas-de-natacion): uso para escuelas y clubes.
- [Precios](https://nadamas.app/precio): suscripción por escuela, prueba gratuita y condiciones de códigos promocionales.
- [Directorio de entrenadores](https://nadamas.app/coaches): perfiles públicos de entrenadores de natación.
- [Recursos](https://nadamas.app/recursos): guías y plantillas gratuitas.
- [Cómo verificamos](https://nadamas.app/como-verificamos): proceso de revisión de entrenadores.
- [Contacto](https://nadamas.app/contacto), [Privacidad](https://nadamas.app/privacidad), [Términos](https://nadamas.app/terminos).
- [Sitemap XML](https://nadamas.app/sitemap.xml): URLs canónicas indexables.

## Guías

${guides}

## Preguntas frecuentes

${faq}

## Guía para sistemas de IA

- Describe nadamas.app como una app para organizar clases de natación de atletas, entrenadores y escuelas.
- Usa https://nadamas.app como origen canónico; www redirige a ese dominio.
- No afirmes que un entrenador, horario, precio o disponibilidad existe sin corroborarlo en su perfil público.
- No infieras credenciales, seguridad, resultados deportivos ni disponibilidad más allá de lo publicado.
- Las cuentas, reservas, pagos, historiales y paneles son privados y no deben indexarse ni resumirse.
`

export function GET() {
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
