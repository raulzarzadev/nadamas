import Button from '@/legasy/src/components/inputs/Button'
import { useRouter } from 'next/router'

export default function ContentNotAvailable() {
  const router = useRouter()
  return (
    <div className="">
      Contenido no disponible
      <Button onClick={() => router.back()}>Regresar</Button>
    </div>
  )
}
