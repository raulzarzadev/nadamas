import { useEffect, useState } from 'react'
import ReactAutocomplete from 'react-autocomplete'
import s from './styles.module.css'
export default function Autocomplete({
  label,
  value,
  onChange,
  items = [{ label: '', id: '' }],
  placeholder,
  onSelect,
  name,
  ...props
}) {
  const [renderItems, setRenderItems] = useState([])
  useEffect(() => {
    setRenderItems(items.filter(({ label }) => label.includes(value)))
  }, [value])
  return (
    <span className={s.input_label}>
      {label && value && `${label} :`}
      <ReactAutocomplete
        inputProps={{ className: s.text_input, placeholder, name }}
        getItemValue={(item) => item.label}
        onChange={onChange}
        value={value}
        onSelect={onSelect}
        items={renderItems}
        menuStyle={{
          borderRadius: '3px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '2px 0',
          fontSize: '90%',
          position: 'fixed',
          overflow: 'auto',
          maxHeight: '50%',
          zIndex: 1
        }}
        shouldItemRender={(item, val) => val === value}
        renderItem={(item, isHighlighted) => (
          <div
            key={item.label}
            className={` ${isHighlighted ? 'bg-gray-300' : 'bg-gray-500'}`}
          >
            {item.label}
          </div>
        )}
        placeholder={placeholder || label}
        {...props}
      />
    </span>
  )
}
