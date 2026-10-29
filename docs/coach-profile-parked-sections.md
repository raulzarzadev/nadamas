# Perfil de coach: secciones guardadas para después

Fecha: 2026-10-29. Se quitaron del editor de perfil de coach (`components/coach/CoachProfileEditor.tsx`) durante su rediseño. El código y los datos siguen en el repo; volver a mostrarlas es volver a montar el componente.

## Galería

- **Componente:** `components/coach/MediaCard.tsx` (usa `components/Inputs/PhotoGalleryInput.tsx`).
- **Qué hacía:** hasta 20 fotos con etiqueta: `Yo`, `Lugares de trabajo`, `Logros y eventos`, `Mis clases`. Optimiza la imagen antes de subirla (`lib/image-optimizer.ts`) y la guarda en Storage.
- **Datos (en `coaches/{uid}`, público):** `galleryPhotos: { url, label }[]`. Para compatibilidad también escribe los campos viejos `facePhoto`, `workplacePhotos`, `achievementPhotos` (`toLegacyFields`).
- **Quién lo lee todavía:**
  - `lib/coach-photo.ts` → `coachDisplayPhoto`: foto del coach = `facePhoto` → foto `Yo` de la galería → cualquier foto de la galería → foto de la cuenta (Google). Sin galería, se usa la foto de la cuenta.
  - `lib/coach-score.ts` → puntos por foto de cara, lugares y logros (pesos en `CONSTANTS/COACH_SCORE.js`).
- **Para volver a montarla:**
  ```tsx
  <MediaCard
    uid={uid}
    value={{
      galleryPhotos: pubVal.galleryPhotos,
      facePhoto: pubVal.facePhoto,
      workplacePhotos: pubVal.workplacePhotos,
      achievementPhotos: pubVal.achievementPhotos,
    }}
    saving={savingSection === 'media'}
    onSave={(v) => savePublic('media', v)}
  />
  ```

## Carta de estilo

- **Componente:** `components/coach/SkillsCard.tsx` (formulario `CoachMetricsForm.tsx`, gráfica `CoachRadarChart.tsx` con `CoachStyleMapPreview` en el encabezado). Etiqueta: `CARD_PROPIERTIES_AND_STYLES_LABEL` en `CONSTANTS/LABELS`.
- **Qué hacía:** el coach ajusta métricas de su estilo (cómo acompaña, corrige y exige) para que los alumnos lo entiendan de un vistazo; guarda con autosave (`hooks/useAutosave`).
- **Datos (en `coaches/{uid}`, público):** `metrics` (`lib/coach-metrics.ts`: `COACH_METRICS`, `normalizeCoachMetrics`).
- **Quién lo lee todavía:** `lib/coach-score.ts` suma `perFilledSkillDimension` por cada métrica llena.
- **Para volver a montarla:**
  ```tsx
  <SkillsCard
    value={pubVal.metrics}
    saving={savingSection === 'metrics'}
    onSave={(metrics) => savePublic('metrics', { metrics })}
  />
  ```

## Lo que cambió al quitarlas

- `lib/coach-completeness.ts` ya no pide **"Carta de estilo"** ni **"Foto tuya"**. Esa lista decide si el coach puede usar sus secciones (`CoachProfileGate`) y el aviso de onboarding; sin el editor, esos pendientes no se podían completar. Si se vuelven a montar las secciones, considerar volver a pedirlos.
- `autoScore` (`lib/coach-score.ts`) no cambió: los coaches que ya llenaron galería o métricas conservan esos puntos; los nuevos no pueden ganarlos mientras las secciones estén ocultas.
