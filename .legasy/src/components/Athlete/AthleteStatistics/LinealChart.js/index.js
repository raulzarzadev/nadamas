import React from 'react'
import { Line } from 'react-chartjs-2'

export default function LinealChart({ data, title }) {
  return (
    <div>
      <h2 className='text-center'>{title}</h2>
      {data && (
        <Line
          data={data}
          width={400}
          height={200}
          options={{
            maintainAspectRatio: true,
          }}
        />
      )}
    </div>
  )
}
