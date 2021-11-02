import BLOD_TYPES from '@/src/constants/BLOD_TYPES'
import Textarea from '@comps/inputs/Textarea'
import Autocomplete from '@comps/inputs/TextAutocomplete'
import TextEditable from '@comps/inputs/TextEditable'
import Section from '@comps/Section'

export default function SectionMedic({ form, setForm }) {
  const handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }
  return (
    <Section title={'Información médica'} indent={false}>
      <Autocomplete
        value={form?.blodType}
        placeholder={'Tipo de Sangre'}
        items={BLOD_TYPES}
        onChange={handleChange}
        name="blodType"
        onSelect={(e) => setForm({ ...form, blodType: e })}
      />
      <TextEditable
        onChange={handleChange}
        name="medicine"
        value={form?.medicine}
        label="Medicamentos o vacunas"
      />
      <TextEditable
        onChange={handleChange}
        label="Lesiones"
        value={form?.hurts}
        name="hurts"
      />
      <TextEditable
        onChange={handleChange}
        label="Condiciones"
        value={form?.conditions}
        name="conditions"
      />
    </Section>
  )
}
