
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

  const maxHeight = `max-h-[${editorMaxHeight}rem]`

  return <DynamicEditor
    /**
     * *Display blog as was writtered 
    */
    toolbarHidden={disabled}
    spellCheck={true}
    readOnly={disabled}
    editorState={_editorState}
    onEditorStateChange={_setEditorState}
    wrapperClassName="my-2 "
    editorClassName={`bg-base-100 text-base-content p-2  ${maxHeight}`}
    toolbarClassName="!bg-base-300 sticky top-0 z-10 !border-base-200"
    blockStyleFn={myBlockStyleFn}
    hashtag={{
      separator: ' ',
      trigger: '#',
    }}
    

    toolbar={{

      // options: ['inline', 'blockType', 'fontSize', 'fontFamily', 'list', 'textAlign', 'colorPicker', 'link', 'embedded', 'emoji', 'image', 'history'],
      options: ['inline', 'blockType', 'link', 'image', 'embedded', 'emoji', 'list',],

      inline: {
        inDropdown: true,
        options: ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript'],
      },
      blockType: {

        options: ['Normal', 'H1', 'H2', 'H3', 'Blockquote']
      },
      list: { inDropdown: false, },
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
