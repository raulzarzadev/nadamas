# Componentes compartidos

El catálogo interactivo está en `/interfaces` (`catalog/InterfaceCatalog.tsx`). Reutiliza estos campos en los formularios antes de crear variantes nativas.

| Campo | Componente | Valor | Props |
| --- | --- | --- | --- |
| Fecha | `ui/date-input.tsx` — `DateInput` | `YYYY-MM-DD` o `''` | `value`, `onChange`, `label`, `required`, `disabled`, `minYear`, `max`, `name` |
| Rama / género | `ui/gender-selector.tsx` — `GenderSelector` | `SchoolGender`: `varonil`, `femenil`, `otro` | `value`, `onChange`, `disabled` |
| Teléfono | `ui/phone-number-input.tsx` — `PhoneNumberInput` | E.164 o `''` | `id`, `value`, `onChange`, `disabled`, `required`, `defaultCountry` (MX) |

`DateInput` y `GenderSelector` incluyen su etiqueta accesible. Para `PhoneNumberInput`, agrega un `<label htmlFor={id}>` externo. Todos son campos controlados: guarda el valor recibido por `onChange` en el estado del formulario.

Para fechas de nacimiento, usa `max` con la fecha actual. Para teléfonos, conserva el valor internacional devuelto por el componente; no elimines el prefijo de país.

## Sistema de etiquetas

Demostración interactiva: `/interfaces#tags` → **Sistema de etiquetas**.

- `ui/label-chip.tsx` (`LabelChip`): etiqueta con color, tamaños `tiny`, `compact` y `filter`; selección, contador y acción opcional para quitarla. Props: `label`, `size`, `selected`, `count`, `disabled`, `onClick`, `onRemove`.
- `ui/label-filter-bar.tsx` (`LabelFilterBar`): filtros con estado seleccionado, contadores y acciones para crear/editar. Props: `labels`, `value`, `onChange`, `total`, `counts`, `disabled`, `onCreate`, `onEdit`.
- `coach/StudentLabels.tsx`: conecta las etiquetas del perfil con la API. Permite agregar y quitar; usa `readOnly` para listas y `data` para compartir la consulta de etiquetas.
- `coach/StudentLabelTools.tsx`: carga en bloque las etiquetas y asignaciones, conecta el filtro y gestiona creación, edición y asignación. Comparte el resultado mediante `onData`.
- `coach/StudentLabelColorSelector.tsx`: selector de colores compartido.

Los componentes UI son controlados y no acceden a Firebase ni a la API. Los colores provienen de `lib/student-label-colors.ts`. Para listas, carga las asignaciones en bloque; evita una petición por alumno.
