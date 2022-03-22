import PrivateRoute from "@/legasy/src/HOCS/PrivateRoute";
import { Head } from "@/legasy/src/components/Head";

export default function Payments() {
  return (
    <>
      <Head title="Pagos" />
      <PrivateRoute>Todos los pagos</PrivateRoute>
    </>
  )
}
