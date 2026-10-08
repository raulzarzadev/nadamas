# Credenciales y pase de lista

## Uso

- En **Mi perfil**, abre **Credencial digital**. Cada Adicional tiene su propio botón.
- La credencial incluye el nombre público, avatar o foto, ID de seis dígitos y QR.
- **Renovar QR** invalida el QR anterior y conserva el ID y las asistencias.
- Director y entrenador tienen **Pase de lista** en la agenda escolar y en cada clase.
- El acceso general permite elegir fecha y clase; incluye horarios publicados vacíos.
- Registra por QR, nombre en el padrón escolar o ID exacto. Los registros repetidos no crean otra asistencia.
- Incorporar a alguien exige confirmación. Vincular a alguien ajeno crea su relación en el padrón; no concede roles ni acceso a la cuenta.
- Convertir una particular ocupada a grupal exige confirmación y permiso de director. Los cupos cerrados, capacidades alcanzadas y bloqueos se respetan.
- Pasar lista conserva el estado pendiente de la inscripción y las notas individuales.

La cámara necesita HTTPS (localhost también funciona) y permiso del usuario. Se activa al tocar el botón, usa preferentemente la cámara trasera y se detiene al salir o al identificar un QR. La búsqueda por nombre o ID sigue disponible si la cámara no abre.

## Datos y permisos

La identidad canónica vive en `athleteIdentityRegistry/v1/profiles`; sus índices privados `numbers` y `tokens` reservan el ID y el QR mediante transacciones. Cada usuario y adicional tiene una identidad permanente. Los IDs se guardan como texto para conservar ceros iniciales. Un ID o QR identifica un perfil; no autentica una cuenta.

El QR contiene solamente `nadamas:credential:<token opaco>`. Solo el dueño puede obtener o renovar sus credenciales y las de sus Adicionales. El endpoint de pase de lista proyecta nombre, ID y datos de inscripción; nunca devuelve el token QR.

Las asistencias auditadas se guardan en `schools/{schoolId}/attendance/{id}`: clase, alumno, responsable, fecha/hora del registro y método. El ID determinista evita duplicados concurrentes. El registro existente en `agendaStudentRecords` se actualiza con `attended: true` conservando las notas, de modo que la agenda y el historial muestran la asistencia. Ambas escrituras y cualquier incorporación a la clase se hacen en una transacción.

Los registros canónicos de identidad y asistencia usan subcolecciones privadas que las reglas existentes no permiten leer desde clientes. Las APIs usan Firebase Admin y verifican membresía activa: el director gestiona su escuela y el entrenador solamente clases que lo tienen asignado. No se publican datos del pase de lista mediante listeners.

## Perfiles existentes

La asignación es automática al iniciar sesión, abrir las credenciales o crear un Adicional. Para completar los perfiles existentes que no se han conectado, ejecuta el script de migración con credenciales de Admin configuradas en el entorno, sin incluirlas en archivos versionados:

```bash
# Solo cuenta identidades existentes y faltantes; no modifica datos.
node scripts/backfill-athlete-identities.mjs

# Reserva las identidades que faltan. Es idempotente y conserva las existentes.
node scripts/backfill-athlete-identities.mjs --apply
```

El script pagina las colecciones y utiliza el mismo asignador transaccional que la API. También admite `FIRESTORE_EMULATOR_HOST` para pruebas locales. No se ha ejecutado la migración con escrituras en datos reales.

## Verificación

```bash
pnpm typecheck
node --test scripts/tests/*.test.mjs
PLAYWRIGHT_BASE_URL=http://localhost:3002 pnpm test:e2e e2e/attendance.spec.ts
```

La prueba de Playwright usa fixtures exclusivos de los emuladores Auth/Firestore y necesita la app conectada a ellos. Verifica autorización, credenciales, incorporación con consentimiento, registro repetido, búsqueda y modal móvil. Las pruebas de servidor cubren colisiones, concurrencia, revocación, permisos, cupos, bloqueos, inscripción pendiente, notas y publicación de horarios. La interoperabilidad QR se verifica generando el SVG con la librería de la interfaz y decodificándolo con ZXing. El permiso y el enfoque de una cámara física requieren comprobación en el dispositivo.
