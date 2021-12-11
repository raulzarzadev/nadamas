export const formatRecordToMS = (record) => {
  if (!record) return 0
  const arrTime = record.split(/[:\.]/)
  const minsToMs = parseInt(arrTime[0]) * 1000 * 60
  const segsToMs = parseInt(arrTime[1]) * 1000
  const ms = parseInt(arrTime[2]) * 100
  return minsToMs + segsToMs + ms
}
export const averageRecordSpeed = (distance, record) => {
  if (!distance || !record) return 0
  const ms = formatRecordToMS(record)
  const dist = parseInt(distance || 0)
  return ((dist / ms) * 1000).toFixed(2)
}
