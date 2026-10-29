'use client'
import type { ClassTrainingBlock } from '@/lib/class-training'
import ClassTrainingEditor from './ClassTrainingEditor'
export default function SharedSessionView({ blocks }: { blocks: ClassTrainingBlock[] }) {
  return <ClassTrainingEditor blocks={blocks} readOnly onChange={() => {}} />
}
