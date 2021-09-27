const AthleteSimpleRow = ({ athlete, ...rest }) => {
  return (
    <div
      key={athlete.id}
      className="m-2 shadow-md hover:shadow-none "
      {...rest}
    >{`${athlete.name} ${athlete.lastName} `}</div>
  )
}
export default AthleteSimpleRow