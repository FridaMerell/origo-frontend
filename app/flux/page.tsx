import { TenantHome } from "@/app/components/tenant-home";
import { TENANTS } from "@/app/lib/tenant";

export default function FluxPage() {
  return <TenantHome tenantName={TENANTS.flux.name} />;
}
