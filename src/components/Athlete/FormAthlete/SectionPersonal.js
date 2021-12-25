import { formatInputDate } from "@/src/utils/Dates"
import TextEditable from "@comps/inputs/TextEditable"
import Toggle from "@comps/inputs/Toggle"

export default function SectionPersonal ({ form, setForm }) {
  const handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }
  const handleChangeTaggle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.checked })
  }
  return (
    <div className=''>
      <div className="p-2 sm:p-6 grid gap-2">
        <TextEditable
          // permissionToEdit={ isEditable }
          value={ form?.name }
          onChange={ handleChange }
          name="name"
          label="Nombre(s)"
        />
        <TextEditable
          //permissionToEdit={ isEditable }
          value={ form?.lastName }
          onChange={ handleChange }
          name="lastName"
          label={ 'Apelldio(s)' }
        />
        <TextEditable
          //permissionToEdit={ isEditable }
          value={ form?.goals }
          onChange={ handleChange }
          name="goals"
          rows={ 2 }
          label="¿Proposito o espectativa? (Opcional)"
        />
        <div className="flex items-center w-full">
          <TextEditable
            //={ isEditable }
            value={ formatInputDate(form?.birth) }
            onChange={ handleChange }
            name="birth"
            label="Fecha de nacimiento"
            type="date"
          />
          <div className="mx-2">
            <Toggle
              label="Compartir"
              name="showBirthday"
              labelPosition="top"
              checked={ form?.showBirthday || false }
              onChange={ handleChangeTaggle }
            />{ ' ' }
          </div>
        </div>
      </div>
    </div>
  )
}