import { FiCheck, FiMinus } from 'react-icons/fi'

const ROWS = [
  {
    task: 'Reservas',
    before: 'Confirmar uno por uno por WhatsApp',
    after: 'El atleta reserva o solicita su lugar',
  },
  {
    task: 'Pagos',
    before: 'Transferencias difíciles de rastrear',
    after: 'Planes, comprobantes y saldos por alumno',
  },
  { task: 'Asistencia', before: 'Lista en papel', after: 'Pase de lista con reportes' },
  {
    task: 'Progreso',
    before: 'Notas que se pierden entre clases',
    after: 'Entrenos y evaluaciones en la ficha del alumno',
  },
] as const

export default function Comparison() {
  return (
    <section
      id="comparacion"
      aria-labelledby="comparacion-title"
      className="scroll-mt-20 bg-(--c-surface) px-5 py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1180px]">
        <p className="text-sm font-bold uppercase text-[#a94732]">Antes y después</p>
        <h2
          id="comparacion-title"
          className="mt-3 max-w-[22ch] text-3xl font-extrabold sm:text-4xl"
        >
          nadamas.app frente a la libreta, WhatsApp y Excel.
        </h2>

        <div className="mt-10 overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white">
          <table className="w-full border-collapse text-left text-sm sm:text-base">
            <caption className="sr-only">
              Comparación entre organizar clases de natación con herramientas sueltas y con
              nadamas.app
            </caption>
            <thead className="hidden bg-(--c-ocean) text-white sm:table-header-group">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold">
                  Tarea
                </th>
                <th scope="col" className="px-6 py-4 font-bold">
                  Libreta, WhatsApp o Excel
                </th>
                <th scope="col" className="px-6 py-4 font-bold">
                  Con nadamas.app
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.task}
                  className="grid border-b border-(--c-border) px-5 py-4 last:border-b-0 sm:table-row sm:p-0"
                >
                  <th scope="row" className="pb-2 font-bold text-(--c-ocean) sm:px-6 sm:py-4">
                    {row.task}
                  </th>
                  <td className="flex items-start gap-2 py-1 text-(--c-text-2) sm:table-cell sm:px-6 sm:py-4">
                    <FiMinus aria-hidden="true" className="mt-1 shrink-0 sm:hidden" />
                    <span className="sr-only sm:hidden">Sin app: </span>
                    {row.before}
                  </td>
                  <td className="flex items-start gap-2 py-1 font-semibold text-(--c-ocean) sm:table-cell sm:px-6 sm:py-4">
                    <FiCheck
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-(--c-aqua-strong) sm:mr-2 sm:inline"
                    />
                    <span className="sr-only sm:hidden">Con nadamas.app: </span>
                    {row.after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
