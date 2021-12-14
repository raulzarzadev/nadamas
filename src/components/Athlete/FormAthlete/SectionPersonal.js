import { formatInputDate } from '@/src/utils/Dates'
import ButtonSave from '@comps/inputs/ButtonSave'
import TextEditable from '@comps/inputs/TextEditable'
import Toggle from '@comps/inputs/Toggle'
import Section from '@comps/Section'
import { useState } from 'react'
import SectionContact from './SectionContact'
import SectionEmergency from './SectionEmergency'
import SectionMedic from './SectionMedic'

export default function SectionPersonal({
  form,
  setForm,
  isEditable = true,
  handleSave
}) {
  const handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
    setButtonStatus('dirty')
  }

  const handleChangeTaggle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.checked })
    setButtonStatus('dirty')
  }
  const [buttonStatus, setButtonStatus] = useState('clean')

  return (
    <div className="text-sm mx-1">
      <div className='flex justify-center'>

      <ButtonSave
        onClick={() => {
          handleSave()
          setButtonStatus('saved')
        }}
        status={buttonStatus}
        />
        </div>
      <div className=" grid gap-2 sm:grid-cols-2">
        <TextEditable
          permissionToEdit={isEditable}
          value={form?.name}
          onChange={handleChange}
          name="name"
          label="Nombre(s)"
        />
        <TextEditable
          permissionToEdit={isEditable}
          value={form?.lastName}
          onChange={handleChange}
          name="lastName"
          label={'Apelldio(s)'}
        />
        <TextEditable
          permissionToEdit={isEditable}
          value={form?.goals}
          onChange={handleChange}
          name="goals"
          rows={2}
          label="¿Proposito o espectativa? (Opcional)"
        />
        <div className="flex items-center w-full">
          <TextEditable
            permissionToEdit={isEditable}
            value={formatInputDate(form?.birth)}
            onChange={handleChange}
            name="birth"
            label="Fecha de nacimiento"
            type="date"
          />
          <div className="mx-2">
            <Toggle
              label="Compartir"
              name="showBirthday"
              labelPosition="top"
              checked={form?.showBirthday || false}
              onChange={handleChangeTaggle}
            />{' '}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------Contact */}
      <SectionContact form={form} setForm={setForm} />
      {/* ----------------------------------------------Medic information */}
      <SectionMedic form={form} setForm={setForm} />

      {/* ----------------------------------------------Emergency contact */}
      <SectionEmergency form={form} setForm={setForm} />
    </div>
  )
}
