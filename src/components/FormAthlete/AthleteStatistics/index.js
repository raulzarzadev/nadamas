import { getAthleteRecords, getRecords } from '@/firebase/records'
import { useEffect, useState } from 'react'
import LinealChartJs from './LinealChart.js'
export default function AthleteStatistics({ athleteId }) {
  const [records, setRecords] = useState([])
  console.log(`athleteId`, athleteId)
  useEffect(() => {
    console.log(`effect`)
    if (athleteId) {
      getAthleteRecords(athleteId)
        .then((res) => setRecords(res))
        .catch((err) => console.log(`err`, err))
    }
  }, [athleteId])

  const formatData = (data) => {
    const labels = data
    /* 
    ---------FORMAT EXPECTED--------

    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
  datasets: [
    {
      label: '# of Votes',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }
  ] */
  }

  const [crolRecords, setCrolRecords] = useState(null)

  useEffect(() => {
    console.log(`records`, records)
    const crol = records.filter(({ style }) => style === 'crwal')
    console.log(`crol`, crol)
  }, [])

  return (
    <div className="">
      <h3></h3>

      <LinealChartJs title="Tiempos - Crol" data={crolRecords} />
    </div>
  )
}
