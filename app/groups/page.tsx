import { requireActiveGroup } from "@/lib/supabase/guards";
import { getUserGroupsDetailed } from "@/lib/queries";
import { Reveal } from "@/components/Reveal";
import { GroupsClient } from "./GroupsClient";

export default async function GroupsPage() {
  const { supabase, user, group: activeGroup } = await requireActiveGroup();
  const groups = await getUserGroupsDetailed(supabase, user.id, activeGroup.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-10">
      <Reveal className="space-y-1">
        <h1 className="font-heading text-[32px] font-bold">Your Groups</h1>
        <p className="text-[15px] text-muted-foreground">
          You&apos;re in {groups.length} group{groups.length === 1 ? "" : "s"} · switch anytime to see
          that group&apos;s map and leaderboard
        </p>
      </Reveal>

      <GroupsClient groups={groups} currentUserId={user.id} />
    </div>
  );
}
