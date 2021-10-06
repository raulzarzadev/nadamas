import { getAthletes } from '@/firebase/athletes'
import { useAuth } from '@/src/context/AuthContext'
import { CloseBackIcon, CloseIcon } from '@/src/utils/Icons'
import { sortArrayObjectsByField } from '@/src/utils/Sorts'
import { useEffect, useState } from 'react'
import Text from '../Text'

export default function SearchAthletes({
  setAthlete = () => {},
  AthleteRowResponse = <div>Row</div>,
  athleteSelected = null
}) {
 
  const [athletes, setAthletes] = useState([])

  const { user } = useAuth()
  useEffect(() => {
    if (user) getAthletes(user?.id).then(setAthletes)
  }, [user])

  const [sortBy, setSortBy] = useState('name')
  const handleSortBy = (key) => {
    if (sortBy === key) return setSortBy(key + '_reverse')
    setSortBy(key)
  }

  const [sortedAthletes, setSortedAthletes] = useState([])

  useEffect(() => {
    const sorted = sortArrayObjectsByField({
      array: athletes,
      field: sortBy,
      reverseWord: '_reverse'     
    })
    setSortedAthletes(sorted)
  }, [sortBy, athletes])

  const [search, setSearch] = useState('')

  const handleSearch = ({ target: { value } }) => {
    setSearch(value)
  }

  useEffect(() => {
    function eliminarDiacriticosEs(texto = '') {
      return texto
        .normalize('NFD')
        .replace(
          /([^n\u0300-\u036f]|n(?!\u0303(?![\u0300-\u036f])))[\u0300-\u036f]+/gi,
          '$1'
        )
        .normalize()
        .toLowerCase()
    }
    const searchAthletes = athletes?.filter(({ name, lastName, id }) => {
      return (
        eliminarDiacriticosEs(name).includes(eliminarDiacriticosEs(search)) ||
        eliminarDiacriticosEs(lastName).includes(
          eliminarDiacriticosEs(search)
        ) ||
        eliminarDiacriticosEs(id).includes(eliminarDiacriticosEs(search))
      )
    })

    setSortedAthletes(searchAthletes)
    if (search === '') {
      // router?.push(`${router?.pathname}`)
      setSortedAthletes([])
    } else {
      // router?.push(`${router?.pathname}${search && `?search=${search}`}`)
    }
  }, [search, athletes])

  useEffect(() => {
    if (athleteSelected) {
      const athlete = athletes?.find(({ id }) => id === athleteSelected)
      handleSelectAthlete(athlete)
      // setSearch(athlete)
    }
  }, [athletes])

  const handleSelectAthlete = (athlete) => {
    setAthlete(athlete)
    setSearch(`${athlete?.name} ${athlete?.lastName}`)
    setSortedAthletes([])
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="w-full mx-auto my-4">
        <div className="flex items-baseline">
          <Text
            name="search"
            value={search}
            label="Buscar Atleta"
            onChange={handleSearch}
            error={!!!search && 'Busca por nombre o apellido'}
            Icon={CloseBackIcon}
            onClickIcon={() => {
              setAthlete(null)
              setSearch('')
            }}
          />
        </div>
        <div>
          {sortedAthletes?.map((athlete) => (
            <AthleteRowResponse
              key={athlete.id}
              athlete={athlete}
              onClick={() => handleSelectAthlete(athlete)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
