import dynamic from "next/dynamic";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import 'react-quill/dist/quill.snow.css'; // ES6
import { FirebaseCRUD } from '@firebase/FirebaseCRUD'

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill");
    return ({ forwardedRef, ...props }) => <RQ ref={forwardedRef} {...props} />;
  },
  {
    ssr: false
  }
);

const TextEditor = ({
  content,
  setContent,
  disabled,
}) => {
  const [value, setValue] = useState()
  const quillRef = useRef()

  useEffect(() => {
    const init = (quill) => {
      // console.log(quill);
    };
    const check = () => {
      if (quillRef.current) {
        init(quillRef.current);
        return;
      }
      setTimeout(check, 200);
    };
    check();
  }, [quillRef]);


  useEffect(() => {
    if (content) {
      setValue(content)
    }
  }, [])


  const imageHandler = (a) => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = () => {
      const file = input.files[0];
      // file type is only image.
      if (/^image\//.test(file.type)) {
        // saveToServer(file);
        FirebaseCRUD.uploadFile({ file, fieldName: 'textEditorImage' }, (...props) => {
          const [progress, url] = props
          if (url) {
            const range = quillRef?.current?.getEditorSelection()
            // var res = siteUrl + "/" + listName + "/" + filename;  
            quillRef?.current?.getEditor().insertEmbed(range.index, 'image', url);
          }
        })
      } else {
        console.warn("You could only upload images.");
      }
      return a
    };
  }

  const formats = [
    "header",
    "size",
    "bold",
    "italic",
    "strike",
    "blockquote",
    "list",
    "bullet",
    "indent",
    "link",
    "image",
  ]


  const modules = useMemo(() => ({
    toolbar: {
      container: [[
        { 'header': '1' },
        //s{ size: ['small', false, 'large'] }
      ],
      ['bold', 'italic'],
      ['link', 'image'],
      [
        //{ 'list': 'ordered' },
        { 'list': 'bullet' }]
      ],
      handlers: {
        image: imageHandler,
        // link:(...props)=>console.log(props)
      }
    }
  }), [])

  const handleChange = (content, delta, soruce, editor) => {
    setContent(content)
    setValue(content)
  }

  return (
    <ReactQuill
      forwardedRef={quillRef}
      value={value}
      onChange={handleChange}
      theme="snow"
      formats={formats}
      modules={modules}
      className='[&>.ql-toolbar]:!sticky [&>.ql-toolbar]:top-0 [&>.ql-toolbar]:z-10 [&>.ql-toolbar]:bg-base-300 '
    />
  )
}

export default TextEditor
