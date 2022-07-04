import { useEffect, useState } from "react"
import Autocomplete from "react-autocomplete"

const SearchField = ({
  items = [],
  fieldName = 'name',
  optionalField = 'description',
  RenderItemSelected = null,
  defaultValue
}) => {

  const [searchValue, setSearchValue] = useState(defaultValue || '')
  const [searchResult, setSearchResult] = useState()

  useEffect(() => {
    if (searchValue.length > 0) {
      const filteredItems = items?.filter((item) => {
        return item[fieldName]?.toLowerCase()?.includes(searchValue?.toLowerCase()) || item[optionalField]?.toLowerCase()?.includes(searchValue?.toLowerCase())
      })
      setSearchResult(filteredItems)
    } else {
      setSearchResult([])
    }
  }, [searchValue])


  return (
    <div>
      <Autocomplete
        inputProps={{ placeholder: 'Busca equipos  y unete...', className: 'input input-outline input-bordered w-full text-center text-xl' }}
        wrapperStyle={{ width: '100%', margin: '1rem auto', zIndex: '1' }}
        getItemValue={(item) => item.label}
        items={searchResult?.map((team) => { return { label: team.name } })}
        renderItem={(item, isHighlighted) =>
          <div key={item.label} style={{ background: isHighlighted ? 'lightgray' : 'white' }}>
            {item.label}
          </div>
        }
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onSelect={(val) => setSearchValue(val)}
      ></Autocomplete>
      <div className="grid gap-2">
        {searchResult?.map((item) => (
          RenderItemSelected
            ?
            <RenderItemSelected item={item} key={item.id} redirect />
            :
            <Row item={item} key={item.id} redirect />
        ))}


      </div>

    </div >
  )
}

const Row = ({ item }) => (
  <div>
    {item.name}
  </div>)



export default SearchField
