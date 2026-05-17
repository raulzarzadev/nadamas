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

export default function CoachProfilePage() {
	const { user } = useUser() as { user: any };
	const uid = user?.uid || user?.id;
	const [pub, setPub] = useState<CoachPublic | null | undefined>(undefined);
	const [priv, setPriv] = useState<CoachPrivate | null | undefined>(undefined);
	const [savingSection, setSavingSection] = useState<string | null>(null);

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
		} finally {
			setSavingSection(null);
		}
	};

	return (
		<div className="flex flex-col gap-4 sm:gap-6">
			<h1 className="text-2xl font-extrabold sm:text-3xl">
				Mi perfil de coach
			</h1>

			<ScoreCard verification={pubVal.verification} />

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
