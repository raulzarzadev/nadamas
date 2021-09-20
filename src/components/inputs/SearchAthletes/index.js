import { getAthletes } from '@/firebase/athletes'
import { useAuth } from '@/src/context/AuthContext'
import { CloseBackIcon, CloseIcon } from '@/src/utils/Icons'
import { sortArrayObjectsByField } from '@/src/utils/Sorts'
import AthleteRow from '@comps/AthleteRow'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Text from '../Text'

export default function SearchAthletes({ setAthlete = () => {} }) {
  const router = useRouter()
  const { query } = router
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

  const [sortedAthletes, setSortedAthletes] = useState()

  useEffect(() => {
    const sorted = sortArrayObjectsByField({
      array: athletes,
      field: sortBy,
      reverseWord: '_reverse'
    })
    setSortedAthletes(sorted)
  }, [sortBy, athletes])

  const [search, setSearch] = useState(query.search || '')

  const handleSearch = ({ target: { value } }) => {
    setSearch(value)
  }

  useEffect(() => {
    function eliminarDiacriticosEs(texto) {
      return texto
        .normalize('NFD')
        .replace(
          /([^n\u0300-\u036f]|n(?!\u0303(?![\u0300-\u036f])))[\u0300-\u036f]+/gi,
          '$1'
        )
        .normalize()
        .toLowerCase()
    }
    const searchAthletes = athletes?.filter(({ name }) => {
      return eliminarDiacriticosEs(name).includes(eliminarDiacriticosEs(search))
    })

    setSortedAthletes(searchAthletes)

    if (search === '') {
      router.push(`/records/new`)
      setSortedAthletes([])
    } else {
      router.push(`/records/new?search=${search}`)
    }
  }, [search, athletes])

  const handleSelectAthlete = (athlete) => {
    setAthlete(athlete)
    setSearch(`${athlete?.name} ${athlete?.lastName}`)
    setSortedAthletes([])
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="w-full mx-auto my-4">
        <div className="flex items-end">
          <Text
            name="search"
            value={search}
            label="Buscar Atleta"
            onChange={handleSearch}
            error={!!!search && 'Selecciona un atleta'}
          />
          <button
            className="m-1 p-1 ml-2"
            onClick={() => {
              setAthlete(null)
              setSearch('')
            }}
          >
            <CloseBackIcon />
          </button>
        </div>
        <div>
          {sortedAthletes?.map((athlete) => (
            <div
              key={athlete.id}
              className="m-2 shadow-md hover:shadow-none "
              onClick={() => handleSelectAthlete(athlete)}
            >{`${athlete.name} ${athlete.lastName} `}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
