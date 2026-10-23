import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { Reveal } from "@/components/Reveal";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { getGroupMembersDetailed } from "@/lib/queries";
import { BRAND_COLORS } from "@/lib/colors";

// NOTE: email invites + a "Pending" section (from courserecord-friends.html)
// are deferred — they need new schema plus a transactional email provider
// we haven't set up. This ships the link/invite-code flow, which the
// backend already fully supports.
export default async function FriendsPage() {
  const { supabase, user, group } = await requireActiveGroup();
  const members = await getGroupMembersDetailed(supabase, group.id, user.id, group.created_by);
  const inviteUrl = `courserecord.golf/join/${group.invite_code}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7 px-8 py-10">
      <div className="space-y-1">
        <h1 className="font-heading text-[32px] font-bold">Friends</h1>
        <p className="text-[15px] text-muted-foreground">
          {group.name} · {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </div>

      <Reveal>
        <Card className="space-y-3 p-7">
          <p className="text-sm font-bold">Invite a friend</p>
          <p className="text-xs text-muted-foreground">Share this link — anyone with it can join.</p>
          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="font-mono text-sm" />
            <CopyButton text={inviteUrl} />
          </div>
        </Card>
      </Reveal>

      <Reveal delay={80}>
        <Card className="divide-y p-0">
          <div className="p-6 pb-0">
            <p className="font-heading text-[22px] font-bold">Members</p>
            <p className="text-sm text-muted-foreground">
              {members.length} friend{members.length === 1 ? "" : "s"} battling for course records
            </p>
          </div>
          <div className="divide-y divide-border">
            {members.map((m, i) => {
              const isYou = m.id === user.id;
              return (
                <Reveal key={m.id} delay={100 + i * 40}>
                  <Link
                    href={`/profile/${m.id}`}
                    className={`flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/40 ${
                      isYou ? "bg-primary/5" : ""
                    }`}
                  >
                <div className="flex items-center gap-3.5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold"
                    style={{
                      backgroundColor: m.color,
                      color: isYou ? BRAND_COLORS.ink : "#fff",
                    }}
                  >
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {m.name}
                      {isYou ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.isCreator ? "Group creator" : "Joined"}{" "}
                      {new Date(m.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">
                  {m.recordsHeld} record{m.recordsHeld === 1 ? "" : "s"}
                </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
