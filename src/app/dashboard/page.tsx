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
import { useState } from "react";

const kpiData = [
  { title: "Total P/L", value: "$7,230.50", change: "+15.2%", isPositive: true },
  { title: "Win Rate", value: "62.5%", change: "-2.1%", isPositive: false },
  { title: "Avg. R-Multiple", value: "1.8R", change: "+0.2R", isPositive: true },
  { title: "Total Trades", value: "48", change: "+5", isPositive: true },
];

const chartData = [
  { date: "Jan", equity: 10000 },
  { date: "Feb", equity: 10500 },
  { date: "Mar", equity: 10300 },
  { date: "Apr", equity: 11200 },
  { date: "May", equity: 11800 },
  { date: "Jun", equity: 12500 },
  { date: "Jul", equity: 13100 },
];

export default function DashboardPage() {
  const [isEquityVisible, setIsEquityVisible] = useState(true);

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isEquityVisible ? kpi.value : '••••••'}
              </div>
              <p className={`text-xs ${kpi.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {kpi.change} dari periode sebelumnya
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
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
                tickFormatter={(value) => isEquityVisible ? `$${value / 1000}k` : '••••'}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex flex-col">
                            <span className="text-xs uppercase text-muted-foreground">Equity</span>
                            <span className="font-bold text-foreground">
                              {isEquityVisible ? payload[0].value?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '••••••'}
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