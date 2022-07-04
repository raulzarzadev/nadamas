export default (value) => {
  const num = parseInt(value)
  if (!num) return ''
  return value < 1 ? '00' : value < 10 ? `0${value}` : `${value}`
}
