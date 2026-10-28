# Home de escuela: tablero, eventos y personalización simple

Fecha: 2026-10-28 · Estado: borrador para aprobación

## Intención

La home pública de una escuela (`{slug}.nadamas.app`, ruta `/school/[slug]`, componente `components/school/SchoolPublicHome.tsx`) hoy es solo un hero (logo, nombre, descripción, botón "Explorar horarios") y los contactos. Queremos que:

- **El papá / nadador inscrito** la abra y en un vistazo sepa qué sigue para él y sus hijos: próximos entrenos, próximos eventos y cómo van sus últimas clases.
- **El visitante sin cuenta** vea una escuela viva (foto, eventos públicos, fotos) y un botón claro para **solicitar unirse al equipo**.
- **El coordinador** pueda darle identidad a su escuela con poco esfuerzo: portada, galería, color propio, y decidir qué secciones salen.

## Anti-objetivos (fracaso aunque funcione)

1. **Que se vea recargada.** Secciones vacías no se muestran nunca. Pocas secciones visibles por defecto. Nada de widgets "por si acaso".
2. **Que el coordinador no la llene.** Cada pieza debe tener un camino de 1 paso desde Ajustes, la home debe verse bien con cero configuración (como hoy), y el panel del coordinador debe mostrar qué le falta (p. ej. "Agrega una foto de portada") sin bloquear.

## No-objetivos (por ahora)

- Botón "Asistiré" (RSVP) y "Agregar al calendario" en eventos → fase posterior.
- Historia, metodología y puntos de encuentro como secciones públicas → mucho después.
- Videos (subida o embebidos) → después.
- Plantillas / temas de diseño completos, editor libre de páginas.
- Profes creando eventos (solo coordinador).
- Dominio propio de escuela (ver memoria `school-custom-domains-deferred`).

## Quién ve qué

### Visitante sin sesión (o con sesión pero no miembro)
Orden fijo de arriba hacia abajo (sujeto a ocultar/ordenar del coordinador, ver abajo):
1. Hero grande (como hoy) — con foto de portada si existe.
2. Botón principal **"Solicitar unirme al equipo"**. Sin sesión → login con `?redirectTo=` de vuelta a la home y luego envía la solicitud. Usa el endpoint existente `POST /api/schools/[schoolId]/access-requests` (ya maneja: miembro activo, pendiente, suspendido). Tras enviar: estado "Solicitud enviada". El botón actual "Explorar horarios" pasa a secundario.
3. Próximos eventos **públicos** + "Ver eventos pasados".
4. Galería.
5. Contactos (como hoy).

### Miembro (papá con perfiles familiares, o nadador) — layout "A · Tablero primero" (elegido)
1. Hero **chico** con saludo ("Hola, Raúl") y nombre de la escuela.
2. **Próximos entrenos**: por cada perfil (titular + hijos vía perfiles familiares) su siguiente clase en esta escuela: nombre, día/hora, grupo/clase y lugar.
3. **Próximos eventos**: públicos y privados (los privados con etiqueta "Privado") + "Ver eventos pasados".
4. **Últimas clases**: resumen por perfil a partir de la asistencia (`lib/server/attendance.ts`), p. ej. "Sofía: 3 de 4 esta semana". Formato exacto lo decide el builder; debe caber en una línea por perfil.
5. Galería y contactos (si están visibles).

Un perfil sin clases próximas no aparece en "Próximos entrenos"; si ningún perfil tiene, la sección no se muestra.

Decisiones tomadas por Claude (revisables):
- **Próximo entreno:** la ocurrencia más cercana del perfil; si es una solicitud aún pendiente de aprobación se muestra con etiqueta "Pendiente de confirmar" para no presentarla como asegurada.
- **Últimas clases:** se calcula con la misma regla de asistencia que ya usa la app (clase terminada cuenta como asistida salvo falta marcada), para que los números coincidan con las demás pantallas.

### Escuelas no públicas (`isPublic: false`)
Decidido por el usuario: **los miembros activos sí ven su tablero** aunque la escuela no sea pública. Los visitantes y no miembros siguen sin verla (estado "no disponible", sin revelar datos). Hoy `/school/[slug]` hace `notFound()` en el servidor para estas escuelas y la sesión vive en el cliente (Firebase Auth + `getAuthed` con ID token), así que el builder debe resolver el acceso de miembros sin exponer nada en el HTML del servidor; estas páginas siempre `noindex`.

Mockups de referencia (no definitivos): `.superpowers/brainstorm/57692-1793214370/content/school-home-layout.html` y `school-customization.html`.

## Eventos

- **Campos:** fecha (y hora opcional), título, descripción, **una** foto opcional, lista opcional de enlaces (cada uno con etiqueta + URL: álbum de fotos, ubicación de Maps, otro), visibilidad **pública** o **privada**.
- **Privado** = solo miembros activos de la escuela. Nunca debe filtrarse a visitantes, ni en el HTML del servidor ni por API/reglas.
- **Próximos** = fecha ≥ hoy (en la zona horaria de la escuela, `school.timezone`), ordenados del más cercano. **Pasados** = página/lista aparte vía "Ver eventos pasados", del más reciente al más antiguo.
- **Quién gestiona:** solo el coordinador (rol `director`). Crear, editar, borrar.
- En la home se muestran pocos próximos (builder decide el número, 3 sugerido) para no recargar.

## Personalización (las 4 piezas aprobadas)

1. **Foto de portada** detrás del nombre en el hero, con oscurecido para legibilidad. Sin foto = hero actual.
2. **Galería de fotos** de la escuela: cuadrícula en la home con "Ver todas", toque abre la foto grande. Límite de cantidad lo fija el builder (orden de 12–24).
3. **Color propio**: además de las 6 paletas actuales (`SCHOOL_PALETTES` en `lib/school.ts`), el coordinador puede elegir un color exacto; la app deriva los demás tonos y garantiza texto legible (contraste). Afecta las mismas variables CSS que hoy (`--tenant-*` / `--school-*`).
4. **Mostrar/ocultar y ordenar secciones** de la home: eventos, galería, coaches (si `showCoaches`), contactos. El hero y el botón de unirse no se pueden quitar. Este orden aplica a lo que ve el visitante; en el tablero del miembro lo personal (entrenos, últimas clases) va siempre primero y el resto respeta el orden del coordinador.

Todo se configura en Ajustes de la escuela (`components/school/SchoolSettingsForm.tsx` y tarjetas hermanas) por el coordinador.

## Restricciones y patrones del repo

- Seguir `CLAUDE.md`: acceso a datos vía servidor (`lib/server/*` + rutas `app/api/schools/[schoolId]/...`, como el resto de la escuela) o el patrón `firebase/<dominio>/main.ts`; nada de Firestore directo desde componentes.
- Fotos a Storage igual que `firebase/school-logos/main.ts`; `storage.rules` hoy permite imágenes <10 MB a cualquier usuario autenticado — revisar si basta.
- `firestore.rules`: `schools/{id}` lee si `isPublic` o miembro; los eventos privados necesitan regla equivalente (solo miembros).
- Errores: mensajes en español sin detalles técnicos (`lib/user-facing-error.ts`).
- Copy en español, código en inglés. Tailwind v4 con shorthand `text-(--c-x)`.
- La home pública es SEO/compartible: eventos públicos y galería renderizados en servidor; imagen OG puede usar la portada.
- Móvil primero.

## Lo que decide el builder

Modelo de datos y nombres de colecciones/campos, número de eventos en la home, límite de fotos de galería, cómo derivar la paleta desde un color, UI exacta de Ajustes, formato de "últimas clases", fases de entrega y tests (Playwright e2e en `e2e/`).
