'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { CoachCRUD } from '@/firebase/coaches/main'
import { computeAutoScore } from '@/lib/coach-score'
import type {
  CoachPublic,
  CoachPrivate,
  CoachVerification,
} from '@/firebase/coaches/coach.model'
import SkillsCard from '@comps/coach/SkillsCard'
import MediaCard from '@comps/coach/MediaCard'
import LinksCard from '@comps/coach/LinksCard'
import PrivateCard from '@comps/coach/PrivateCard'
import ScoreCard from '@comps/coach/ScoreCard'
import Loading from '@comps/Loading'

export default function CoachProfilePage() {
  const { user } = useUser() as { user: any }
  const uid = user?.uid || user?.id
  const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined)
  const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined)
  const [savingSection, setSavingSection] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) return
    const u1 = CoachCRUD.listenPublic(uid, setPub)
    const u2 = CoachCRUD.listenPrivate(uid, setPriv)
    return () => {
      u1 && u1()
      u2 && u2()
    }
  }, [uid])

  if (!uid || pub === undefined || priv === undefined) return <Loading />

  const pubVal = pub || {}
  const privVal = priv || {}

  // Recompute autoScore from the FULL profile (public completeness +
  // private doc counts) and persist it on the public doc, preserving
  // status + admin override.
  const recomputeScore = (
    nextPub: CoachPublic,
    nextPriv: CoachPrivate
  ): CoachVerification => {
    const autoScore = computeAutoScore({
      skills: nextPub.skills,
      bio: nextPub.bio,
      facePhoto: nextPub.facePhoto,
      workplacePhotos: nextPub.workplacePhotos,
      achievementPhotos: nextPub.achievementPhotos,
      idDocuments: nextPriv.idDocuments,
      certifications: nextPriv.certifications,
    })
    const prev = nextPub.verification
    return {
      status: prev?.status ?? 'pending',
      autoScore,
      ...(prev?.adminScoreOverride !== undefined
        ? { adminScoreOverride: prev.adminScoreOverride }
        : {}),
    }
  }

  const savePublic = async (
    section: string,
    partial: Partial<CoachPublic>
  ) => {
    setSavingSection(section)
    const merged: CoachPublic = { ...pubVal, ...partial }
    const verification = recomputeScore(merged, privVal)
    await CoachCRUD.upsertPublic(uid, { ...partial, verification })
    setSavingSection(null)
  }

  const savePrivate = async (
    section: string,
    partial: Partial<CoachPrivate>
  ) => {
    setSavingSection(section)
    const mergedPriv: CoachPrivate = { ...privVal, ...partial }
    const verification = recomputeScore(pubVal, mergedPriv)
    await CoachCRUD.upsertPrivate(uid, partial)
    await CoachCRUD.upsertPublic(uid, { verification })
    setSavingSection(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Mi perfil de coach</h1>

      <ScoreCard verification={pubVal.verification} />

      <SkillsCard
        value={pubVal.skills || {}}
        saving={savingSection === 'skills'}
        onSave={(skills) => savePublic('skills', { skills })}
      />

      <MediaCard
        uid={uid}
        value={{
          facePhoto: pubVal.facePhoto,
          workplacePhotos: pubVal.workplacePhotos,
          achievementPhotos: pubVal.achievementPhotos,
        }}
        saving={savingSection === 'media'}
        onSave={(v) => savePublic('media', v)}
      />

      <LinksCard
        value={{
          bio: pubVal.bio,
          socials: pubVal.socials,
          youtubeLinks: pubVal.youtubeLinks,
        }}
        saving={savingSection === 'links'}
        onSave={(v) => savePublic('links', v)}
      />

      <PrivateCard
        uid={uid}
        value={{
          privateContacts: privVal.privateContacts,
          idDocuments: privVal.idDocuments,
          certifications: privVal.certifications,
        }}
        saving={savingSection === 'private'}
        onSave={(v) => savePrivate('private', v)}
      />
    </div>
  )
}
