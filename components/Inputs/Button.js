export default function Button({ children, className, ...props }) {
  return (
    <button className="btn " {...props}>
      {children || 'Button'}
    </button>
  )
}
