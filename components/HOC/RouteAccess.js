import { useUser } from "@/context/UserContext"

export default function RouteAccess({ allowAccessTo = [], children }) {
    const { user: { isAdmin, id } } = useUser()
    if (!allowAccessTo.includes('admin')) {
        if (isAdmin) return children
    }
    if (!allowAccessTo.includes('user')) {
        if (id) return children
    }

}