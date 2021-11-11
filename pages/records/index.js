// import ViewRecords from '@comps/ViewRecords'

import PrivateRoute from "@/src/HOCS/PrivateRoute";
import { Head } from "@comps/Head";

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
