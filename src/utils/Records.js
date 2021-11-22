export const formatRecordToMS = (record = '') => {
  const arrTime = record.split(/[:\.]/)
  const minsToMs = parseInt(arrTime[0]) * 1000 * 60
  const segsToMs = parseInt(arrTime[1]) * 1000
  const ms = parseInt(arrTime[2]) * 100
  return minsToMs + segsToMs + ms
}
export const averageRecordSpeed = (distance, record) => {
  const ms = formatRecordToMS(record)
  const dist = parseInt(distance)
  return (dist / ms * 1000).toFixed(2)
}
