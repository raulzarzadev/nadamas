import BLOD_TYPES from '@/legasy/src/CONSTANTS/BLOD_TYPES'
import Textarea from '@/legasy/src/components/inputs/Textarea'
import Autocomplete from '@/legasy/src/components/inputs/TextAutocomplete'
import TextEditable from '@/legasy/src/components/inputs/TextEditable'
import Section from '@/legasy/src/components/Section'

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
