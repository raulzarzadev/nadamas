export interface Resource {
  slug: string
  title: string
  description: string
  updatedAt: string
  category: string
  sections: { id: string; title: string; paragraphs: string[]; items?: string[] }[]
  download?: { href: string; label: string }
}

export const resources: Resource[] = [
  {
    slug: 'como-evaluar-progreso-natacion',
    title: 'Cómo evaluar y registrar el progreso de tus alumnos de natación',
    description:
      'Una guía para definir objetivos observables, registrar evaluaciones y dar continuidad al trabajo entre clases de natación.',
    updatedAt: '2026-10-11',
    category: 'Guía para entrenadores',
    sections: [
      {
        id: 'objetivo',
        title: '1. Define qué vas a observar',
        paragraphs: [
          'Registrar progreso empieza por una pregunta concreta: ¿qué debería poder hacer el alumno al terminar este bloque de clases? “Mejorar en natación” es demasiado amplio para decidir qué trabajar en la siguiente sesión.',
          'Elige uno o dos objetivos acordes con el nivel y las condiciones de la clase. Por ejemplo, mantener una exhalación continua bajo el agua o completar una distancia conservando la coordinación que estás enseñando. Describe la conducta que observarás y el apoyo que necesita el alumno.',
          'Estas ideas sirven para organizar el registro; el entrenador debe adaptar los ejercicios y las evaluaciones a cada persona y supervisar siempre la práctica en el agua.',
        ],
      },
      {
        id: 'registro-inicial',
        title: '2. Guarda un punto de partida comparable',
        paragraphs: [
          'Antes de comparar resultados, anota la fecha, el objetivo, el ejercicio, la distancia cuando corresponda y las condiciones relevantes. Registra si hubo material de apoyo, pausas o indicaciones durante la ejecución.',
          'Un tiempo aislado dice poco si cambian la distancia, el tipo de salida o los descansos. Separa el resultado medido de tu observación técnica: así podrás reconocer avances aunque el cronómetro todavía no los refleje.',
        ],
        items: [
          'Objetivo: exhalar de forma continua durante el desplazamiento.',
          'Observación inicial: interrumpe la exhalación y necesita una indicación en cada intento.',
          'Próximo paso: repetir el ejercicio supervisado y observar si disminuye la necesidad de indicaciones.',
        ],
      },
      {
        id: 'notas',
        title: '3. Escribe notas que ayuden a preparar la siguiente clase',
        paragraphs: [
          'Una nota útil explica qué ocurrió y qué harás después. En lugar de “le fue bien”, escribe “mantuvo la exhalación en dos intentos con una indicación al inicio; repetir y observar si puede iniciar sin ayuda”.',
          'Usa una estructura breve y constante: objetivo, evidencia, apoyo necesario y próximo paso. Si utilizas una escala como “con apoyo”, “en proceso” y “autónomo”, define qué significa cada nivel para ese objetivo. Evita comparar alumnos con necesidades o experiencias distintas.',
        ],
      },
      {
        id: 'revision',
        title: '4. Revisa tendencias, además de resultados individuales',
        paragraphs: [
          'Decide cuándo volverás a evaluar según la frecuencia de clases y el objetivo. En cada revisión, intenta repetir condiciones comparables y consulta las notas anteriores antes de sacar conclusiones.',
          'Considera la asistencia y los cambios de ejercicio al interpretar el registro. Una sesión difícil no demuestra por sí sola un retroceso. Busca evidencia repetida y ajusta el siguiente objetivo cuando el alumno esté preparado.',
          'Si varios entrenadores atienden al mismo grupo, acuerden los criterios de observación y dónde guardar las notas. Un historial compartido solo ayuda si las personas autorizadas pueden entenderlo y continuarlo.',
        ],
      },
      {
        id: 'comunicar',
        title: '5. Comunica avances concretos',
        paragraphs: [
          'Al compartir un reporte con el alumno o su familia, explica el objetivo trabajado, un avance observable y el siguiente paso. Usa lenguaje cotidiano y evita prometer fechas de dominio o resultados que todavía no están registrados.',
          'Comparte únicamente la información de ese alumno con las personas autorizadas. No publiques hojas con nombres, evaluaciones o datos personales de todo el grupo.',
          'Puedes comenzar con la plantilla de seguimiento de esta sección. Si necesitas conectar el seguimiento con las clases, Nadamas permite organizar alumnos y guardar notas y evaluaciones por alumno para continuar el trabajo entre sesiones.',
        ],
      },
    ],
  },
  {
    slug: 'plantilla-seguimiento-nadadores',
    title: 'Plantilla gratuita para el seguimiento de alumnos de natación',
    description:
      'Descarga una plantilla CSV para registrar objetivos, observaciones y próximos pasos. Incluye un ejemplo y criterios para mantener un historial útil.',
    updatedAt: '2026-10-11',
    category: 'Plantilla descargable',
    download: {
      href: '/recursos/plantilla-seguimiento-nadadores.csv',
      label: 'Descargar plantilla CSV',
    },
    sections: [
      {
        id: 'descarga',
        title: 'Qué incluye la plantilla',
        paragraphs: [
          'La plantilla es un archivo CSV que puedes abrir en Excel, Google Sheets o Numbers. No requiere registro. Incluye una fila de ejemplo ficticio: elimínala antes de guardar información real.',
          'Cada fila corresponde a una observación de un alumno en una fecha. Añade nuevas filas para conservar el historial; reemplazar la observación anterior hace más difícil entender cómo cambió el aprendizaje.',
        ],
        items: [
          'Fecha e identificador del alumno.',
          'Grupo, entrenador y objetivo de la sesión.',
          'Ejercicio, distancia y tiempo, cuando apliquen.',
          'Condiciones, observación, apoyo necesario y próximo paso.',
        ],
      },
      {
        id: 'usar',
        title: 'Cómo comenzar en tres pasos',
        paragraphs: [
          'Descarga el archivo y ábrelo en tu hoja de cálculo. Si todas las columnas aparecen juntas, importa el archivo usando UTF-8 y la coma como separador. Guarda una copia de trabajo en el formato habitual de tu herramienta.',
          'Elimina la fila de ejemplo y define un identificador interno para cada alumno. Escribe un objetivo observable, el ejercicio utilizado y lo que ocurrió. Deja distancia y tiempo vacíos cuando no sean parte de la evaluación.',
          'Al terminar la clase, anota el próximo paso. Antes de la siguiente sesión, filtra por alumno y lee las observaciones recientes. Así el registro se convierte en una ayuda para planificar.',
        ],
      },
      {
        id: 'ejemplo',
        title: 'Ejemplo de una observación útil',
        paragraphs: [
          'Para el alumno ficticio A-001, el objetivo es mantener una exhalación continua. La observación dice: “Interrumpe la exhalación; retoma con una indicación”. El próximo paso es repetir el ejercicio supervisado y observar si necesita menos indicaciones.',
          'No hace falta completar todas las columnas en cada sesión. Una nota breve y específica es más útil que una calificación sin explicación. Si registras tiempos, conserva el mismo formato y documenta las condiciones para compararlos.',
        ],
      },
      {
        id: 'cuidar',
        title: 'Mantén el archivo ordenado y privado',
        paragraphs: [
          'Acuerda quién actualiza la hoja y utiliza nombres consistentes para grupos y objetivos. Conserva una copia de respaldo y evita crear varias versiones que nadie sabe cuál debe consultar.',
          'Usa identificadores en lugar de nombres completos cuando sea posible. Limita el acceso a las personas que necesitan consultar el seguimiento y no compartas un enlace público con información de alumnos. Esta plantilla no necesita datos de contacto ni información médica.',
        ],
      },
      {
        id: 'siguiente-paso',
        title: 'Cuándo pasar de una hoja a una app',
        paragraphs: [
          'Una hoja puede ser suficiente para empezar. Cuando también necesitas coordinar clases, grupos y entrenadores, mantener cada lista por separado requiere más revisiones manuales.',
          'Nadamas reúne agenda, alumnos y seguimiento en una misma aplicación. Puedes conocer sus funciones en la página para escuelas y decidir si encajan con tu forma de trabajar. La descarga es una herramienta independiente: no es un archivo de importación a Nadamas.',
        ],
      },
    ],
  },
]
