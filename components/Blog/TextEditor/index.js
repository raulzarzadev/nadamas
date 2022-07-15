
import dynamic from 'next/dynamic';
import { convertFromRaw, convertToRaw } from 'draft-js';
import { useEffect, useState } from 'react';
import { EditorState, ContentState } from 'draft-js'

const DynamicEditor = dynamic(() => import('react-draft-wysiwyg').then(mod => mod.Editor), {
  ssr: false
})

import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

const uploadImageCallBack = async (file) => {

  console.log('subiendo imagen ', file)

}

const TextEditor = ({
  JSONContentState,
  JSONEditorState,
  setJSONEditorState = () => { },
  disabled = false,/* editorState, setEditorState = () => { }, contentState,  */
  editorMaxHeight = 9999
}) => {

  const [_editorState, _setEditorState] = useState(EditorState.createEmpty())
  const [_contentState, _setContentState] = useState(ContentState.createFromText(''))

  useEffect(() => {
    JSONContentState && _setContentState(convertFromRaw(JSONContentState))
  }, [JSONContentState])



  useEffect(() => {
    if (_contentState) {
      const editorDefaultState = EditorState.createWithContent(_contentState)
      _setEditorState(editorDefaultState)
    }

  }, [_contentState])

  useEffect(() => {
    setJSONEditorState(convertToRaw(_editorState.getCurrentContent()))
  }, [_editorState])


  function myBlockStyleFn(contentBlock) {
    const type = contentBlock.getType();
    if (type === 'unordered-list-item') {
      // * Tailwind styles 
      return 'leading-6	';
    }
    if (type === 'ordered-list-item') {
      // * Tailwind styles 
      return 'leading-6	';
    }

  }
  return <DynamicEditor
    /**
     * *Display blog as was writtered 
    */
    toolbarHidden={disabled}
    readOnly={disabled}
    editorState={_editorState}
    onEditorStateChange={_setEditorState}
    wrapperClassName="my-2 "
    editorClassName={`bg-base-100 text-base-content p-2 max-h-[${editorMaxHeight}rem]`}


    blockStyleFn={myBlockStyleFn}


    toolbar={{

      options: ['inline', 'blockType', 'fontSize', 'fontFamily', 'list', 'textAlign', 'colorPicker', 'link', 'embedded', 'emoji', 'image', 'history'],
      //inline: { inDropdown: true },
      list: { inDropdown: true },
      textAlign: { inDropdown: true },
      link: { inDropdown: true },
      history: { inDropdown: false },
      image: {
        urlEnabled: true,
        uploadEnabled: true,
        uploadCallback: uploadImageCallBack,
        previewImage: true,
        alt: { present: false, mandatory: false }
      },

    }}
  />
}
export default TextEditor
