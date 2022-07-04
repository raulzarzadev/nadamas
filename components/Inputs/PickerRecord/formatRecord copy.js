
export default (value) => {

  let res

  if (!value) res = { minutes: '00', seconds: '00', ms: '00' }
  else if (typeof value === 'string') {

    // * TODO fix for hours  
    const auxArr = value.split(/[:\.]/g)
    const minutes = auxArr[0]
    const seconds = auxArr[1]
    const ms = auxArr[2]

    res = {
      minutes: parseInt(minutes),
      seconds: parseInt(seconds),
      ms: parseInt(ms)
    }

  } else if (!isNaN(value)) {
    
    const seconds = Math.floor((value / 1000) % 60)
    const minutes = Math.floor((value / (1000 * 60)) % 60)
    const hours = Math.floor((value / (1000 * 60 * 60)) % 24)
    const ms = parseInt((value % 1000))

    const formatNumberInput = (value, digits = 2) => {
      return `0000${value}`.slice(-digits)
    }


    res = `${formatNumberInput(hours)}:${formatNumberInput(minutes)}:${formatNumberInput(seconds)}.${formatNumberInput(ms, 3)}`
  }

  console.log(value)
  console.log(res)



  return res
}

