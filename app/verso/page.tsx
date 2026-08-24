import { TenantHome } from "@/app/components/tenant-home";
import { TENANTS } from "@/app/lib/tenant";

export default function VersoPage() {
  return <TenantHome tenantName={TENANTS.verso.name} />;
}
