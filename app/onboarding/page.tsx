"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createGroup, redeemInvite } from "@/app/actions/groups";

export default function OnboardingPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"join" | "create" | null>(null);

  async function handleJoin() {
    setLoading("join");
    setError(null);
    try {
      await redeemInvite(inviteCode.trim());
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
      await createGroup(groupName.trim());
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Join or create a group</h1>
          <p className="text-sm text-muted-foreground">
            Rounds and records are scoped to a friend group. You can join more than one.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite">Have an invite code?</Label>
          <div className="flex gap-2">
            <Input
              id="invite"
              placeholder="e.g. 7XQ2KD"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <Button variant="outline" onClick={handleJoin} disabled={!inviteCode || !!loading}>
              {loading === "join" ? "Joining..." : "Join"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="group-name">Start a new group</Label>
          <Input
            id="group-name"
            placeholder="Weekend Warriors"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!groupName || !!loading}
          >
            {loading === "create" ? "Creating..." : "Create group"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
}
