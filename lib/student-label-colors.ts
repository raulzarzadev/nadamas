export const STUDENT_LABEL_COLORS = [
  {
    id: 'transparent',
    name: 'Transparente',
    color: 'transparent',
    background: 'transparent',
    text: '#475569',
  },
  { id: 'blue', name: 'Cielo', color: '#bfdbfe', background: '#dbeafe', text: '#1e3a8a' },
  { id: 'cyan', name: 'Turquesa', color: '#a5e5e0', background: '#d3f2ee', text: '#134e4a' },
  { id: 'green', name: 'Menta', color: '#bbdfc5', background: '#def0e2', text: '#22543d' },
  { id: 'lime', name: 'Salvia', color: '#d4ddb4', background: '#eaf0d8', text: '#3f4d23' },
  { id: 'amber', name: 'Miel', color: '#f3dfa2', background: '#fcf0cd', text: '#713f12' },
  { id: 'orange', name: 'Durazno', color: '#f5c5a8', background: '#fde6d7', text: '#7c2d12' },
  { id: 'red', name: 'Coral', color: '#edb6b4', background: '#fae0df', text: '#7f1d1d' },
  { id: 'pink', name: 'Rosa', color: '#e9bfdb', background: '#f6e0ee', text: '#701a4b' },
  { id: 'purple', name: 'Lavanda', color: '#cdbff0', background: '#eae3fa', text: '#4c1d95' },
] as const
export function studentLabelColor(id?: string) {
  return STUDENT_LABEL_COLORS.find((color) => color.id === id) || STUDENT_LABEL_COLORS[1]
}
