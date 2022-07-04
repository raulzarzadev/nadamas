import SearchField from "../../Inputs/SearchField"

const Athletes = [
  {
    name: 'lupita',
    id: 1
  }
  ,
  {
    name: 'juan',
    id: 2
  }
]
const SearchAthletes = ({ defaultValue }) => {


  return (
    <div>
      <SearchField
        items={Athletes}
        defaultValue={defaultValue}
      />
    </div>
  )
}

export default SearchAthletes
