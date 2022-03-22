import TextEditable from "@/legasy/src/components/inputs/TextEditable"
import Section from "@/legasy/src/components/Section"

export default function SectionEmergency({ form, setForm }) {
  const handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }
  return (
    <Section title={'Contacto de emergencia'} indent={false}>
      <div className={`flex flex-col  p-1`}>
        <div className="my-1">
          <TextEditable
            onChange={handleChange}
            name="emerName"
            value={form?.emerName}
            label="Nombre"
          />
        </div>
        <div className="my-1">
          <TextEditable
            type="tel"
            onChange={handleChange}
            name="emerMobile"
            value={form?.emerMobile}
            label="Teléfono"
          />
        </div>
        <div className="my-1">
          <TextEditable
            onChange={handleChange}
            name="emerTitle"
            value={form?.emerTitle}
            label="Perentesco"
          />
        </div>
      </div>
    </Section>
  )
}
