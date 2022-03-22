// import ViewRecords from '@comps/ViewRecords'

import PrivateRoute from "@/legasy/src/HOCS/PrivateRoute";
import { Head } from "@/legasy/src/components/Head";

export default function Records() {
  return (
    <div className="">
      <>
        <Head title="Marcas | todas" />
        <PrivateRoute>{/*  <ViewRecords /> */}</PrivateRoute>
      </>
    </div>
  )
}
