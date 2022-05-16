import Image from "next/image";
import React from "react"

const File = React.forwardRef(({ label, preview = null, ...rest }, ref) => {
  return (
    <div className="form-control w-full max-w-sm">
      {preview &&
        <figure className="relative h-36">
          <Image src={preview} objectFit='contain' layout="fill" blurDataURL="/images/overlander.jpg" placeholder="blur" />
        </figure>}
      <label htmlFor="formFileMultiple" className="form-label inline-block  text-left">{label}</label>
      <input
        ref={ref}
        className="
          input 
          input-bordered w-full
          file:btn
          file:rounded-r-none
          p-0
          "
        type="file"
        id="formFileMultiple"
        {...rest}
      />
    </div >
  )
})

export default File
