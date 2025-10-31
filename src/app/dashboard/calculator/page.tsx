'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { useCollection } from '@/hooks/use-firestore';
import type { Trade } from '@/types/trade';
import type { EquityTransaction } from '@/types/equity';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Scale } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';


const calculatePnl = (trade: Trade) => {
    if (trade.exitPrice === null || trade.exitPrice === undefined) return 0;
    const pnlPerUnit = trade.exitPrice - trade.entryPrice;
    const totalPnl = pnlPerUnit * trade.positionSize;
    return trade.position === "Short" ? totalPnl * -1 : totalPnl;
};

const calculatorSchema = z.object({
  totalEquity: z.coerce.number().positive('Ekuitas harus positif'),
  riskPercentage: z.coerce.number().min(0.1, 'Risiko min 0.1%').max(100, 'Risiko maks 100%'),
  entryPrice: z.coerce.number().positive('Harga masuk harus positif'),
  stopLossPrice: z.coerce.number().positive('Stop loss harus positif'),
});

type CalculatorFormData = z.infer<typeof calculatorSchema>;

export default function CalculatorPage() {
  const { user } = useAuth();

  const { data: rawTrades, loading: tradesLoading } = useCollection<Trade>(
    user ? `users/${user.uid}/trades` : ''
  );
  const { data: rawEquityTxs, loading: equityLoading } = useCollection<EquityTransaction>(
    user ? `users/${user.uid}/equityTransactions` : ''
  );

  const currentEquity = useMemo(() => {
    if (!rawEquityTxs || !rawTrades) return 0;
    
    const totalDeposits = rawEquityTxs
      .filter((tx) => tx.type === 'deposit')
      .reduce((acc, tx) => acc + tx.amount, 0);
      
    const totalWithdraws = rawEquityTxs
      .filter((tx) => tx.type === 'withdraw')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const totalNetPnL = rawTrades.filter(t => t.closeDate).reduce(
      (acc, trade) => acc + calculatePnl(trade),
      0
    );

    return totalDeposits - totalWithdraws + totalNetPnL;
  }, [rawEquityTxs, rawTrades]);

  const form = useForm<CalculatorFormData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      totalEquity: 0,
      riskPercentage: 1,
      entryPrice: undefined,
      stopLossPrice: undefined,
    },
  });

  const { setValue, watch } = form;
  const watchedValues = watch();

  useEffect(() => {
    if (currentEquity > 0) {
      setValue('totalEquity', parseFloat(currentEquity.toFixed(2)));
    }
  }, [currentEquity, setValue]);

  const results = useMemo(() => {
    const { totalEquity, riskPercentage, entryPrice, stopLossPrice } = watchedValues;
    if (!totalEquity || !riskPercentage || !entryPrice || !stopLossPrice) {
      return { riskAmountUSD: 0, positionSize: 0 };
    }

    const riskAmountUSD = totalEquity * (riskPercentage / 100);
    const riskPerUnit = Math.abs(entryPrice - stopLossPrice);

    if (riskPerUnit === 0) {
      return { riskAmountUSD, positionSize: 0 };
    }

    const positionSize = riskAmountUSD / riskPerUnit;

    return {
      riskAmountUSD,
      positionSize,
    };
  }, [watchedValues]);

  const formatCurrencyUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  const isLoading = equityLoading || tradesLoading;

  return (
    <div className="space-y-8">
      <DashboardHeader 
        title="Kalkulator"
        description="Hitung ukuran posisi, risiko, dan lainnya."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Hitung Ukuran Posisi</CardTitle>
            <CardDescription>
              Masukkan parameter trade Anda untuk menghitung ukuran posisi yang optimal berdasarkan toleransi risiko Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalEquity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Ekuitas (USD)</FormLabel>
                        <FormControl>
                          {isLoading ? (
                             <Skeleton className="h-10 w-full" />
                          ) : (
                            <Input type="number" step="any" {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="riskPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risiko per Trade (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="entryPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Masuk (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} placeholder="cth: 150.25" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stopLossPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Stop Loss (USD)</FormLabel>
                        <FormControl>
                          <Input type="number" step="any" {...field} placeholder="cth: 148.75" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Hasil Perhitungan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Jumlah Risiko
              </span>
              <span className="text-lg font-bold">
                {formatCurrencyUSD(results.riskAmountUSD)}
              </span>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Ukuran Posisi
              </span>
              <span className="text-lg font-bold">
                {results.positionSize.toFixed(4)} Unit
              </span>
            </div>
            
             <Separator />
             
             <p className="text-xs text-muted-foreground">
               *Perhitungan ini adalah 'Unit' murni (misal: lembar saham, koin kripto). 
               Untuk Forex, Anda perlu membaginya dengan ukuran kontrak (cth: 100,000) untuk mendapatkan Lot standar.
             </p>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}