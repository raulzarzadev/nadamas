import MemberDetails from "@comps/User/MemberDetails";
import { useRouter } from "next/router";

export default function details() {
    const { query: { id: teamId, memberId } } = useRouter();
    return <MemberDetails memberId={memberId} teamId={teamId} />
}