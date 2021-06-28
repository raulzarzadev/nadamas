import { useEffect, useState } from 'react'
import Button from '../Button'
import s from './styles.module.css'
import { getAthletes } from 'firebase/client'
import AthleteRow from '../AthleteRow'
import { useAuth } from '../context/AuthContext'
import { AddPersonIcon } from '../utils/Icons'
import { sortArrayObjectsByField } from '../utils/Sorts'

export default function Athletes() {
  const [athletes, setAthletes] = useState([])
  const { user } = useAuth()

  useEffect(() => {
    if (user) getAthletes(user?.id).then(setAthletes)
  }, [user])

  const [sortBy, setSortBy] = useState('')
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
    console.log('sorted', sorted, sortBy)
  }, [sortBy])

  return (
    <div className={s.athletes}>
      <h3>Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <Button primary nextLink href="/nuevo">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column'
          }}
        >
          <AddPersonIcon />
          Nuevo Atleta
        </div>
      </Button>
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
