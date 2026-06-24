'use client'
import LinksCard from '@comps/coach/LinksCard'
import MediaCard from '@comps/coach/MediaCard'
import OfferingsCard from '@comps/coach/OfferingsCard'
import PersonalDataCard from '@comps/coach/PersonalDataCard'
import ScoreCard from '@comps/coach/ScoreCard'
import SkillsCard from '@comps/coach/SkillsCard'
import Loading from '@comps/Loading'
import PublicLinkEditor from '@comps/profile/PublicLinkEditor'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import type { CoachPrivate, CoachPublic, CoachVerification } from '@/firebase/coaches/coach.model'
import { CoachCRUD } from '@/firebase/coaches/main'
import { postAuthed } from '@/lib/client/authed-api'
import { coachMissingItems } from '@/lib/coach-completeness'
import { computeAutoScore } from '@/lib/coach-score'

export default function CoachProfilePage() {
  const { user } = useUser() as { user: any }
  const uid = user?.uid || user?.id
  const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined)
  const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [requestingVerification, setRequestingVerification] = useState(false)
  const [verificationRequestError, setVerificationRequestError] = useState<string | null>(null)

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
  const recomputeScore = (nextPub: CoachPublic, nextPriv: CoachPrivate): CoachVerification => {
    const autoScore = computeAutoScore({
      skills: nextPub.skills,
      metrics: nextPub.metrics,
      bio: nextPub.bio,
      galleryPhotos: nextPub.galleryPhotos,
      facePhoto: nextPub.facePhoto,
      workplacePhotos: nextPub.workplacePhotos,
      achievementPhotos: nextPub.achievementPhotos,
      identityVerification: nextPriv.identityVerification,
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

  const savePublic = async (section: string, partial: Partial<CoachPublic>) => {
    setSavingSection(section)
    try {
      const merged: CoachPublic = { ...pubVal, ...partial }
      const verification = recomputeScore(merged, privVal)
      await CoachCRUD.upsertPublic(uid, { ...partial, verification })
    } finally {
      setSavingSection(null)
    }
  }

  const savePrivate = async (section: string, partial: Partial<CoachPrivate>) => {
    setSavingSection(section)
    try {
      const mergedPriv: CoachPrivate = { ...privVal, ...partial }
      const verification = recomputeScore(pubVal, mergedPriv)
      await CoachCRUD.upsertPrivate(uid, partial)
      await CoachCRUD.upsertPublic(uid, { verification })
      if (
        partial.identityVerification?.status === 'pending' &&
        privVal.identityVerification?.status !== 'pending'
      ) {
        await postAuthed('/api/notifications/verification-requested')
        await CoachCRUD.upsertPrivate(uid, {
          identityVerification: {
            ...partial.identityVerification,
            notificationSentAt: Date.now(),
          },
        })
      }
    } finally {
      setSavingSection(null)
    }
  }

  const identityVerification = privVal.identityVerification
  const missingItems = coachMissingItems({
    pub: pubVal,
    priv: privVal,
    firstName: user?.firstName,
    lastName: user?.lastName,
  })

  const requestVerification = async () => {
    setVerificationRequestError(null)
    if (missingItems.length > 0) {
      setVerificationRequestError(
        `Antes de solicitar verificación completa: ${missingItems.join(', ')}.`
      )
      return
    }
    if (!identityVerification?.document?.url) {
      const section = document.getElementById('coach-verification-documents')
      section?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const toggle = section?.querySelector('button')
      if (toggle?.getAttribute('aria-expanded') === 'false') {
        ;(toggle as HTMLButtonElement).click()
      }
      return
    }

    try {
      setRequestingVerification(true)
      if (identityVerification.status === 'pending') {
        await postAuthed('/api/notifications/verification-requested')
        await CoachCRUD.upsertPrivate(uid, {
          identityVerification: {
            ...identityVerification,
            notificationSentAt: Date.now(),
          },
        })
        return
      }

      await savePrivate('private', {
        identityVerification: {
          ...identityVerification,
          status: 'pending',
          submittedAt: identityVerification.submittedAt || Date.now(),
        },
      })
    } catch {
      setVerificationRequestError('No pudimos enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setRequestingVerification(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Mi perfil de coach</h1>

      <ScoreCard
        verification={pubVal.verification}
        identityStatus={identityVerification?.status}
        missingItems={missingItems}
        onRequestVerification={requestVerification}
        requesting={requestingVerification}
        requestError={verificationRequestError}
        visible={pubVal.publicProfileVisible === true}
        togglingVisible={savingSection === 'visibility'}
        onToggleVisible={(next) => savePublic('visibility', { publicProfileVisible: next })}
      />

      <PublicLinkEditor />

      <PersonalDataCard
        uid={uid}
        identityValue={{ identityVerification: privVal.identityVerification }}
        savingIdentity={savingSection === 'private'}
        onSaveIdentity={(v) => savePrivate('private', v)}
      />

      <LinksCard
        value={{
          bio: pubVal.bio,
          publicLinks: pubVal.publicLinks,
          socials: pubVal.socials,
        }}
        saving={savingSection === 'links'}
        onSave={(v) => savePublic('links', v)}
      />

      <SkillsCard
        value={pubVal.metrics}
        saving={savingSection === 'metrics'}
        onSave={(metrics) => savePublic('metrics', { metrics })}
      />

      <OfferingsCard
        uid={uid}
        value={{
          classOfferings: pubVal.classOfferings,
          teachingLocations: pubVal.teachingLocations,
          priceOptions: pubVal.priceOptions,
        }}
        saving={savingSection === 'offerings'}
        onSave={(v) => savePublic('offerings', v)}
      />

      <MediaCard
        uid={uid}
        value={{
          galleryPhotos: pubVal.galleryPhotos,
          facePhoto: pubVal.facePhoto,
          workplacePhotos: pubVal.workplacePhotos,
          achievementPhotos: pubVal.achievementPhotos,
        }}
        saving={savingSection === 'media'}
        onSave={(v) => savePublic('media', v)}
      />
    </div>
  )
}
