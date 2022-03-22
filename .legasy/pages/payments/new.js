import FormPayment from '@/legasy/src/components/FormPayment'

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
