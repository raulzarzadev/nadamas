export interface SchoolAccessRequest {
  id: string
  schoolId: string
  userId: string
  name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: number
  updatedAt: number
}
