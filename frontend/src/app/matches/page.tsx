import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/app/ui";
import { MatchesPage } from "@/components/matches/MatchesPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Matches — ${SITE_NAME}`,
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <AppShell>
        <MatchesPage />
      </AppShell>
    </AuthGate>
  );
}
