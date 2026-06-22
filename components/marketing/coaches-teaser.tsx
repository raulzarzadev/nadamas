import CoachDirectoryList from '@comps/coach/CoachDirectoryList'

export default function CoachesTeaser() {
  return (
    <section id="coaches" className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <h2 className="text-[2rem] font-extrabold leading-tight text-(--c-ocean) sm:text-[2.6rem]">
        Encuentra un coach compatible contigo
      </h2>
      <p className="mt-3 mb-8 text-lg leading-relaxed text-(--c-text-2)">
        Compara estilo, revisa horarios reales y reserva en minutos.
      </p>
      <CoachDirectoryList limit={5} showSearch={false} viewAllHref="/coaches" />
    </section>
  )
}
