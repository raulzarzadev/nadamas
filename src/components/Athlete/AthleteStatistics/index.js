import { getAthleteRecords, getRecords } from '@/firebase/records'
import { STYLES } from '@/src/constants/SWIMMING_TESTS.js'
import { format } from '@/src/utils/Dates.js'
import { useEffect, useState } from 'react'
import LinealChartJs from './LinealChart.js/index.js'
export default function AthleteStatistics({ athleteId }) {
  const [records, setRecords] = useState([])

  useEffect(() => {
    if (athleteId) {
      getAthleteRecords(athleteId)
        .then((res) => setRecords(res))
        .catch((err) => console.log(`err`, err))
    }
  }, [athleteId])

  const formatData = (data = {}) => {
    const formatRecordToNumber = (record = '') => {
      const arrTime = record.split(/[:\.]/)
      const minsToMs = parseInt(arrTime[0]) * 1000 * 60
      const segsToMs = parseInt(arrTime[1]) * 1000
      const ms = parseInt(arrTime[2]) * 100
      return minsToMs + segsToMs + ms
    }

    let labels = []
    let datasets = []

    const styleLineConfig = {
      crawl: {
        label: 'Crol',
        backgroundColor: 'rgba(255, 206, 86, 1)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 1,
        pointStyle: 'circle',
        pointRadius: 6
      },
      back: {
        label: 'Dorso',
        backgroundColor: 'rgba(255, 126, 6, 1)',
        borderColor: 'rgba(255, 126, 6, 1)',
        borderWidth: 1,
        pointStyle: 'triangle',
        pointRadius: 6
      },
      breast: {
        label: 'Pecho',
        backgroundColor: 'rgba(125, 126, 60, 1)',
        borderColor: 'rgba(125, 126, 60, 1)',
        borderWidth: 1,
        pointStyle: 'start',
        pointRadius: 6
      },
      butterfly: {
        label: 'Mariposa',
        backgroundColor: 'rgba(25, 06, 86, 1)',
        borderColor: 'rgba(25, 06, 86, 1)',
        borderWidth: 1,
        pointStyle: 'circle',
        pointRadius: 6
      },
      combi: {
        label: 'Combi',
        backgroundColor: 'rgba(25, 106, 86, 1',
        borderColor: 'rgba(25, 106, 86, 1)',
        borderWidth: 1,
        pointStyle: 'star',
        pointRadius: 6
      }
    }

    Object.keys(data).forEach((style) => {
      console.log(`style`, style)
      const styleDates = data[style]?.map(({ date }) => format(date, 'dd/MMM'))
      styleDates.map((date) => {
        if (!labels.includes(date)) {
          labels.push(date)
        }
      })

      const records = data[style].map((record) =>
        (
          (record.distance / formatRecordToNumber(record.record)) *
          1000
        ).toFixed(2)
      )
      records.length &&
        datasets.push({
          data: records,
          ...styleLineConfig[style]
        })
    })

    return { labels, datasets }

    /*     ---------FORMAT EXPECTED--------

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

  const [tests, setTests] = useState({})
  useEffect(() => {
    let tests = {}
    STYLES.forEach((test) => {
      tests[test.id] = records.filter(({ style }) => style === test.id)
    })
    setTests(tests)
  }, [records])

  console.log(`formatData(tests)`, formatData(tests))

  return (
    <div className="">
      <LinealChartJs
        title="Velocidad promedio por estilos"
        data={formatData(tests)}
      />
    </div>
  )
}
