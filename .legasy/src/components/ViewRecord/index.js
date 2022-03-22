import { getRecord } from '@/legasy/firebase/records'
import FormRecord from '@/legasy/src/components/FormRecord2'
import Loading from '@/components/Loading'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function ViewRecord() {
  const router = useRouter()
  const id = router.query.id
  const [record, setRecord] = useState({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (id) {
      getRecord(id)
        .then(setRecord)
        .catch((err) => console.log(`err`, err))
        .then(() => setLoading(false))
    }
  }, [id])
  if (loading) return <Loading />
  return (
    <div className="">
      <FormRecord record={record} />
    </div>
  )
}
