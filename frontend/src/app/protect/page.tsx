import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/app/ui";
import { ProtectFlow } from "@/components/protect/ProtectFlow";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Protect new artwork — ${SITE_NAME}`,
  robots: { index: false },
};

export default function ProtectPage() {
  return (
    <AuthGate>
      <AppShell width="narrow">
        <ProtectFlow />
      </AppShell>
    </AuthGate>
  );
}
