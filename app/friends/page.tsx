import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/CopyButton";
import { Reveal } from "@/components/Reveal";
import { InitialAvatar } from "@/components/InitialAvatar";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { getGroupMembersDetailed } from "@/lib/queries";
import { getSiteOrigin } from "@/lib/url";

// NOTE: email invites + a "Pending" section (from courserecord-friends.html)
// are deferred — they need new schema plus a transactional email provider
// we haven't set up. This ships the link/invite-code flow, which the
// backend already fully supports.
export default async function FriendsPage() {
  const { supabase, user, group } = await requireActiveGroup();
  const [members, origin] = await Promise.all([
    getGroupMembersDetailed(supabase, group.id, user.id, group.created_by),
    getSiteOrigin(),
  ]);
  // Was hardcoded to "courserecord.golf" (a domain we don't actually point
  // anywhere) — now reflects whatever domain is actually serving the
  // request, so it keeps working if a custom domain gets added later.
  const inviteUrl = `${origin}/join/${group.invite_code}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-5 md:space-y-7 md:px-8 md:py-10">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold md:text-[32px]">Friends</h1>
        <p className="text-sm text-muted-foreground md:text-[15px]">
          {group.name} · {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </div>

      <Reveal>
        <Card className="space-y-3 p-5 md:p-7">
          <p className="text-sm font-bold">Invite a friend</p>
          <p className="text-xs text-muted-foreground">Share this link — anyone with it can join.</p>
          {/* Stacked on mobile — a long invite URL in a monospace input
              crowds a Copy button when squeezed onto the same row at phone
              width, and a full-width Copy button below is an easier target
              one-handed anyway. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={inviteUrl} className="min-w-0 font-mono text-sm" />
            <CopyButton text={inviteUrl} className="min-h-11 w-full sm:w-auto" />
          </div>
        </Card>
      </Reveal>

      <Reveal delay={80}>
        <Card className="divide-y p-0">
          <div className="p-5 pb-0 md:p-6 md:pb-0">
            <p className="font-heading text-xl font-bold md:text-[22px]">Members</p>
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
                    className={`flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 md:px-6 ${
                      isYou ? "bg-primary/5" : ""
                    }`}
                  >
                <div className="flex items-center gap-3.5">
                  <InitialAvatar name={m.name} color={m.color} isSelf={isYou} className="h-11 w-11" />
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
