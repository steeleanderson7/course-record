import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { NavBar } from "@/components/layout/NavBar";
import { BadgeCelebrationProvider } from "@/components/badges/BadgeCelebrationProvider";
import { getNavContext } from "@/lib/supabase/guards";
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
          <main className="flex flex-1 flex-col">{children}</main>
        </BadgeCelebrationProvider>
      </body>
    </html>
  );
}
