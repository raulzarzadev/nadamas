export default function InputText({ label, disabled, ...rest }) {
  return (
    <label
      className={`${
        disabled && `opacity-50`
      } block text-sm text-gray-800 dark:text-gray-200 `}
    >
      {label}
      <input
        disabled={disabled}
        type="text"
        {...rest}
        className={`${
          disabled && `opacity-50`
        } block w-full px-4 py-2 mt-2 text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring`}
      />
    </label>
  )
}
