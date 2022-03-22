import { AddIcon, TrashBinIcon } from "@/legasy/src/utils/Icons"
import Button from "@/legasy/src/components/inputs/Button"
import ButtonSave from "@/legasy/src/components/inputs/ButtonSave"
import Modal from "@/legasy/src/components/Modals/Modal"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

export const OptionsMenu = ({ options = undefined, setOptions = () => {} }) => {
  const handleAddNewOption = ({ field, value }) => {
    setButtonStatus('dirty')
    setForm({ ...form, [field]: value })
  }

  useEffect(() => {
    setForm(options)
  }, [options])

  const handleDeleteOption = (key) => {
    setButtonStatus('dirty')
    delete form[key]
    setForm({ ...form })
  }

  const [form, setForm] = useState({})
  const handleChange = ({ target: { type, value, name, checked } }) => {
    setButtonStatus('dirty')
    if (type === 'checkbox') return setForm({ ...form, [name]: checked })
    if (type === 'number')
      return setForm({ ...form, [name]: parseFloat(value) })
    setForm({ ...form, [name]: value })
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    setButtonStatus('saved')
    setOptions(form)
  }

  const [buttonStatus, setButtonStatus] = useState('clean')

  return (
    <div>
      <h3 className="text-left w-full ">Opciones</h3>
      <AddConfiguration newValue={handleAddNewOption} />
      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap  ">
          {Object.keys(form || {}).map((key) => {
            const inputsType = {
              number: (
                <input
                  type="number"
                  onChange={handleChange}
                  value={form[key]}
                  name={key}
                  max={99}
                  min={0}
                  className="pl-1 m-1 w-12 bg-secondary-dark "
                />
              ),
              boolean: (
                <input
                  type="checkbox"
                  onChange={handleChange}
                  checked={form[key]}
                  name={key}
                  className="px-1 m-1 "
                />
              ),
              string: (
                <>
                  <input
                    onChange={handleChange}
                    value={form[key]}
                    name={key}
                    className="px-1 m-1 w-20  bg-secondary-dark "
                  />
                </>
              )
            }
            return (
              <div key={key} className="w-1/2 flex justify-evenly">
                <button
                  className="w-1/6 grid place-content-center"
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeleteOption(key)
                  }}
                >
                  <TrashBinIcon size=".7rem" />
                </button>
                <label className="  w-5/6 flex items-center flex-wrap">
                  {`${key}: `}
                  {inputsType[typeof form?.[key]]}
                </label>
              </div>
            )
          })}
        </div>
        <ButtonSave status={buttonStatus} size="sm" />
      </form>
    </div>
  )
}

const AddConfiguration = ({ newValue = () => {} }) => {
  const [openNewOption, setOpenNewOption] = useState()
  const handleOpenNewOption = () => {
    reset()
    setOpenNewOption(!openNewOption)
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty }
  } = useForm()
  
  const onSubmit = ({ field, value }) => {
    newValue({ field, value })
    setTimeout(() => {
      handleOpenNewOption()
    }, 300)
  }
  const handleSetType = ({ target: { value } }) => {
    const VALUES = {
      string: '',
      number: 0,
      boolean: true
    }
    setValue('value', VALUES[value])
  }

  return (
    <div>
      <div className="">
        <span>Agregar campo</span>{' '}
        <Button iconOnly size="xs" onClick={handleOpenNewOption}>
          <AddIcon />
        </Button>
      </div>
      <Modal
        open={openNewOption}
        handleOpen={handleOpenNewOption}
        title="Agregar opción nueva"
      >
        <div>
          <form
            className="grid place-content-center grid-cols-2 gap-2 "
            onSubmit={handleSubmit(onSubmit)}
          >
            <label className="flex flex-col text-left">
              Nombre
              <input
                className="bg-secondary-dark h-6 rounded-sm px-1"
                {...register('field')}
                list="fieldSuggest"
              />
              <datalist id="fieldSuggest">
                <option value={'coach'} />
                <option value={'teams'} />
                <option value={'claps'} />
                <option value={'active'} />
                <option value={'publicCoach'} />
              </datalist>
            </label>
            <label className="flex flex-col text-left">
              Tipo
              <select
                className="bg-secondary-dark h-6 rounded-sm px-1"
                onChange={handleSetType}
                required
              >
                <option value="">selecciona tipo</option>
                <option value="boolean">boolean</option>
                <option value="string">string</option>
                <option value="number">number</option>
              </select>
            </label>

            <div className="col-span-3">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                }}
                type="submit"
                label="Agregar"
              />
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
