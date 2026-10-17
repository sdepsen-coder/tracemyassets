import { AuthGate } from "@/components/AuthGate";
import { AdminApp } from "@/components/admin/AdminApp";

export default function AdminPage() {
  return (
    <AuthGate googleNext="/admin">
      <AdminApp />
    </AuthGate>
  );
}
