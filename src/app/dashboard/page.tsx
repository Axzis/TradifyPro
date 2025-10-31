"use client"

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-firestore";
import { useCurrency } from "@/hooks/use-currency";
import type { Trade } from "@/types/trade";
import type { EquityTransaction } from "@/types/equity";
import { Skeleton } from "@/components/ui/skeleton";

const chartData = [
  { date: "Jan", equity: 10000 },
  { date: "Feb", equity: 10500 },
  { date: "Mar", equity: 10300 },
  { date: "Apr", equity: 11200 },
  { date: "May", equity: 11800 },
  { date: "Jun", equity: 12500 },
  { date: "Jul", equity: 13100 },
];


const calculatePnl = (trade: Trade) => {
    if (trade.exitPrice === null || trade.exitPrice === undefined) return 0;
    const pnlPerUnit = trade.exitPrice - trade.entryPrice;
    const totalPnl = pnlPerUnit * trade.positionSize;
    return trade.position === "Short" ? totalPnl * -1 : totalPnl;
};


export default function DashboardPage() {
  const [isEquityVisible, setIsEquityVisible] = useState(true);
  const { user } = useAuth();
  const { rate: conversionRate, loading: rateLoading } = useCurrency();

  const { data: trades, loading: tradesLoading } = useCollection<Trade>(
    user ? `users/${user.uid}/trades` : ''
  );
  const { data: equityTransactions, loading: equityLoading } = useCollection<EquityTransaction>(
    user ? `users/${user.uid}/equityTransactions` : ''
  );

  const formatToRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
  }
  
  const formatYAxis = (value: number) => {
      if (!isEquityVisible) return '••••';
      if (value >= 1_000_000_000) {
          return `Rp${(value / 1_000_000_000).toFixed(1)}M`;
      }
      if (value >= 1_000_000) {
          return `Rp${(value / 1_000_000).toFixed(0)}jt`;
      }
      if (value >= 1_000) {
          return `Rp${(value / 1_000).toFixed(0)}rb`;
      }
      return `Rp${value}`;
  }


  const stats = useMemo(() => {
    const rate = conversionRate || 16000; // fallback rate
    const closedTrades = trades?.filter(t => t.exitPrice !== null && t.exitPrice !== undefined) || [];

    const totalPnl = closedTrades.reduce((acc, trade) => acc + calculatePnl(trade), 0) * rate;
    const totalProfit = closedTrades.filter(t => calculatePnl(t) > 0).reduce((acc, trade) => acc + calculatePnl(trade), 0) * rate;
    const totalLoss = closedTrades.filter(t => calculatePnl(t) < 0).reduce((acc, trade) => acc + calculatePnl(trade), 0) * rate;
    
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => calculatePnl(t) > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalDeposits = (equityTransactions?.filter(tx => tx.type === 'deposit').reduce((acc, tx) => acc + tx.amount, 0) || 0) * rate;
    const totalWithdraws = (equityTransactions?.filter(tx => tx.type === 'withdraw').reduce((acc, tx) => acc + tx.amount, 0) || 0) * rate;
    const equity = totalDeposits - totalWithdraws + totalPnl;
    
    return {
      totalPnl,
      totalProfit,
      totalLoss,
      winRate,
      totalTrades,
      equity
    };
  }, [trades, equityTransactions, conversionRate]);

  const kpiData = [
    { title: "Equity", value: formatToRupiah(stats.equity) },
    { title: "Total P/L", value: formatToRupiah(stats.totalPnl), isPositive: stats.totalPnl >= 0 },
    { title: "Total Profit", value: formatToRupiah(stats.totalProfit), isPositive: true },
    { title: "Total Loss", value: formatToRupiah(stats.totalLoss), isPositive: false },
    { title: "Win Rate", value: `${stats.winRate.toFixed(1)}%` },
    { title: "Total Trades", value: stats.totalTrades.toString() },
  ];
  
  const loading = tradesLoading || equityLoading || rateLoading;


  return (
    <div className="space-y-8">
      <DashboardHeader 
        title="Dashboard" 
        description="Analisis sekilas kinerja trading Anda."
        actions={
          <Button variant="ghost" size="icon" onClick={() => setIsEquityVisible(!isEquityVisible)}>
            {isEquityVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            <span className="sr-only">{isEquityVisible ? "Sembunyikan Nilai" : "Tampilkan Nilai"}</span>
          </Button>
        }
      />

      <div className="flex items-center space-x-2">
        <DatePickerWithRange />
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Aset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="saham">Saham</SelectItem>
            <SelectItem value="kripto">Kripto</SelectItem>
            <SelectItem value="forex">Forex</SelectItem>
          </SelectContent>
        </Select>
         <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Strategi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakout">Breakout</SelectItem>
            <SelectItem value="reversal">Reversal</SelectItem>
            <SelectItem value="scalping">Scalping</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-3 w-40 mt-2" />
                </CardContent>
            </Card>
        )) : kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isEquityVisible ? kpi.value : '••••••'}
              </div>
              {'isPositive' in kpi && (
                 <p className={`text-xs ${kpi.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {kpi.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kurva Ekuitas</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[350px] w-full">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => formatYAxis(value * (conversionRate || 0))}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const valueInUSD = payload[0].value as number;
                    const valueInIDR = valueInUSD * (conversionRate || 0);
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs uppercase text-muted-foreground">Equity</span>
                            <span className="font-bold text-foreground">
                              {isEquityVisible ? formatToRupiah(valueInIDR) : '••••••'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorEquity)" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
