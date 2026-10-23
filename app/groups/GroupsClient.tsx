"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Reveal } from "@/components/Reveal";
import { createGroup, redeemInvite, setActiveGroup } from "@/app/actions/groups";
import { BRAND_COLORS } from "@/lib/colors";
import type { GroupSummary } from "@/lib/queries";

export function GroupsClient({ groups, currentUserId }: { groups: GroupSummary[]; currentUserId: string }) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function handleSwitch(groupId: string) {
    setLoading(groupId);
    setError(null);
    try {
      await setActiveGroup(groupId);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch groups.");
      setLoading(null);
    }
  }

  async function handleJoin() {
    setLoading("join");
    setError(null);
    try {
      const groupId = await redeemInvite(inviteCode.trim());
      await setActiveGroup(groupId);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join that group.");
      setLoading(null);
    }
  }

  async function handleCreate() {
    setLoading("create");
    setError(null);
    try {
      const groupId = await createGroup(groupName.trim());
      await setActiveGroup(groupId);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {groups.map((g, i) => (
          <Reveal key={g.id} delay={i * 60}>
            <div
              className={`hover-lift flex flex-wrap items-center justify-between gap-5 rounded-[14px] border bg-card p-6 ${
                g.isActive ? "border-2 border-primary" : "border-border"
              }`}
            >
              <div className="flex items-center gap-4.5">
                <div className="flex">
                  {g.members.slice(0, 4).map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card text-sm font-bold"
                      style={{
                        backgroundColor: m.color,
                        color: m.id === currentUserId ? BRAND_COLORS.ink : "#fff",
                        marginLeft: idx === 0 ? 0 : -12,
                      }}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-heading text-[19px] font-bold">{g.name}</span>
                    {g.isActive && (
                      <span className="rounded-full border border-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · your rank #{g.yourRank || "—"} ·{" "}
                    {g.yourRecords} record{g.yourRecords === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {g.isActive ? (
                <a href="/friends" className="text-sm font-bold hover:text-primary">
                  View group →
                </a>
              ) : (
                <Button variant="outline" onClick={() => handleSwitch(g.id)} disabled={!!loading}>
                  {loading === g.id ? "Switching..." : "Switch to this group"}
                </Button>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={groups.length * 60 + 60} className="flex flex-wrap gap-4">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-lift py-3 text-sm">+ Create a New Group</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Start a new group</DialogTitle>
              <DialogDescription>Give your friend group a name — you can invite people after.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                placeholder="Weekend Warriors"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!groupName || !!loading} className="w-full">
                {loading === "create" ? "Creating..." : "Create group"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="hover-lift py-3 text-sm">
              Join a Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Join a group</DialogTitle>
              <DialogDescription>Enter the invite code a friend shared with you.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="invite-code">Invite code</Label>
              <Input
                id="invite-code"
                placeholder="e.g. 7XQ2KD"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button onClick={handleJoin} disabled={!inviteCode || !!loading} className="w-full">
                {loading === "join" ? "Joining..." : "Join group"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Reveal>
    </div>
  );
}
