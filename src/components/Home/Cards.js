import useWriteText from '@/src/hooks/useWriteText'
import Image from 'next/image'
import Link from 'next/link'

const RELEVANT_CARDS = [
  {
    title: 'Entrenadores',
    image:
      'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    href: '/coaches'
  } /* ,
    {
      title: 'Noticias',
      image:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      href: '/news'
    },
    {
      title: 'Personas',
      image:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      href: '/peapole'
    } */
]

const SECTIONS_CARDS = [
  {
    title: 'Metodologias',
    image:
      'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
    href: '/peapole'
  }
  /*  {
      title: 'Los Mejores atletas',
      image:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      href: '/peapole'
    },
    {
      title: 'Triatlon y Aguas abiertas',
      image:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      href: '/peapole'
    },
    {
      title: 'Entrenamientos y asesorias',
      image:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      href: '/peapole'
    },
    {
      title: 'Eventos ',
      image:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8bmV3fGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
      href: '/peapole'
    } */
]

const wordsList = [
  'Instructor',
  'Nadador',
  'Maestro',
  'Entrenador',
  'Administrador de GYM'
]

export default function Cards() {
  const { text } = useWriteText({ wordsList, unwriteFast: true, step: 300 })
  return (
    <>
      <div>
        <div></div>
        <h3 className="px-2 ">Mejorando la natación en Mexico</h3>
        <div className="flex overflow-auto">
          {RELEVANT_CARDS.map((card, i) => (
            <div className="m-2" key={i}>
              <RelevantCard card={card} key={i} />
            </div>
          ))}
        </div>
      </div>
      <div className="px-2">
        <h3 className=" text-2xl">nadamas</h3>
        <div className="">
          <p className="my-2 flex flex-col">
            <span>Todo acerca de natación para ser un mejor</span>
            <strong className="text-lg text-center h-8 font-bold text-white  ">
              {text}
            </strong>
          </p>
          <p className="my-2">
            Teoria y cienca del deporte, metodologias, los entrenamientos mas
            populares, los entrenadores con mejores resulatados, los atletas mas
            prometedores, eventos, marcas y mucho mas
          </p>
        </div>
      </div>

      <div>
        <h3 className="px-2 text-2xl">La natación en México</h3>
        <div className="flex flex-wrap">
          {SECTIONS_CARDS.map((card, i) => (
            <div className="p-2 w-full sm:w-1/2 md:w-1/3" key={i}>
              <SectionCard card={card} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

const RelevantCard = ({ card: { title, image, href } }) => {
  return (
    <Link href={href}>
      <div className="relative w-36 h-24 bg-red-300 rounded-lg shadow-lg hover:shadow-sm cursor-pointer">
        <Image
          src={image}
          layout="fill"
          objectFit="cover"
          className="rounded-b-lg"
        />
        <div className="absolute bottom-0 left-0 right-0 ">
          <h4 className="font-bold bg-blue-200 p-1 rounded-b-lg text-sm text-black">
            {title}
          </h4>
        </div>
      </div>
    </Link>
  )
}

const SectionCard = ({ card: { title, image, href } }) => {
  return (
    <Link href={href}>
      <div className="relative w-full h-44 bg-red-300 rounded-lg shadow-lg hover:shadow-sm cursor-pointer">
        <Image
          src={image}
          layout="fill"
          objectFit="cover"
          className="rounded-b-lg"
        />
        <div className="absolute bottom-0 left-0 right-0 ">
          <h4 className="font-bold bg-blue-200 p-1 rounded-b-lg text-sm text-black">
            {title}
          </h4>
        </div>
      </div>
    </Link>
  )
}
