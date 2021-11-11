import PrivateRoute from "@/src/HOCS/PrivateRoute";
import { Head } from "@comps/Head";

export default function Payments() {
  return (
    <>
      <Head title="Pagos" />
      <PrivateRoute>Todos los pagos</PrivateRoute>
    </>
  )
}
