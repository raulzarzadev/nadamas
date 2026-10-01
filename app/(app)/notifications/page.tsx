import NotificationsList from '@comps/notifications/NotificationsList'
import SchoolInvitations from '@comps/notifications/SchoolInvitations'

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Notificaciones</h1>
      <SchoolInvitations />
      <NotificationsList />
    </div>
  )
}
