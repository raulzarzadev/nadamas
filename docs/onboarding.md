# Bienvenida y configuración del perfil

`/welcome` sustituye la agenda vacía como primera entrada de perfiles sin configuración. Se pueden combinar nadador, entrenador y coordinador. Entrenador permite elegir independiente, escuela o ambas formas. Al guardar aparecen acciones reales para cada perfil seleccionado; las opciones se pueden cambiar desde Mi cuenta → Configurar mis perfiles.

Las preferencias se guardan en `users/{uid}.onboarding` mediante `/api/onboarding`. No se crea una escuela, no se inicia una prueba y no se concede administración al seleccionar un perfil. Entrenador/coordinador habilitan el rol de entrenador; la autorización sobre escuelas sigue requiriendo membresía. Al cambiar preferencias no se revocan roles que ya existían.

La entrada por dashboard, login y las pantallas iniciales de atleta/coach/escuela redirige a la bienvenida si no hay preferencias guardadas. Admin no tiene este requisito. Los enlaces específicos de invitación, clase y entrenamiento conservan su destino. Los perfiles existentes sin preferencias ven la bienvenida una vez; los configurados mantienen su navegación habitual.

El alta con Google devuelve ahora el perfil creado; antes `setDoc` resolvía sin perfil y el estado de sesión podía volver a `undefined`. La lectura de preferencia de rol tolera almacenamiento local no disponible. Las peticiones de configuración y refresco de perfil tienen tiempo límite y error recuperable.

Validación: pruebas puras de selección combinada, validación de contexto de entrenador, rutas de próximos pasos y retorno del perfil al crear cuenta; E2E de primer acceso con OTP, móvil320, combinación de tres perfiles, persistencia, permisos admin y reentrada sin repetir; regresiones de pagos, asistencia y eventos.

El coordinador sigue este orden: crear escuela → configurar un plan de pago → crear horarios → agregar profesores y alumnos. Planes sin una escuela seleccionada reutiliza la guía de creación de escuela; no muestra instrucciones para buscar un entrenador como alumno. Tras crear la escuela, la acción principal abre sus planes de pago. Cuando existe un plan, el catálogo ofrece continuar a horarios.

La creación de escuela conserva un estado de continuación al volver atrás o recargar. Tras guardar se reemplaza la entrada del formulario en el historial por la confirmación. Una escuela ya creada se muestra con sus siguientes pasos; crear una adicional requiere la acción explícita “Crear otra escuela” (`?new=1`). Si no se puede comprobar la escuela existente, se muestra un error recuperable antes de ofrecer otro formulario.

El menú del coordinador incluye Inicio (`/school`), con una lista de cinco pasos y avance basado en datos reales. Se considera completo un plan activo, una clase/horario configurado, otro profesor activo (sin contar al propietario) y un alumno activo. Las invitaciones pendientes no completan el paso de profesores. La lista vuelve a consultar al regresar o actualizar y comparte caché por escuela/usuario. Los índices de consulta están declarados en `firestore.indexes.json`; deben publicarse junto con la API.
