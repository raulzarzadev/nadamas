import FormPayment from '@comps/FormPayment'

export default function NewPayment() {
  return (
    <>
      <Head title="Pagos | nuevo" />
      <PrivateRoute>
        <FormPayment />
      </PrivateRoute>
    </>
  )
}
