import { getRecord } from '@/firebase/records'
import FormRecord from '@comps/FormRecord2'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function ViewRecord() {
  const router = useRouter()
  const id = router.query.id
  const [record, setRecord] = useState({})
  useEffect(() => {
    if (id) {
      getRecord(id)
        .then(setRecord)
        .catch((err) => console.log(`err`, err))
    }
  }, [id])
  return (
    <div className="">
      <FormRecord record={record} />
    </div>
  )
}
