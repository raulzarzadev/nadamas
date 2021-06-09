import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Text from '../InputFields/Text'
import s from './styles.module.css'

export default function FormUser() {
  const { user } = useAuth()
  console.log('user', user)

  const [form, setForm] = useState({})
  
  useEffect(() => {
    if (user) setForm(user)
  }, [user])

  console.log('form', form)
  

  return (
    <div className={s.formuser}>
      <Text label="nombre" value={form?.name} />
    </div>
  )
}
