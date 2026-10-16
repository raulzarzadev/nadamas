# Dominios de nadamas

- `nadamas.app`: landing, recursos y perfiles públicos.
- `app.nadamas.app`: aplicación general; `/` redirige a `/dashboard`.
- `<escuela>.nadamas.app`: conserva la página y el acceso de cada escuela.

Las rutas de producto del dominio principal redirigen a `app.nadamas.app`, conservando ruta y parámetros. `app` y `www` no se pueden asignar como slug. Los entornos locales y de preview conservan sus rutas relativas.

## Configuración de producción

1. Agregar `app.nadamas.app` al mismo proyecto de Vercel y configurar el DNS indicado por Vercel. Mantener el dominio principal y los dominios escolares existentes.
2. Agregar `app.nadamas.app` a los dominios autorizados de Firebase Authentication y verificar Google y correo OTP en ese origen.
3. Mantener `NEXT_PUBLIC_SITE_URL=https://nadamas.app` para enlaces públicos; las rutas de producto antiguas redirigen al nuevo origen.
4. Verificar landing, login, enlaces de invitación y un subdominio escolar después del despliegue.

Firebase Auth mantiene la sesión por origen: los usuarios pueden necesitar iniciar sesión otra vez al entrar al subdominio nuevo. No se comparte automáticamente la sesión entre escuelas y app.

Estos cambios de código no configuran DNS, Vercel ni Firebase.
