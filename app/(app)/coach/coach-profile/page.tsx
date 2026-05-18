"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { CoachCRUD } from "@/firebase/coaches/main";
import { computeAutoScore } from "@/lib/coach-score";
import type {
	CoachPublic,
	CoachPrivate,
	CoachVerification,
} from "@/firebase/coaches/coach.model";
import SkillsCard from "@comps/coach/SkillsCard";
import MediaCard from "@comps/coach/MediaCard";
import LinksCard from "@comps/coach/LinksCard";
import PrivateCard from "@comps/coach/PrivateCard";
import LocationsCard from "@comps/coach/LocationsCard";
import PricingCard from "@comps/coach/PricingCard";
import ScoreCard from "@comps/coach/ScoreCard";
import Loading from "@comps/Loading";
import { postAuthed } from "@/lib/client/authed-api";

export default function CoachProfilePage() {
	const { user } = useUser() as { user: any };
	const uid = user?.uid || user?.id;
	const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined);
	const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined);
	const [savingSection, setSavingSection] = useState<string | null>(null);
	const [verificationRequestError, setVerificationRequestError] = useState<string | null>(null);

	useEffect(() => {
		if (!uid) return;
		const u1 = CoachCRUD.listenPublic(uid, setPub);
		const u2 = CoachCRUD.listenPrivate(uid, setPriv);
		return () => {
			u1 && u1();
			u2 && u2();
		};
	}, [uid]);

	if (!uid || pub === undefined || priv === undefined) return <Loading />;

	const pubVal = pub || {};
	const privVal = priv || {};

	// Recompute autoScore from the FULL profile (public completeness +
	// private doc counts) and persist it on the public doc, preserving
	// status + admin override.
	const recomputeScore = (
		nextPub: CoachPublic,
		nextPriv: CoachPrivate,
	): CoachVerification => {
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
		});
		const prev = nextPub.verification;
		return {
			status: prev?.status ?? "pending",
			autoScore,
			...(prev?.adminScoreOverride !== undefined
				? { adminScoreOverride: prev.adminScoreOverride }
				: {}),
		};
	};

	const savePublic = async (section: string, partial: Partial<CoachPublic>) => {
		setSavingSection(section);
		try {
			const merged: CoachPublic = { ...pubVal, ...partial };
			const verification = recomputeScore(merged, privVal);
			await CoachCRUD.upsertPublic(uid, { ...partial, verification });
		} finally {
			setSavingSection(null);
		}
	};

	const savePrivate = async (
		section: string,
		partial: Partial<CoachPrivate>,
	) => {
		setSavingSection(section);
		try {
			const mergedPriv: CoachPrivate = { ...privVal, ...partial };
			const verification = recomputeScore(pubVal, mergedPriv);
			await CoachCRUD.upsertPrivate(uid, partial);
			await CoachCRUD.upsertPublic(uid, { verification });
			if (
				partial.identityVerification?.status === "pending" &&
				privVal.identityVerification?.status !== "pending"
			) {
				await postAuthed("/api/notifications/verification-requested");
				await CoachCRUD.upsertPrivate(uid, {
					identityVerification: {
						...partial.identityVerification,
						notificationSentAt: Date.now(),
					},
				});
			}
		} finally {
			setSavingSection(null);
		}
	};

	const identityVerification = privVal.identityVerification;
	const gallery = pubVal.galleryPhotos || [];
	const hasFacePhoto = !!(
		pubVal.facePhoto?.url || gallery.find((photo) => photo.label === "Yo")?.url
	);
	const hasLocation = !!pubVal.teachingLocations?.length;
	const hasBio = !!pubVal.bio?.trim();
	const hasMetrics = !!pubVal.metrics && Object.keys(pubVal.metrics).length > 0;
	const hasIne = !!identityVerification?.document?.url;
	const missingItems = [
		!hasMetrics && "Carta de estilo",
		!hasBio && "Bio corta",
		!hasFacePhoto && "Foto tuya",
		!hasLocation && "Lugar y horarios",
		!hasIne && "INE",
	].filter(Boolean) as string[];

	const requestVerification = async () => {
		setVerificationRequestError(null);
		if (!identityVerification?.document?.url) {
			const section = document.getElementById("coach-verification-documents");
			section?.scrollIntoView({ behavior: "smooth", block: "center" });
			const toggle = section?.querySelector("button");
			if (toggle?.getAttribute("aria-expanded") === "false") {
				(toggle as HTMLButtonElement).click();
			}
			return;
		}

		try {
			if (identityVerification.status === "pending") {
				await postAuthed("/api/notifications/verification-requested");
				await CoachCRUD.upsertPrivate(uid, {
					identityVerification: {
						...identityVerification,
						notificationSentAt: Date.now(),
					},
				});
				return;
			}

			await savePrivate("private", {
				identityVerification: {
					...identityVerification,
					status: "pending",
					submittedAt: identityVerification.submittedAt || Date.now(),
				},
			});
		} catch {
			setVerificationRequestError("No pudimos enviar la solicitud. Inténtalo de nuevo.");
		}
	};

	return (
		<div className="flex flex-col gap-4 sm:gap-6">
			<h1 className="text-2xl font-extrabold sm:text-3xl">
				Mi perfil de coach
			</h1>

			<ScoreCard
				verification={pubVal.verification}
				identityStatus={identityVerification?.status}
				missingItems={missingItems}
				onRequestVerification={requestVerification}
				requesting={savingSection === "private"}
				requestError={verificationRequestError}
			/>

			<SkillsCard
				value={pubVal.metrics}
				saving={savingSection === "metrics"}
				onSave={(metrics) => savePublic("metrics", { metrics })}
			/>

			<LocationsCard
				uid={uid}
				value={{
					teachingLocations: pubVal.teachingLocations,
					galleryPhotos: pubVal.galleryPhotos,
				}}
				saving={savingSection === "locations"}
				onSave={(v) => savePublic("locations", v)}
			/>

			<MediaCard
				uid={uid}
				value={{
					galleryPhotos: pubVal.galleryPhotos,
					facePhoto: pubVal.facePhoto,
					workplacePhotos: pubVal.workplacePhotos,
					achievementPhotos: pubVal.achievementPhotos,
				}}
				saving={savingSection === "media"}
				onSave={(v) => savePublic("media", v)}
			/>

			<LinksCard
				value={{
					bio: pubVal.bio,
					publicLinks: pubVal.publicLinks,
					socials: pubVal.socials,
				}}
				saving={savingSection === "links"}
				onSave={(v) => savePublic("links", v)}
			/>

			<PrivateCard
				uid={uid}
				value={{
					identityVerification: privVal.identityVerification,
				}}
				saving={savingSection === "private"}
				onSave={(v) => savePrivate("private", v)}
			/>

			<PricingCard
				value={{
					priceOptions: pubVal.priceOptions,
				}}
				saving={savingSection === "pricing"}
				onSave={(v) => savePublic("pricing", v)}
			/>
		</div>
	);
}
