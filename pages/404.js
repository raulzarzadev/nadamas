import Button from '@comps/Inputs/Button'
import { useRouter } from 'next/router'

export default function Page404() {
  const router = useRouter()
  return (
    <div className="flex w-full h-screen justify-center items-center">
      <div className="text-center">
        <h1>404 - Page Not Found</h1>
        <div className='my-4'>
          <Button onClick={() => router.back()}>Regresar</Button>
        </div>
      </div>
    </div>
  )
}
