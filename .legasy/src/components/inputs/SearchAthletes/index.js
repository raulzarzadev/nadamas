import { getAthletes } from '@/legasy/firebase/athletes'
import { useAuth } from '@/legasy/src/context/AuthContext'
import { CloseBackIcon, CloseIcon } from '@/legasy/src/utils/Icons'
import { sortArrayObjectsByField } from '@/legasy/src/utils/Sorts'
import AthleteRow from '@/legasy/src/components/AthleteRow'
import { useEffect, useState } from 'react'
import Text from '../Text'

export default function SearchAthletes({
  setAthlete = () => {},
  athleteSelected = null,
  label = 'Buscar Atleta'
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
    setSearch(`${athlete?.name || ''} ${athlete?.lastName || ''}`)
    setSortedAthletes([])
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="w-full mx-auto my-4">
        <div className="flex items-baseline">
          <Text
            autoComplete="off"
            name="search"
            value={search}
            label={label}
            onChange={handleSearch}
            error={!!!search && 'Busca por nombre o apellido'}
            Icon={CloseBackIcon}
            onClickIcon={() => {
              // setAthlete(null)
              setSearch('')
            }}
          />
        </div>
        <div>
          {sortedAthletes?.map((athlete) => (
            <div key={athlete.id} onClick={() => handleSelectAthlete(athlete)}>
              <AthleteRow athlete={athlete} coachView />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
