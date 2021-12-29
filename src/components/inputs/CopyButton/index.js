import useCopyToClipboard from "@/src/hooks/useCopyToClipboard"
import { CopyIcon } from "@/src/utils/Icons"

const CopyButton = ({ value, className, ...props }) => {
  const [currentValor, copy, visible] = useCopyToClipboard()

  return (
    <button
      className={` relative ${className} `}
      onClick={() => copy(value)}
      {...props}
    >
      <CopyIcon />
      {visible && currentValor === value && (
        <div className="absolute right-0 -top-2 bg-success text-dark">
          Copiado
        </div>
      )}
    </button>
  )
}
export default CopyButton
