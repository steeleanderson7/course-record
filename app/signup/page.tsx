"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { createClient } from "@/lib/supabase/client";
import { redeemInvite, setActiveGroup } from "@/app/actions/groups";

const BENEFITS = [
  "Log the rounds you actually play",
  "Battle friends for course records",
  "Claim your territory on the map",
];

export default function SignupPage() {
  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        // If email confirmation is required below, there's no session yet
        // to redeem the invite with — route the confirmation link itself
        // back through /join/{code}, which redeems it once the user lands
        // there authenticated.
        emailRedirectTo: inviteCode
          ? `${window.location.origin}/join/${encodeURIComponent(inviteCode)}`
          : undefined,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      if (inviteCode) {
        try {
          const groupId = await redeemInvite(inviteCode);
          await setActiveGroup(groupId);
          router.push("/dashboard");
          router.refresh();
          return;
        } catch {
          // Invalid/expired code shouldn't block the account that was just
          // created — fall through to onboarding so they can still join or
          // create a group manually.
        }
      }
      router.push("/onboarding");
      router.refresh();
      return;
    }

    // Email confirmation is enabled on this project — no session until
    // the user clicks the link in their inbox.
    setCheckEmail(true);
    setLoading(false);
  }

  const leftContent = (
    <div className="flex flex-col gap-7">
      <h1 className="font-heading text-[30px] font-bold leading-tight text-sidebar-foreground">
        Every round is a shot at the record.
      </h1>
      <div className="flex flex-col gap-4">
        {BENEFITS.map((b) => (
          <div key={b} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary">
              <Check className="h-3 w-3 text-primary" strokeWidth={3} />
            </span>
            <span className="text-sm text-sidebar-foreground/85">{b}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (checkEmail) {
    return (
      <AuthSplitLayout leftContent={leftContent}>
        <div className="motion-safe:animate-in motion-safe:fade-in flex flex-col gap-2 text-center">
          <h2 className="font-heading text-2xl font-bold">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to {email}. Click it, then come back and log in.
          </p>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout leftContent={leftContent}>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-bold">Create your account</h2>
        <span className="text-sm text-muted-foreground">Start logging rounds and claiming records.</span>
      </div>

      <GoogleButton />

      <div className="flex items-center gap-3.5">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Avery Collins" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="hover-lift mt-1 py-3 text-[15px]">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        By creating an account you agree to the Terms of Service and Privacy Policy.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-foreground hover:text-primary">
          Log in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
