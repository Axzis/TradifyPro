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
import type { DateRange } from "react-day-picker";
import type { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-firestore";
import { useCurrency } from "@/hooks/use-currency";
import type { Trade } from "@/types/trade";
import type { EquityTransaction } from "@/types/equity";
import { Skeleton } from "@/components/ui/skeleton";
import { ASSET_TYPES } from "@/lib/constants";


const calculatePnl = (trade: Trade) => {
    if (trade.exitPrice === null || trade.exitPrice === undefined) return 0;
    const pnlPerUnit = trade.exitPrice - trade.entryPrice;
    const totalPnl = pnlPerUnit * trade.positionSize;
    return trade.position === "Short" ? totalPnl * -1 : totalPnl;
};


export default function DashboardPage() {
  // States for filters and privacy mode
  const [isEquityVisible, setIsEquityVisible] = useState(true);
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  const [filterAssetType, setFilterAssetType] = useState<string>('all');
  const [filterStrategy, setFilterStrategy] = useState<string>('all');

  const { user } = useAuth();
  const { rate: conversionRate, loading: rateLoading } = useCurrency();

  const { data: rawTrades, loading: tradesLoading } = useCollection<Trade>(
    user ? `users/${user.uid}/trades` : ''
  );
  const { data: rawEquityTxs, loading: equityLoading } = useCollection<EquityTransaction>(
    user ? `users/${user.uid}/equityTransactions` : ''
  );
  
  const formatToRupiah = (value: number) => {
    if (isNaN(value)) value = 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
  }

  const formatToUSD = (value: number) => {
    if (isNaN(value)) value = 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
  }
  
  const formatYAxis = (value: number) => {
      if (!isEquityVisible) return '••••';
      const valueInIDR = value * (conversionRate || 16000);
      if (valueInIDR >= 1_000_000_000) {
          return `Rp${(valueInIDR / 1_000_000_000).toFixed(1)}M`;
      }
      if (valueInIDR >= 1_000_000) {
          return `Rp${(valueInIDR / 1_000_000).toFixed(0)}jt`;
      }
      if (valueInIDR >= 1_000) {
          return `Rp${(valueInIDR / 1_000).toFixed(0)}rb`;
      }
      return `Rp${valueInIDR}`;
  }

  const uniqueStrategies = useMemo(() => {
    if (!rawTrades) return [];
    const allTags = rawTrades.flatMap(trade => trade.tags || []);
    return [...new Set(allTags)];
  }, [rawTrades]);

  const analytics = useMemo(() => {
    const rate = conversionRate || 16000;
    const closedTrades = rawTrades?.filter(t => t.closeDate) || [];
    
    // 1. Filter Trades
    const filteredTrades = closedTrades.filter(trade => {
        const closeDate = (trade.closeDate as Timestamp).toDate();
        if (filterDateRange?.from && closeDate < filterDateRange.from) return false;
        if (filterDateRange?.to && closeDate > filterDateRange.to) return false;
        if (filterAssetType !== 'all' && trade.assetType !== filterAssetType) return false;
        if (filterStrategy !== 'all' && !(trade.tags || []).includes(filterStrategy)) return false;
        return true;
    });

    // 2. Calculations from filtered trades
    let totalNetPnL = 0, totalGains = 0, totalLosses = 0, totalWins = 0, totalLossesCount = 0, totalRMultiple = 0, totalInitialRisk = 0;
    const pnlPerAsset: { [key: string]: { ticker: string, pnl: number } } = {};

    for (const trade of filteredTrades) {
        const pnl = calculatePnl(trade);
        totalNetPnL += pnl;

        if (pnl > 0) {
            totalGains += pnl;
            totalWins++;
        } else {
            totalLosses += Math.abs(pnl);
            totalLossesCount++;
        }

        if (trade.stopLossPrice && trade.entryPrice && trade.positionSize) {
            const initialRiskUSD = Math.abs(trade.entryPrice - trade.stopLossPrice) * trade.positionSize;
            if (initialRiskUSD > 0) {
                totalInitialRisk += initialRiskUSD;
                totalRMultiple += (pnl / initialRiskUSD);
            }
        }
    }

    const totalTrades = filteredTrades.length;
    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const avgWin = totalWins > 0 ? totalGains / totalWins : 0;
    const avgLoss = totalLossesCount > 0 ? totalLosses / totalLossesCount : 0;
    const avgRMultiple = totalWins + totalLossesCount > 0 ? totalRMultiple / (totalWins + totalLossesCount) : 0;

    // 3. True Equity Calculation
    const totalDepositsUSD = (rawEquityTxs?.filter(tx => tx.type === 'deposit').reduce((acc, tx) => acc + tx.amount, 0) || 0);
    const totalWithdrawsUSD = (rawEquityTxs?.filter(tx => tx.type === 'withdraw').reduce((acc, tx) => acc + tx.amount, 0) || 0);
    const pnlFromAllClosedTrades = (rawTrades?.filter(t => t.closeDate).reduce((acc, trade) => acc + calculatePnl(trade), 0)) || 0;
    const currentEquity = totalDepositsUSD - totalWithdrawsUSD + pnlFromAllClosedTrades;
    
    // Equity Curve based on filtered trades + all equity txs
    const equityEvents = (rawEquityTxs || []).map(tx => ({ date: (tx.date as any).toDate(), amount: tx.type === 'deposit' ? tx.amount : -tx.amount }));
    const pnlEvents = filteredTrades.map(trade => ({ date: (trade.closeDate as any).toDate(), amount: calculatePnl(trade) }));
    const allTransactions = [...equityEvents, ...pnlEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let runningEquity = totalDepositsUSD - totalWithdrawsUSD + pnlFromAllClosedTrades - totalNetPnL; // Start from equity before the filtered period
    const equityCurve = allTransactions.map(tx => {
        runningEquity += tx.amount;
        return {
          date: tx.date.toLocaleDateString('en-CA'),
          equity: runningEquity
        };
    });

    return {
        totalPnl: totalNetPnL,
        totalProfit: totalGains,
        totalLoss: totalLosses,
        winRate,
        totalTrades,
        equity: currentEquity,
        avgWin,
        avgLoss,
        avgRMultiple,
        equityCurve,
    };
  }, [rawTrades, rawEquityTxs, conversionRate, filterDateRange, filterAssetType, filterStrategy]);

  const kpiData = [
    { title: "Equity", value: formatToRupiah(analytics.equity * (conversionRate||16000)), subValue: formatToUSD(analytics.equity), change: "" },
    { title: "Total P/L (Filtered)", value: formatToRupiah(analytics.totalPnl * (conversionRate||16000)), subValue: formatToUSD(analytics.totalPnl), isPositive: analytics.totalPnl >= 0, change: "" },
    { title: "Total Profit (Filtered)", value: formatToRupiah(analytics.totalProfit * (conversionRate||16000)), subValue: formatToUSD(analytics.totalProfit), isPositive: true, change: "" },
    { title: "Total Loss (Filtered)", value: formatToRupiah(analytics.totalLoss * (conversionRate||16000)), subValue: formatToUSD(analytics.totalLoss), isPositive: false, change: "" },
    { title: "Win Rate", value: `${analytics.winRate.toFixed(1)}%`, change: "" },
    { title: "Total Trades (Filtered)", value: analytics.totalTrades.toString(), change: "" },
    { title: "Avg. Win", value: formatToRupiah(analytics.avgWin * (conversionRate||16000)), subValue: formatToUSD(analytics.avgWin), isPositive: true },
    { title: "Avg. Loss", value: formatToRupiah(analytics.avgLoss * (conversionRate||16000)), subValue: formatToUSD(analytics.avgLoss), isPositive: false },
    { title: "Avg. R-Multiple", value: `${analytics.avgRMultiple.toFixed(2)} R`, subValue: null },
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

      <div className="flex flex-wrap items-center gap-2">
        <DatePickerWithRange onDateChange={setFilterDateRange} />
        <Select value={filterAssetType} onValueChange={setFilterAssetType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Aset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aset</SelectItem>
            {ASSET_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
         <Select value={filterStrategy} onValueChange={setFilterStrategy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Strategi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Strategi</SelectItem>
            {uniqueStrategies.map(strat => <SelectItem key={strat} value={strat}>{strat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? Array.from({ length: 9 }).map((_, i) => (
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
                {kpi.subValue === null ? kpi.value : isEquityVisible ? kpi.value : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.subValue === null ? ' ' : isEquityVisible ? kpi.subValue || kpi.change : '••••••'}
              </p>
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
            <AreaChart data={analytics.equityCurve} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => formatYAxis(value)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const valueInUSD = payload[0].value as number;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs uppercase text-muted-foreground">Equity</span>
                            <span className="font-bold text-foreground">
                              {isEquityVisible ? formatToUSD(valueInUSD) : '••••••'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                               {isEquityVisible ? formatToRupiah(valueInUSD * (conversionRate || 16000)) : '••••••'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorEquity)" dot={false} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

    