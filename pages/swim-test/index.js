import Link from "@comps/Link"
import Tests from "@comps/SwimTest/Tests"

const swimTest = () => {
  return (
    <div className="grid place-content-center">
      
      <Tests />
      <Link href={'/swim-test/new'} className='btn btn-outline'>
        Crear Examen
      </Link>
    </div>
  )
}

export default swimTest
