import TextEditable from "@comps/inputs/TextEditable"
import Section from "@comps/Section"

export default function SectionEmergency({ form, setForm }) {
  const handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }
  return (
    <Section title={'Contacto de emergencia'} indent={false}>
          <TextEditable
            onChange={handleChange}
            name="emerName"
            value={form?.emerName}
            label="Nombre"
          />
          <TextEditable
            type="tel"
            onChange={handleChange}
            name="emerMobile"
            value={form?.emerMobile}
            label="Teléfono"
          />
          <TextEditable
            onChange={handleChange}
            name="emerTitle"
            value={form?.emerTitle}
            label="Perentesco"
          />
    </Section>
  )
}
