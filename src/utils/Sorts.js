export const sortArrayObjectsByField = ({
  array = [],
  field = '',
  reverseWord = '_reverse'
}) => {

  const key = field.replace(reverseWord,'')
  
  if (field.includes(reverseWord)) {
    return array.sort((a, b) => {
      if (a[key] > b[key]) return 1
      if (a[key] < b[key]) return -1
      return 0
    })
  } else {
    return array.sort((a, b) => {
      if (a[key] < b[key]) return 1
      if (a[key] > b[key]) return -1
      return 0
    })
  }
}