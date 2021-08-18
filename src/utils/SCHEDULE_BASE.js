export default {
  0: setDayScheduleBetween(6, 22),
  1: setDayScheduleBetween(6, 22),
  2: setDayScheduleBetween(),
  3: setDayScheduleBetween(),
  4: setDayScheduleBetween(),
  5: setDayScheduleBetween(),
  6: setDayScheduleBetween()
}

function setDayScheduleBetween(startAt = 6, endAt = 22) {
  let res = []
  for (let i = startAt; i < endAt; i++) {
    const aux = i > 9 ? `${i}:00` : `0${i}:00`
    res.push(aux)
  }
  return res
}
