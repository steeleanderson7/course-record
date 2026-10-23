import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { redeemInvite, setActiveGroup } from "@/app/actions/groups";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";

/**
 * Landing page for the shareable invite link from the Friends page
 * (courserecord.golf/join/{code}). This route didn't exist before — the
 * link rendered on /friends pointed here but 404'd for anyone who clicked
 * it.
 *
 * Signed-in visitors redeem the code immediately. Signed-out visitors get
 * a neutral "log in or sign up" choice (not assumed to be new — an
 * existing friend group member could be clicking this from a new device)
 * with the code carried forward via ?invite=; both app/login and
 * app/signup read that param and redeem it right after auth succeeds. For
 * a brand-new signup that requires email confirmation, there's no session
 * yet to redeem with — app/signup instead sets emailRedirectTo to this
 * same /join/{code} URL, so confirming the email lands the now-authenticated
 * user right back on this page's signed-in branch.
 */
export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthSplitLayout
        leftContent={
          <div className="flex flex-col gap-4">
            <h1 className="font-heading text-[30px] font-bold leading-tight text-sidebar-foreground">
              You&apos;ve been invited to a group.
            </h1>
            <p className="max-w-[300px] text-[15px] leading-relaxed text-sidebar-foreground/80">
              Sign up or log in to accept and start battling your friends for course records.
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-2xl font-bold">Join the group</h2>
          <span className="text-sm text-muted-foreground">
            We&apos;ll add you to the group automatically once you&apos;re signed in.
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild className="hover-lift py-3 text-[15px]">
            <Link href={`/signup?invite=${encodeURIComponent(code)}`}>Create an account</Link>
          </Button>
          <Button asChild variant="outline" className="py-3 text-[15px]">
            <Link href={`/login?invite=${encodeURIComponent(code)}`}>I already have an account</Link>
          </Button>
        </div>
      </AuthSplitLayout>
    );
  }

  try {
    const groupId = await redeemInvite(code);
    // Explicit, rather than relying on requireActiveGroup's fallback — a
    // visitor who already belongs to a different group should still land
    // on the group they just joined via this specific link, not whichever
    // group happened to be active before.
    await setActiveGroup(groupId);
  } catch (err) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-heading text-2xl font-bold">That invite link didn&apos;t work</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {err instanceof Error ? err.message : "This invite code may be invalid or expired."}
        </p>
        <Button asChild>
          <Link href="/dashboard">Go to your dashboard</Link>
        </Button>
      </div>
    );
  }

  redirect("/dashboard");
}
