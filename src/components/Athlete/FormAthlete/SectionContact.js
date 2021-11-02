import TextEditable from '@comps/inputs/TextEditable'
import Section from '@comps/Section'

export default function SectionContact({  form, setForm }) {
  const handleChange = ({ target: { name, value } }) => {
    setForm({ ...form, [name]: value })
  }
  return (
    <Section title={'Contacto'} indent={false}>
      <div className={`flex flex-col p-1`}>
        <div className="my-1">
          <TextEditable
            onChange={handleChange}
            value={form?.mobile}
            name="mobile"
            type="tel"
            label="Celular"
          />
        </div>
        <div className="my-1">
          <TextEditable
            onChange={handleChange}
            value={form?.email}
            name="email"
            label="email"
            label="Correo"
          />
        </div>
      </div>
    </Section>
  )
}
