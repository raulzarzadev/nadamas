import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'
import s from './styles.module.css'
import AthleteRow from '../AthleteRow'
import { useAuth } from '../../context/AuthContext'
import { AddIcon, AddPersonIcon } from '../../utils/Icons'
import { sortArrayObjectsByField } from '../../utils/Sorts'
import router from 'next/router'
import Text from '@comps/inputs/Text'
import { getAthletes } from '@/firebase/athletes'

export default function Athletes() {
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

    search == ''
      ? router.push('/athletes')
      : router.push(`/athletes?search=${search}`)
  }, [search, athletes])

  return (
    <div className="max-w-xl mx-auto">
      <h3 className="text-center font-bold text-lg">Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <div className="flex w-32 mx-auto">
        <Button
          size="xs"
          variant="secondary"
          onClick={() => router.push('/athletes/new')}
        >
          <div className="flex flex-col items-center">
            <AddPersonIcon />
            Nuevo Atleta
          </div>
        </Button>
      </div>

      <div className="w-1/2 mx-auto my-4">
        <Text
          name="search"
          value={search}
          label="Buscar"
          onChange={handleSearch}
        />
      </div>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            margin: '1rem 0 0'
          }}
        >
          <Title
            field="birth"
            sortBy={sortBy}
            onSort={handleSortBy}
            label="Edad"
          />
          <Title
            field="name"
            sortBy={sortBy}
            onSort={handleSortBy}
            label="Nombre"
          />
          <Title
            sortBy={sortBy}
            field="lastName"
            onSort={handleSortBy}
            label="Apellido"
          />

          <div>Acciones</div>
        </div>
        {sortedAthletes?.map((athlete) => (
          <AthleteRow key={athlete.id} athlete={athlete} />
        ))}
      </div>
    </div>
  )
}

const Title = ({ onSort, label = '', field = '', sortBy = '' }) => {
  return (
    <div
      className={s.sort_title}
      select={sortBy.includes(field) ? 'true' : 'false'}
      onClick={() => onSort(field)}
    >
      {label}
    </div>
  )
}
