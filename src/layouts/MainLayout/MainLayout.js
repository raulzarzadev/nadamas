import Button from '@/src/Button'
import { BackIcon } from '@/src/utils/Icons'
import { useRouter } from 'next/router'
import s from './styles.module.css'

export default function MainLayout({ children, user }) {
  return (
    <div className={s.mainlayout}>
      <Header user={user} />
      <main className={s.main}>{children}</main>
      <Footer user={user} />
    </div>
  )
}
const Header = ({ user }) => {
  return <div className={s.header}>Header</div>
}

const Footer = ({ user }) => {
  const router = useRouter()
  const handleBack = () => {
    router.back()
  }
  return (
    <div className={s.footer}>
      <div>
        <Button onClick={handleBack}>
          <BackIcon />
        </Button>
      </div>
      {user && <div>{user.name}</div>}
    </div>
  )
}
