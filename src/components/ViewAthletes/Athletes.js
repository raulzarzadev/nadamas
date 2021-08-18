import { useEffect, useState } from 'react'
import Button from '@comps/inputs/Button'
import s from './styles.module.css'
import { getAthletes } from 'firebase/client'
import AthleteRow from '../AthleteRow'
import { useAuth } from '../../context/AuthContext'
import { AddPersonIcon } from '../../utils/Icons'
import { sortArrayObjectsByField } from '../../utils/Sorts'
import router from 'next/router'

export default function Athletes() {
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

  return (
    <div className={s.athletes}>
      <h3>Todos los atletas</h3>
      {/* LISTA DE ATLETAS */}
      <div className='flex w-40 mx-auto'>
        <Button
          variant="secondary"
          onClick={() => router.push('/athletes/new')}
        >
          <div className="flex flex-col items-center">
            <AddPersonIcon />
            Nuevo Atleta
          </div>
        </Button>
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
