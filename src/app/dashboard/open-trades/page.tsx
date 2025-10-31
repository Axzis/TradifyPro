import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function OpenTradesPage() {
  return (
    <div>
      <DashboardHeader 
        title="Posisi Terbuka"
        description="Pantau dan kelola semua trade Anda yang masih aktif."
      />
       <div className="mt-8">
        <p>Halaman posisi terbuka sedang dalam pengembangan.</p>
      </div>
    </div>
  );
}
