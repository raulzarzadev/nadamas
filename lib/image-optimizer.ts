const TARGET_MAX_BYTES = 10 * 1024 * 1024
const HARD_MAX_INPUT_BYTES = 250 * 1024 * 1024
const MAX_EDGE = 4096
const MIN_QUALITY = 0.82

export interface OptimizedImageResult {
  file: File
  wasOptimized: boolean
  originalBytes: number
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo optimizar la imagen.'))
          return
        }
        resolve(blob)
      },
      type,
      quality
    )
  })
}

function resizeDimensions(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const ratio = maxEdge / longest
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

export async function optimizeImageForUpload(
  file: File,
  targetMaxBytes = TARGET_MAX_BYTES
): Promise<OptimizedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen.')
  }

  if (file.size <= targetMaxBytes) {
    return { file, wasOptimized: false, originalBytes: file.size }
  }

  if (file.size > HARD_MAX_INPUT_BYTES) {
    throw new Error(
      'La imagen es demasiado pesada para procesarla en este dispositivo. Usa una foto menor a 250 MB.'
    )
  }

  const bitmap = await createImageBitmap(file)
  let { width, height } = resizeDimensions(bitmap.width, bitmap.height, MAX_EDGE)
  let bestBlob: Blob | null = null

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('No se pudo preparar la imagen.')

    context.drawImage(bitmap, 0, 0, width, height)

    let low = MIN_QUALITY
    let high = 0.98

    for (let index = 0; index < 6; index += 1) {
      const quality = (low + high) / 2
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      bestBlob = blob

      if (blob.size > targetMaxBytes) high = quality
      else low = quality
    }

    if (bestBlob && bestBlob.size <= targetMaxBytes) break

    width = Math.round(width * 0.85)
    height = Math.round(height * 0.85)
  }

  bitmap.close()

  if (!bestBlob || bestBlob.size > targetMaxBytes) {
    throw new Error('No se pudo reducir la imagen por debajo de 10 MB.')
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'imagen'
  return {
    file: new File([bestBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    }),
    wasOptimized: true,
    originalBytes: file.size,
  }
}
