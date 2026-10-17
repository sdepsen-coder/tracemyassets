import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/app/ui";
import { MonitoringPage } from "@/components/monitoring/MonitoringPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Monitoring — ${SITE_NAME}`,
  robots: { index: false },
};

export default function Page() {
  return (
    <AuthGate>
      <AppShell>
        <MonitoringPage />
      </AppShell>
    </AuthGate>
  );
}
