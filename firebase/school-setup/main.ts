import { getAuthed } from '@/lib/client/authed-api'
import type { SchoolSetupSnapshot } from '@/lib/school-setup'

class SchoolSetup {
  async get(schoolId: string): Promise<SchoolSetupSnapshot> {
    return (await getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/setup`, 15000)).json()
  }
}
export const SchoolSetupCRUD = new SchoolSetup()
