# Separación de dominios y fallo de Google en iPhone

Fecha: 16 de octubre de 2026. Zona horaria de la sesión: America/Mazatlan.

## Objetivo y resultado

Se acordó usar `nadamas.app` para la landing, `app.nadamas.app` para el acceso general a la aplicación y `<escuela>.nadamas.app` para cada escuela. Se mantuvo un solo repositorio y proyecto de Vercel.

La implementación inicial redirigía las rutas de producto del dominio principal al subdominio nuevo. Después de un reporte de fallo en iPhone, se retiró esa redirección automática para conservar las instalaciones existentes. La landing mantiene su botón principal Ingresar hacia `app.nadamas.app`, pero las rutas antiguas de producto siguen funcionando en `nadamas.app`.

También se configuró el retorno de Google en el mismo origen de la aplicación, tanto en el dominio principal como en `app` y las cinco escuelas existentes.

## Secuencia de lo ocurrido

1. **Separación inicial — `cd7e474`.** Se reservó el slug `app`, se evitó interpretarlo como una escuela, se agregó el arranque de `app.nadamas.app` hacia `/dashboard` y se redirigieron las rutas de producto de `nadamas.app` al nuevo subdominio. El acceso administrativo desde escuelas pasó a apuntar a la app general.
2. **Configuración externa.** Se agregó `app.nadamas.app` al proyecto Vercel `nadamas` y a los dominios autorizados de Firebase Authentication, proyecto `nadamas-b1ecf`. El DNS existente ya cubría los subdominios mediante Vercel; la verificación del dominio fue satisfactoria.
3. **Primer despliegue y push.** Se publicó inicialmente desde la CLI. Después, el push del usuario incluyó `86c3574`, un commit independiente de recursos visuales. Se confirmó que el despliegue Git de ese commit quedó activo.
4. **Verificación inicial insuficiente.** Pasaron TypeScript, cuatro pruebas de dominios, comprobaciones HTTP, navegación móvil y la apertura de la pantalla de Google. No se había comprobado el regreso de Google a una PWA instalada en iPhone. Abrir el proveedor no demostraba que el login completo funcionara.
5. **Reporte del usuario.** La captura de iPhone de las 12:08 mostraba una ventana en `nadamas-b1ecf.firebaseapp.com` con el mensaje `Unable to process request due to missing initial state.` El texto del proveedor mencionaba almacenamiento de sesión inaccesible o borrado y restricciones de almacenamiento entre sitios.
6. **Corrección — `c5f2301`.** Se conservaron las rutas antiguas en su origen, se agregó el proxy de autenticación y se seleccionó el `authDomain` del navegador únicamente para dominios configurados. También se corrigió el origen de los enlaces OTP.
7. **Cobertura escolar — `ae6d512`.** Se completaron los callbacks OAuth, los dominios autorizados de Firebase y la variable de Vercel para las cinco escuelas existentes. Se actualizó la documentación operativa.
8. **Validación posterior.** Se comprobó que una sesión existente seguía entrando al panel del dominio principal y se completó un acceso real con Google en NANDA desde el navegador de escritorio. Las pruebas de retorno con cancelación simulada pasaron en Chromium y WebKit para los siete dominios configurados.

## Diagnóstico: hechos y límites

**Hecho confirmado:** la primera implementación enviaba las rutas antiguas a otro origen. Eso no preservaba la navegación original de las PWA ni compartía automáticamente la sesión de Firebase con el subdominio nuevo.

**Hecho confirmado:** el usuario encontró un error de estado inicial en el helper de autenticación de Firebase en iPhone.

**Hipótesis técnica tratada:** la pérdida del estado temporal del login era compatible con restricciones de almacenamiento entre dominios/contextos de Safari y aplicaciones instaladas. Se aplicó el proxy del mismo origen recomendado por Firebase para eliminar esa dependencia entre orígenes. No se obtuvo una traza del dispositivo que demostrara el mecanismo exacto ni se reprodujo el fallo original en esa instalación concreta.

No se confirmó pérdida de cuentas, datos o desinstalación de aplicaciones. Tampoco se demostró que el cambio de dominio fuese la única causa del error de Google.

## Cambios de código que deben conservarse

| Archivo | Comportamiento resultante |
| --- | --- |
| `proxy.ts` | Las rutas antiguas de producto permanecen en su origen. `/__/` no se reescribe como una escuela. La raíz de `app` sigue abriendo `/dashboard`. |
| `lib/tenant-host.ts`, `lib/slug.ts` | `app` queda reservado y no se resuelve como escuela. |
| `components/marketing/site-nav.tsx` | El acceso principal de la landing apunta explícitamente a la app; el acceso escolar sigue en su dominio. |
| `next.config.mjs` | `/__/auth/*` y `/__/firebase/init.json` se reenvían de forma transparente a Firebase. Los helpers usan `SAMEORIGIN` y `no-store`; las demás pantallas conservan sus políticas de protección. |
| `lib/firebase-auth-domain.ts`, `firebase/index.js` | El navegador usa su hostname como `authDomain` solo si está en `NEXT_PUBLIC_FIREBASE_AUTH_DOMAINS`. Otros entornos conservan el valor original. |
| `app/api/auth/otp/request/route.ts` | El correo regresa al origen configurado desde el que se pidió el acceso; no se confía en hosts arbitrarios. |
| `scripts/tests/app-domain.test.mjs` | Ocho pruebas de compatibilidad, rutas, dominios, enlaces OTP y configuración del proxy. |

No se cambió la identidad del manifiesto existente: conservar `id`, `scope` y `start_url`. No usar una redirección HTTP hacia Firebase en lugar del proxy transparente.

## Configuración externa aplicada

Los dominios siguientes se incluyeron en Firebase Authentication, en los callbacks del cliente Google OAuth existente y en `NEXT_PUBLIC_FIREBASE_AUTH_DOMAINS` de producción en Vercel:

```text
nadamas.app
app.nadamas.app
berimbau.nadamas.app
escuela.nadamas.app
nanda.nadamas.app
swim-rac-academy.nadamas.app
zeta.nadamas.app
```

Cada callback Google tiene la forma `https://<dominio>/__/auth/handler`. Se conservaron los callbacks y dominios anteriores. No se rotaron credenciales ni se cambiaron los permisos solicitados a Google.

La configuración externa no se restaura solo con Git. Antes de habilitar otra escuela, registrar su dominio en Firebase, su callback en Google y luego agregarlo a la variable de Vercel y desplegar. La guía vigente está en [app-domain.md](../app-domain.md).

## Despliegues relevantes

| Etapa | Despliegue | Evidencia |
| --- | --- | --- |
| Separación inicial desde CLI | `nadamas-q24lhgw53-raulzarza.vercel.app` | Quedó activo antes del push. |
| Push anterior al reporte | `nadamas-m42wnhw23-raulzarza.vercel.app` | Commit `86c3574`, estado `READY`, dominios asignados. |
| Corrección aislada desde CLI | `nadamas-qqhw5siup-raulzarza.vercel.app` | Commit `c5f2301`; compilación y proxy verificados antes de promoverlo. |
| Verificación final de esta sesión | `nadamas-x7e2i02z3-raulzarza.vercel.app` | Commit `ae6d512`, estado `READY`, dominios de producción asignados. |

La corrección se desplegó primero desde un worktree aislado para excluir archivos de otros trabajos en curso. Después se subieron los commits a `main` y se esperó al despliegue Git. Estos registros describen el cierre de esta intervención, no necesariamente el despliegue actual de producción.

## Qué se verificó y qué falta

- TypeScript y las ocho pruebas de `scripts/tests/app-domain.test.mjs` pasaron.
- Landing, acceso principal, rutas antiguas, arranque `/dashboard?source=pwa`, páginas escolares y helpers respondieron correctamente.
- Se comprobaron los encabezados del iframe de autenticación: `SAMEORIGIN` y `Cache-Control: no-store`.
- En Chromium y WebKit con perfil móvil se verificaron el iframe y callback del mismo origen y el regreso a la app tras una respuesta de cancelación simulada de Google, para los siete dominios. Estas pruebas no equivalen a una instalación real de iOS ni a un login exitoso con credenciales en cada escuela.
- Una sesión real existente siguió accediendo al panel en `nadamas.app` sin iniciar sesión otra vez.
- Un acceso real de Google completó el retorno a NANDA en escritorio. La cuenta de prueba no pertenecía a esa escuela como entrenador, y la app mostró esa restricción correctamente.
- **Pendiente al cierre:** el usuario debía cerrar completamente la app del iPhone y abrirla desde su icono original, sin desinstalarla, para confirmar el login en la instalación afectada. No se recibió esa confirmación durante esta intervención.
- No se verificaron pagos ni un correo OTP real. Se probó la construcción del origen del enlace OTP, sin enviar correos de prueba.

Durante la revisión también se detectó un error 500 preexistente en `events.nadamas.app`. Ese dominio pertenecía al proyecto Vercel independiente `events-namadas`; no se modificó como parte de esta corrección.

## Lecciones para cambios posteriores

1. Separar los accesos públicos hacia la app nueva sin forzar a las instalaciones antiguas a cambiar de origen.
2. Verificar el regreso del proveedor, además de su apertura. Probar navegador normal y PWA instalada en un iPhone real.
3. Mantener alineados Firebase, los callbacks Google y la variable de Vercel. Agregar un dominio a Firebase no registra por sí solo su callback en Google.
4. Distinguir los resultados de pruebas simuladas, sesiones reales y verificaciones pendientes. No declarar compatibilidad completa de iOS solo por una prueba de escritorio o de WebKit.
5. Si vuelve el error, registrar dominio de instalación, versión de iOS, origen de inicio y retorno, si ocurre dentro o fuera del icono instalado y resultado al reabrir. No guardar códigos OAuth, tokens ni secretos en la bitácora.

Referencia de la solución aplicada: [proxy de autenticación recomendado por Firebase](https://firebase.google.com/docs/auth/web/redirect-best-practices#option_3_proxy_auth_requests_to_firebaseappcom).
