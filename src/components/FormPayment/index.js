import SearchAthletes from '@comps/inputs/SearchAthletes'
import Text from '@comps/inputs/Text'

export default function FormPayment() {
  return (
    <div className="">
        <SearchAthletes /> 
      <Text value={new Date()} type="date" label="Fecha" />
      <Text label="Cantidad" />
      <input type="file" />
    </div>
  )
}
