# Email marketing

Disponible para administradores en `/admin/marketing`. Campañas de texto con vista previa, selección de hasta 50 usuarios y últimos 20 envíos. No envía correos al abrir el panel. Las preferencias se guardan separadas del perfil público; no se presupone consentimiento de usuarios existentes. Cada usuario puede suscribirse con su correo verificado en Mi perfil. Un cambio de dirección requiere nuevo consentimiento.

## Configuración de producción

- `BREVO_MARKETING_API_KEY`: clave privada para marketing; preferiblemente una cuenta o subcuenta separada para aislar las supresiones de Brevo de los correos de acceso/reservas.
- `MARKETING_SENDER_EMAIL=novedades@marketing.nadamas.app`: registrar/verificar este remitente en Brevo. No se permite usar el dominio raíz ni recurrir al remitente transaccional.
- `MARKETING_UNSUBSCRIBE_SECRET`: secreto aleatorio de al menos 32 caracteres. Mantener estable: cambiarlo invalida enlaces de baja anteriores.
- `MARKETING_DOMAIN_VERIFIED=true`: establecer únicamente tras verificar autenticación y remitente en Brevo.
- `BREVO_MARKETING_WEBHOOK_SECRET`: secreto privado para autenticar el webhook con `Authorization: Bearer <secreto>`.

Autenticar `marketing.nadamas.app` con los registros DNS exactos entregados por Brevo (DKIM, DMARC y SPF/return-path según la configuración). El remitente es una dirección de correo; no es necesario publicar un sitio en ese subdominio. El subdominio ayuda a separar tráfico, pero no garantiza aislamiento total de reputación o IP compartida.

En Brevo configurar webhook transaccional en `https://nadamas.app/api/marketing/webhook` para bajas, spam, rebotes permanentes y bloqueos. Verificar con un correo de prueba que Brevo mantiene el encabezado `List-Unsubscribe` propio hacia nuestra URL y que un POST con `List-Unsubscribe=One-Click` guarda la baja. Si Brevo utiliza su enlace, el webhook sincroniza esa baja. Configurar el webhook antes del primer envío real. La baja desde el pie del correo siempre utiliza nuestra URL; GET muestra confirmación y POST guarda, para evitar bajas por escáneres de enlaces.

Desplegar también `firestore.rules`: `marketingPreferences`, `marketingSuppressions` y `marketingCampaigns` quedan excluidas del acceso genérico y solo se operan desde el servidor. No colocar secretos en variables `NEXT_PUBLIC_*`.

## Entrega y recuperación

El servidor vuelve a leer consentimiento y supresión antes de cada correo. Las bajas se aplican por dirección normalizada y prevalecen sobre preferencias anteriores; la suscripción explícita desde Mi perfil permite volver a suscribirse. No existe una acción admin para suscribir personas. Las direcciones repetidas se envían una sola vez por campaña y los destinatarios nunca comparten un encabezado To.

La creación atómica con UUID impide procesar dos veces la misma campaña. Cada entrega registra su estado sin reintentos automáticos. `sent` significa aceptado por Brevo, no entregado en bandeja. Un timeout o error 5xx se marca `uncertain`: revisar los registros de Brevo antes de iniciar otra campaña. Si el proceso se detiene abruptamente, puede quedar `sending`; no repetir sin revisar. No hay cola ni reanudación automática. La ruta requiere un límite de ejecución de 300 segundos; ajustar los límites del alojamiento antes de usar el máximo de 50 destinatarios.

Guía del proveedor: https://help.brevo.com/hc/en-us/articles/35337929909778-Set-up-your-domain-in-Brevo

## Configuración realizada el 16 de octubre de 2026

- `marketing.nadamas.app` registrado y confirmado como Authenticated en Brevo.
- Registros TXT de verificación, dos CNAME DKIM y TXT DMARC creados en Vercel DNS.
- Remitente `Nadamas <novedades@marketing.nadamas.app>` creado, ID 7, activo; sin errores DKIM/SPF reportados por Brevo.
- Webhook ID 2619353 creado y verificado con autenticación bearer para `unsubscribed`, `spam`, `hardBounce` y `blocked`.
- Las cinco variables de marketing quedaron configuradas en `.env.local` y Vercel Production. La clave reutiliza la cuenta actual de Brevo; no hay una cuenta/subcuenta ni IP separada.
- Pendiente desplegar el feature y las reglas, y realizar una prueba controlada de correo/baja. Durante la configuración, la ruta de producción del webhook todavía devolvía HTML en lugar de la API. No se enviaron campañas.
