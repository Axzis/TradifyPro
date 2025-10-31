'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc } from '@/hooks/use-firestore';
import type { Trade } from '@/types/trade';
import NewTradeForm from '@/components/forms/new-trade-form';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default function EditTradePage() {
  const router = useRouter();
  const params = useParams();
  const { tradeId } = params;

  const { data: trade, loading } = useDoc<Trade>(`trades/${tradeId}`);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!trade) {
    return <div>Trade tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
       <DashboardHeader 
        title="Edit Trade"
        description={`Memperbarui detail untuk trade ${trade.ticker}`}
       />
      <NewTradeForm 
        tradeToEdit={trade} 
        onFormSubmit={() => router.push('/dashboard/trade-history')} 
      />
    </div>
  );
}

    