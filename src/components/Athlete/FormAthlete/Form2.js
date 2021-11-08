import SectionAthleteAlreadyExist from './SectionAthleteAlreadyExist'
import SectionPersonal from './SectionPersonal'
import SectionImage from './SectionImage'
import SectionContact from './SectionContact'
import SectionMedic from './SectionMedic'
import SectionEmergency from './SectionEmergency'
import StickyContactAndSaveBar from './StickyContactAndSaveBar'
import Payments from '../Payments'
import AthleteSchedule from '@comps/Schedules/AthleteSchedule'
import AthleteTeam from '../AthleteTeam'
import Section from '@comps/Section'
import Info from '@comps/Alerts/Info'
import Records from '../Records'
export function Form({ form = {}, setForm, handleSubmit, isEditable }) {
  console.log(`isEditable`, isEditable)
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
              isEditable={isEditable}
            />
          )}
          <StickyContactAndSaveBar
            mobile={form?.mobile}
            email={form?.email}
            showSaveButton={isEditable}
            ws_text={`Hola ${form?.name}`}
          />

          {/* ----------------------------------------------Personal information */}
          <SectionPersonal form={form} setForm={setForm} />
          {form?.id && (
            <Section title="Equipo" sticky>
              {/* ----------------------------------------------Pyments */}
              <Section title="Cuotas" indent={false}>
                <Payments athleteId={form?.id} />
              </Section>

              {/* ----------------------------------------------Schedule */}
              <Section title={'Horario'} indent={false}>
                <AthleteSchedule athleteId={form?.id} />
              </Section>
              {/* ----------------------------------------------TEAMS AND GROUPS */}

              <Section title={'Equipos'} indent={false}>
                <AthleteTeam athleteId={form?.id} />
              </Section>
            </Section>
          )}
          {form.id && (
            <Section title="Desempeño" sticky>
              {/* ----------------------------------------------Tests */}
              <Section title={'Pruebas'} indent={false}>
                <Records athleteId={form?.id} />
              </Section>
              {/* ----------------------------------------------TESTs */}
              <Section title={'Estadisticas'} indent={false}>
                <Info text="Aún no estan listas" />
              </Section>
            </Section>
          )}
        </form>
        {/*  {form?.id && <SectionAthleteAlreadyExist athleteId={form?.id} />} */}
      </div>
    </div>
  )
}
