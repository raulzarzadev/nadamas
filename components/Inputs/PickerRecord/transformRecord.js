import formatNumberInput from "./formatNumberInput"

export default ({ hours = 0, minutes = 0, seconds = 0, ms = 0 }, { inMilliseconds = false, includeHours = false }) => {

  const hrs = `${formatNumberInput(hours || '00')}:`
  const mins = `${formatNumberInput(minutes || '00')}:`
  const secs = `${formatNumberInput(seconds || '00')}.`
  const mili = `${formatNumberInput(ms || '00')}`


  const res = `${includeHours ? hrs : ''}${mins}${secs}${mili}`

  const resInMilliseconds = parseInt(ms) + (parseInt(seconds) * 1000) + (parseInt(minutes) * 60 * 1000) + (parseInt(hours) * 60 * 60 * 1000)
  return inMilliseconds ? resInMilliseconds : res
}
