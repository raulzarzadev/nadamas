# Dominios de nadamas

Historial de decisiones, fallo en iPhone y corrección: [incidente del 16 de octubre de 2026](incidents/2026-10-16-app-domain-and-ios-auth.md).

- `nadamas.app`: landing, recursos y perfiles públicos. Las rutas de producto antiguas siguen disponibles para conservar las instalaciones y sesiones existentes.
- `app.nadamas.app`: aplicación general; `/` redirige a `/dashboard`. El botón Ingresar de la landing lleva directamente a este dominio.
- `<escuela>.nadamas.app`: conserva la página y el acceso de cada escuela.

No redirigir automáticamente las rutas de producto del dominio principal a otro origen. Las PWA instaladas conservan su identidad, manifiesto y sesión en el dominio de instalación. Mantener el `id`, `scope` y `start_url` existentes.

`app` y `www` no se pueden asignar como slug. Firebase Auth conserva la sesión por origen; no se comparte automáticamente entre escuelas, dominio principal y app.

## Google en Safari y apps instaladas

Se usa el proxy de autenticación recomendado por Firebase:
https://firebase.google.com/docs/auth/web/redirect-best-practices#option_3_proxy_auth_requests_to_firebaseappcom

- `/__/auth/*` se reenvía de forma transparente al proyecto Firebase, conservando ruta, parámetros y método. El middleware escolar nunca reescribe estas rutas.
- `/__/firebase/init.json` también se reenvía al proyecto.
- Los helpers permiten únicamente iframes del mismo origen (`SAMEORIGIN`) y se sirven con `Cache-Control: no-store`. Las demás pantallas conservan sus políticas actuales.
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAINS` contiene los dominios con callback Google ya registrado. En esos dominios el cliente usa su propio hostname como `authDomain`.
- Los entornos locales, emuladores, previews y dominios no configurados mantienen el `authDomain` original.
- Los enlaces OTP solicitados en un dominio configurado regresan a ese mismo origen.

## Configuración de producción

1. Mantener `app.nadamas.app`, el dominio principal y los dominios escolares en el mismo proyecto Vercel, con DNS y certificado válidos.
2. Autorizar cada dominio en Firebase Authentication.
3. Registrar `https://<dominio>/__/auth/handler` en los URI de redireccionamiento del cliente Google OAuth existente. Conservar todos los callbacks previos.
4. Solo después, agregar el dominio a `NEXT_PUBLIC_FIREBASE_AUTH_DOMAINS` en Vercel y desplegar. La lista de producción cubre el dominio principal, `app` y las cinco escuelas actuales; consultar su valor vigente en Vercel.
5. Para una nueva escuela, repetir los pasos 2–4 antes de activar su autenticación en el mismo origen. La lista es explícita para no activar callbacks que Google todavía no acepta.
6. Mantener `NEXT_PUBLIC_SITE_URL=https://nadamas.app` para enlaces públicos.

## Validación

Verificar la landing y su botón Ingresar, el arranque antiguo `/dashboard?source=pwa`, Google (incluido el retorno), OTP, las invitaciones, el manifiesto y el acceso escolar. La prueba final de una instalación existente en iPhone debe hacerse desde su icono original, sin desinstalarla.
