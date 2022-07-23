import dynamic from "next/dynamic";
import { useState } from "react";
import 'react-quill/dist/quill.snow.css'; // ES6

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
const TextEditor = () => {
  const [value, setValue] = useState('')
  const formats = [
    [
      { 'header': '1' },
      { 'header': '2' },
      { size: ['small', false, 'large', 'huge'] }
    ],
    ['bold', 'italic',],
    ['link', 'image'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  ]

  const handleAddImage = (img) => {
    console.log(img)
  }
  return (
    <ReactQuill value={value} onChange={setValue} theme="snow" formats={formats} modules={{
      toolbar: {
        container: formats,
        handlers: {
          image: imageHandler
        }
      }

    }} />
  )
}
const imageHandler = (a) => {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "image/*");
  input.click();

  input.onchange = () => {
    const file = input.files[0];

    // file type is only image.
    if (/^image\//.test(file.type)) {
      console.log(file)
      // saveToServer(file);
    } else {
      console.warn("You could only upload images.");
    }
  };
}
export default TextEditor
