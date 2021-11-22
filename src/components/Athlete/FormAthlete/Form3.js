import SectionAthleteAlreadyExist from './SectionAthleteAlreadyExist'
import SectionPersonal from './SectionPersonal'
import SectionImage from './SectionImage'
import SectionContact from './SectionContact'
import SectionMedic from './SectionMedic'
import SectionEmergency from './SectionEmergency'
import StickyContactAndSaveBar from './StickyContactAndSaveBar'
export function Form({ form, setForm, handleSubmit, isEditable }) {
  return (
    <div className="">
      <div className="relative pt-0 pb-8 max-w-lg mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
          className="relative"
        >
          {form?.id && (
            <SectionImage
              athleteId={form?.id}
              avatar={form?.avatar}
              setAvatar={(avatar) => setForm({ ...form, avatar })}
            />
          )}
          <StickyContactAndSaveBar
            mobile={form?.mobile}
            email={form?.email}
            showSaveButton={true}
            ws_text={`Hola ${form?.name}`}
          />

          {/* ----------------------------------------------Personal information */}
          <SectionPersonal form={form} setForm={setForm} />

          {/* ----------------------------------------------Contact */}
          <SectionContact form={form} setForm={setForm} />
          {/* ----------------------------------------------Medic information */}
          <SectionMedic form={form} setForm={setForm} />

          {/* ----------------------------------------------Emergency contact */}
          <SectionEmergency form={form} setForm={setForm} />
        </form>
        {form?.id && <SectionAthleteAlreadyExist athleteId={form.id} />}
      </div>
    </div>
  )
}
