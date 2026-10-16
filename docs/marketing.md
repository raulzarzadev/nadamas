# Marketing: recursos y publicaciones

Historial de infografías creadas y dónde se publicaron. Agrega una fila cada vez que se cree o publique algo.

## Infografías

Imágenes PNG 2160×2700 (4:5) en `public/recursos/`, servidas en `https://nadamas.app/recursos/<archivo>`. El HTML fuente de cada una vive en `output/<tema>/` y se renderiza con Chrome headless:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --allow-file-access-from-files --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1080,1350 --virtual-time-budget=5000 \
  --screenshot=public/recursos/<archivo>.png "file://$PWD/output/<tema>/<archivo>.html"
```

| Archivo | Audiencia | Tema | Fuente | Creado |
|---|---|---|---|---|
| `como-pagar-tus-clases.png` | Alumnos | Pagar clases en 4 pasos | `output/planes-y-pagos/` | 2026-10-16 |
| `como-crear-planes.png` | Profes y escuelas | Paquetes de clases vs planes por periodo | `output/planes-y-pagos/` | 2026-10-16 |
| `credencial-alumnos.png` | Alumnos | Credencial digital para pase de lista | `output/pase-de-lista/` | 2026-10-16 |
| `pase-de-lista-profes.png` | Profes y escuelas | Pase de lista por QR, nombre o ID | `output/pase-de-lista/` | 2026-10-16 |
| `perfiles-adicionales.png` | Familias | Inscribir familiares o amigos | `output/perfiles-adicionales/` | 2026-10-16 |
| `entrenos-y-notas.png` | Profes y escuelas | Planear entrenos y notas de clase | `output/entrenos-y-notas/` | 2026-10-16 |
| `modo-coordinador.png` | Coordinadores | Modo coordinador | `output/modo-coordinador/` | 2026-10-16 |
| `modo-entrenador.png` | Entrenadores | Modo entrenador | `output/modo-entrenador/` | 2026-10-16 |
| `modo-alumno.png` | Alumnos | Modo alumno | `output/modo-alumno/` | 2026-10-16 |

También existe `output/planes-y-pagos/planes-y-pagos-detalle.html`: infografía detallada e interna del motor de pagos (no publicada).

## Publicaciones

### Canal de WhatsApp "Nadamas App"

| Fecha | Imagen | Estado |
|---|---|---|
| 2026-10-16 | `entrenos-y-notas.png` | Publicado (por el usuario) |
| 2026-10-16 | `modo-entrenador.png` | Publicado (por el usuario) |
| 2026-10-16 | `modo-alumno.png` | Publicado 12:43 con texto |
| 2026-10-16 | `modo-coordinador.png` | Salió por error como sticker; pendiente borrarlo y volver a publicarlo como foto |

### Facebook + Instagram (Meta Business Suite, página "Nadamas")

Programadas a las 9:00 am, también compartidas en Historia de Facebook. Sin promoción pagada.

| Fecha | Imagen | Texto (inicio) |
|---|---|---|
| 2026-10-17 | `modo-alumno.png` | 🧒 Para alumnos: busca tu escuela o entrenador… |
| 2026-10-18 | `modo-entrenador.png` | 🏊‍♂️ Para entrenadores: organiza tu agenda sin libreta… |
| 2026-10-19 | `modo-coordinador.png` | 🏫 Para coordinadores de escuela: crea tu escuela… |
| 2026-10-20 | `como-pagar-tus-clases.png` | 💳 Para alumnos: paga tus clases en 4 pasos… |
| 2026-10-21 | `como-crear-planes.png` | 💰 Para profes y escuelas: cobra tus clases a tu manera… |
| 2026-10-22 | `credencial-alumnos.png` | 🪪 Para alumnos: llega y muestra tu credencial digital… |
| 2026-10-23 | `pase-de-lista-profes.png` | ✅ Para profes y escuelas: pasa lista en segundos… |
| 2026-10-24 | `perfiles-adicionales.png` | 👨‍👩‍👧 Para familias: inscribe a tus hijos, pareja o amigos… |
| 2026-10-25 | `entrenos-y-notas.png` | 📋 Para profes y escuelas: planea tus entrenos clase por clase… |

### Instagram personal @zasaraxd (2026-10-16)

Material en `output/instagram/` (historias 1080×1920, QR y reel de modos). La cuenta es pública.

| Tipo | Contenido | Estado |
|---|---|---|
| Post (carrusel) | Los 3 modos | Publicado |
| Post (carrusel) | 6 funciones (pagos, planes, credencial, pase de lista, adicionales, entrenos) | Publicado |
| Reel | `output/reel-nadamas-v2/nadamas-reel-16s.mp4` (reservar y pagar) | Publicado |
| Reel | `output/instagram/reel-modos.mp4` (3 modos + cierre con QR) | Publicado |
| Historias | `historia-nadamas-app.png`, `historia-canal-whatsapp.png` | Pendiente: Instagram web no permite historias; subir desde el celular |

### Facebook personal (Raul Zarza, 2026-10-16)

| Tipo | Contenido | Estado |
|---|---|---|
| Post | Los 3 modos | Publicado |
| Historia | `historia-nadamas-app.png` | Publicada |
| Historia | `historia-canal-whatsapp.png` | Publicada |
| Reel | `nadamas-reel-16s.mp4` | Enviado; Facebook lo estaba procesando |

### Tech Zarza (Meta Business Suite, FB + IG techzarza)

Caso de éxito: muestra nadamas como app hecha por Tech Zarza e invita a cotizar. También compartida en Historia de Facebook. Sin promoción pagada. No incluye el canal de WhatsApp.

| Fecha | Contenido | Texto (inicio) |
|---|---|---|
| 2026-10-17 12:00 | Carrusel de los 3 modos (`modo-alumno`, `modo-entrenador`, `modo-coordinador`) | 💻 Para escuelas y negocios: creamos nadamas.app… |

Todos los textos incluyen `nadamas.app` y el canal de WhatsApp: `https://whatsapp.com/channel/0029VbDiYPACMY0GMM3Zbe2y`.

## Estilo de los textos

- Empieza con emoji + "Para <audiencia>:".
- Emojis dentro del texto, cierre con `👉 nadamas.app`.
- En Facebook/Instagram, 2–3 hashtags terminando en `#nadamas`.
