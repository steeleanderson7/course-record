import { requireActiveGroup } from "@/lib/supabase/guards";
import { getUserGroupsDetailed } from "@/lib/queries";
import { Reveal } from "@/components/Reveal";
import { GroupsClient } from "./GroupsClient";

export default async function GroupsPage() {
  const { supabase, user, group: activeGroup } = await requireActiveGroup();
  const groups = await getUserGroupsDetailed(supabase, user.id, activeGroup.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-5 md:space-y-8 md:px-8 md:py-10">
      <Reveal className="space-y-1">
        <h1 className="font-heading text-2xl font-bold md:text-[32px]">Your Groups</h1>
        <p className="text-sm text-muted-foreground md:text-[15px]">
          You&apos;re in {groups.length} group{groups.length === 1 ? "" : "s"} · switch anytime to see
          that group&apos;s map and leaderboard
        </p>
      </Reveal>

      <GroupsClient groups={groups} currentUserId={user.id} />
    </div>
  );
}
