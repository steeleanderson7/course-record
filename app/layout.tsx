import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { NavBar } from "@/components/layout/NavBar";
import { BadgeCelebrationProvider } from "@/components/badges/BadgeCelebrationProvider";
import { getNavContext } from "@/lib/supabase/guards";
import { BRAND_COLORS } from "@/lib/colors";
import "./globals.css";

// Brand fonts (see courserecord-handoff-heritage/courserecord-brand-board.html):
// Playfair Display for headings/logo, Inter for body/UI.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CourseRecord.golf",
  description: "Log the rounds you actually play, battle your friends for course records, and watch your territory grow with every win.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CourseRecord",
  },
};

// No explicit width/initial-scale before this — Next's bare default isn't
// guaranteed to disable the iOS zoom-on-input-focus behavior that makes a
// form-heavy flow like log-round feel broken on a phone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_COLORS.fairway,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // getNavContext is cache()-wrapped (lib/supabase/guards.ts), so calling it
  // here in addition to NavBar's own internal call collapses into one real
  // auth.getUser() round trip per request, not two.
  const { user } = await getNavContext();

  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BadgeCelebrationProvider viewerId={user?.id ?? null}>
          <NavBar />
          {/* Bottom padding clears the fixed mobile tab bar (NavBar renders
              it for signed-in users, md:hidden) so it never covers page
              content — harmless no-op on the rare case a signed-in user
              lands on a bespoke-header route that skips the tab bar too. */}
          <main className={`flex flex-1 flex-col ${user ? "pb-20 md:pb-0" : ""}`}>{children}</main>
        </BadgeCelebrationProvider>
      </body>
    </html>
  );
}
