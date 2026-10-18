# SEO y publicación de recursos

## Primera etapa implementada

- Página comercial: `/software-para-escuelas-de-natacion`.
- Índice: `/recursos`.
- Guía: `/recursos/como-evaluar-progreso-natacion`.
- Plantilla e instrucciones: `/recursos/plantilla-seguimiento-nadadores`.
- Descarga CSV UTF-8 con ejemplo ficticio, sin registro.
- Títulos, descripciones, canonical absoluto, Open Graph y Twitter por página.
- Article y BreadcrumbList en recursos; contenido renderizado en servidor.
- Enlaces desde navegación y footer, enlaces entre recursos y página comercial.
- Sitemap alimentado por el catálogo; fechas de modificación editoriales, sin actualizar artificialmente todas las URLs en cada solicitud.
- Las rutas públicas nuevas se conservan en las métricas de PostHog; las rutas privadas siguen anonimizadas.

## Hallazgos de la revisión del repositorio

La portada ya tenía canonical, metadatos sociales y JSON-LD. El grupo privado ya declara `noindex`. Robots permite el sitio público y excluye API. No se agregó un segundo sistema de analítica ni un CMS. Los recursos iniciales usan contenido tipado en `lib/marketing/resources.ts`, renderizado por una plantilla compartida: no requieren un parser Markdown ni dependencias adicionales.

El usuario confirmó con una captura que `nadamas.app` ya está agregado a Search Console. No se revisaron sus informes, el tráfico real, el estado de indexación en Google ni Core Web Vitals de producción. No se añadieron testimonios, cifras o capturas de producto inventados. Conviene incorporar capturas reales revisadas y sin datos de alumnos en una siguiente actualización.

## Publicar un recurso

1. Añadir una entrada en `lib/marketing/resources.ts`: slug estable en español, título, descripción, categoría, fecha real de actualización y secciones con identificadores únicos.
2. Resolver una pregunta concreta con ejemplos propios. Verificar que cualquier función atribuida a Nadamas exista. No usar datos personales en ejemplos.
3. Si incluye descarga, guardar el archivo en `public/recursos/` y enlazarlo con `download`.
4. Actualizar `updatedAt` solo cuando cambie el contenido. El índice, las rutas y el sitemap se alimentan del catálogo.
5. Añadir el slug público al allowlist de `lib/analytics/privacy.ts` para distinguir su página en PostHog. No añadir identificadores privados.
6. Ejecutar `pnpm typecheck`, Biome sobre archivos modificados y comprobar página, canonical, JSON-LD, descarga y sitemap antes del despliegue habitual.

## Activación externa después de desplegar

1. Abrir la propiedad existente de `nadamas.app` en Google Search Console. No es necesario volver a conectarla; el usuario ya confirmó acceso.
2. Enviar `https://nadamas.app/sitemap.xml` e inspeccionar las nuevas URLs. Solicitar indexación no garantiza aparecer en resultados.
3. Revisar que las nuevas páginas respondan 200 en producción y que el canonical apunte al dominio principal.
4. En PostHog, revisar visitas a la página comercial y a los recursos, después acceso a `/login` y uso de la app por usuarios identificados. Configurar el embudo según eventos disponibles; una visita a login no equivale a un registro nuevo.
5. Compartir cada recurso con un resumen útil en canales propios y comunidades que permitan hacerlo.

## Verificación y envío a buscadores (2026-10-18)

- Producción sirve `/robots.txt`, `/sitemap.xml` y `/llms.txt` con estado 200. Las 11 páginas del sitemap responden 200, declaran canonical del dominio principal y permiten indexación.
- Google Search Console: propiedad de dominio `nadamas.app` existente; sitemap enviado el 12 de octubre, leído el 17 de octubre, estado **Correcto**, 11 páginas descubiertas. No es necesario enviarlo de nuevo sin cambios.
- Bing Webmaster Tools: dominio añadido y verificado en la cuenta existente mediante `public/BingSiteAuth.xml`; debe permanecer publicado para conservar la verificación.
- Sitemap enviado a Bing el 18 de octubre de 2026: aparece registrado con estado **Processing**, sin errores ni advertencias reportados al enviarlo.
- IndexNow: archivo de verificación público en `public/` con nombre hexadecimal de 32 caracteres. No es una credencial de acceso a la aplicación.
- Después de publicar cambios de contenido, ejecutar `node scripts/submit-indexnow.mjs` para enviar las URLs públicas del sitemap, o pasar URLs canónicas específicas como argumentos. El script comprueba primero la clave publicada y rechaza URLs ajenas al sitemap, parámetros y otros dominios.
- Un envío aceptado por IndexNow indica recepción; no garantiza rastreo, indexación ni citas de IA. Google utiliza su sitemap y Search Console; no se envían peticiones a su Indexing API para páginas comerciales.
- Primer envío a IndexNow: 11 URLs recibidas el 18 de octubre de 2026, HTTP 202 (validación de clave pendiente). Los dos archivos de verificación se publicaron en Vercel mediante un despliegue aislado basado en `e52cca8`, sin incluir cambios locales de agenda.
- `llms.txt` se publica en el propio sitio; no hay un registro universal de SEO/GEO al que deba enviarse. Mantener sus datos sincronizados con el contenido visible y no incluir información privada.

## Cadencia propuesta

Dos recursos mensuales durante tres meses. Próximos temas: organizar grupos por nivel, coordinar horarios y elegir software para una escuela de natación. Antes de escribir, revisar consultas de Search Console y preguntas reales de escuelas. Evitar páginas que repitan la misma intención.

Revisión mensual: páginas indexadas, impresiones, consultas, clics, visitas a recursos y conversiones verificables. Registrar una línea base al desplegar y comparar períodos equivalentes, sin prometer crecimiento específico.
