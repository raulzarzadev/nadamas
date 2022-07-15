import ReactMarkdown from 'react-markdown'

const Markdown = ({ content }) => {
  return (
    <div>
      <ReactMarkdown children={content} />
    </div>
  )
}


export default Markdown
