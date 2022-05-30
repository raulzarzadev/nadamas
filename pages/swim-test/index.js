import Link from "@comps/Link"

const swimTest = () => {
  return (
    <div className="grid place-content-center">
      <p>
        the test starts here
      </p>
      
      <Link href={'/swim-test/new'} className='btn btn-outline'>
        Crear Examen
      </Link>
    </div>
  )
}

export default swimTest
