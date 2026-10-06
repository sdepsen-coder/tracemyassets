import { AuthGate } from "@/components/AuthGate";
import { AdminApp } from "@/components/admin/AdminApp";

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminApp />
    </AuthGate>
  );
}
