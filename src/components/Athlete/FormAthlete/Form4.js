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
  return (
    <div className="">
      <div className="relative pt-0 pb-8 max-w-lg mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            //handleSubmit()
          }}
          className="relative"
        >
          {/* ----------------------------------------------Personal information */}
          <SectionPersonal form={form} setForm={setForm} />
         
        </form>
        {/*  {form?.id && <SectionAthleteAlreadyExist athleteId={form?.id} />} */}
      </div>
    </div>
  )
}
/*  {form?.id && (
            <Section title="Desempeño" sticky>
              <Section title={'Pruebas'} indent={false}>
                <Records athleteId={form?.id} />
              </Section>
                <Info text="Aún no estan listas" />
              </Section>
            </Section>
          )}
           */
