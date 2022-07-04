

const formatRecord = (value, options) => {

  const toMilliseconds = options?.toMilliseconds || false
  const omitCeros = options?.omitCeros || false
  const hiddenHours = options?.hiddenHours || false

  let str = ''
  let ms = 0

  if (+value) {
    str = tranformNumberToRecod(value, { omitCeros, hiddenHours })
  }
  if (typeof value === 'string') {
    ms = transformRecordToMillisecods(value)
  }

  return toMilliseconds ? ms : str

}

export const tranformNumberToRecod = (value, { omitCeros, hiddenHours }) => {
  const seconds = Math.floor((value / 1000) % 60)
  const minutes = Math.floor((value / (1000 * 60)) % 60)
  const hours = Math.floor((value / (1000 * 60 * 60)) % 24)
  const ms = parseInt((value % 1000))

  const formatNumberInput = (value, digits = 2) => {
    return `0000${value}`.slice(-digits)
  }

  return `${hiddenHours ? '' : `${formatNumberInput(hours)}:`}${formatNumberInput(minutes)}:${formatNumberInput(seconds)}.${formatNumberInput(ms, 3)}`
}

export const transformRecordToMillisecods = (value) => {
  // 00:00:00.000
  const auxArr = value?.split(/[:\.]/g)

  const hours = auxArr[0]
  const minutes = auxArr[1]
  const seconds = auxArr[2]
  const ms = auxArr[3]
  const resInMilliseconds = parseInt(ms) + (parseInt(seconds) * 1000) + (parseInt(minutes) * 60 * 1000) + (parseInt(hours) * 60 * 60 * 1000)
  return resInMilliseconds
}




export default formatRecord
