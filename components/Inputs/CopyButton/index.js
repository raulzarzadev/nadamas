import useCopyToClipboard from "../../hooks/useCopyToClipboard"
import Icon from "../../Icon"

const CopyButton = ({ value, className, ...props }) => {
  const [currentValor, copy, visible] = useCopyToClipboard()

  return (
    <button
      className={` relative ${className} `}
      onClick={() => copy(value)}
      {...props}
    >
      {visible && currentValor === value ? (
        <Icon name="copyFill" />
      ) :
        <Icon name="copy" size="lg" />
      }
    </button>
  )
}
export default CopyButton
