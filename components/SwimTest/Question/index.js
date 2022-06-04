

export const Question = ({
  question = {},
  onClickOption = () => { },
  onClickQuestion = () => { }
}) => {
  console.log(question)
  const { text = '', options = [], key = '', multiplier = 0, id = '' } = question

  return (
    <div
      onClick={() => onClickQuestion(id)}
      className='relative border rounded-lg p-2 '
    >

      <div className='text-2xl font-bold'>
        <p>
          {text}
        </p>
        <span className='font-thin '>
          {`( ${multiplier} )`}
        </span>
      </div>
      <div className='grid gap-2'>
        <h4>Opciones</h4>
        {options?.map((op, i) =>
          <div className=' border rounded-md flex' key={i} onClick={() => onClickOption(op)}>
            <div className='px-1 mr-1 h-full bg-base-content rounded-l-md text-base-100'>
              {i + 1}
            </div>
            <p>
              {op?.text}
              <span className='font-thin'>{` ( ${op?.value} ) `}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )

}
