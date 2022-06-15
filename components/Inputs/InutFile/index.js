import Image from "next/image";
import React from "react"

const InputFile = React.forwardRef(({
  label,
  preview = null,
  onUpload = ({ fieldName, file }) => { },
  progress = null,
  name = 'image',
  ...rest
}, ref) => {
  return (
    <div className="form-control w-full max-w-sm">
      {!progress ??
        <progress value={progress} max="100" className="progress" />
      }
      <label className="label">
        {label &&
          <span className="label-text">{label}</span>
        }
      </label>
      {preview &&
        <figure className="relative h-36">
          <Image src={preview} objectFit='contain' layout="fill" blurDataURL="/images/logo-3.png" placeholder="blur" />
        </figure>}
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
        onChange={({ target: { files } }) => onUpload({ fieldName: name, file: files[0] })}
        {...rest}
      />
    </div >
  )
})

export default InputFile
