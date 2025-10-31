"use client"

import { useState } from "react";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const mockTrades = [
  { id: "1", ticker: "BTC/USD", assetType: "Kripto", position: "Long", openDate: new Date(2024, 5, 1), exitPrice: 68000, pnl: 1500.50, result: "Win", tags: ["Breakout", "FOMO"] },
  { id: "2", ticker: "AAPL", assetType: "Saham", position: "Short", openDate: new Date(2024, 5, 3), exitPrice: 190.25, pnl: -250.75, result: "Loss", tags: ["Earnings Play"] },
  { id: "3", ticker: "EUR/USD", assetType: "Forex", position: "Long", openDate: new Date(2024, 5, 5), exitPrice: 1.0890, pnl: 320.00, result: "Win", tags: ["Trend Following"] },
  { id: "4", ticker: "ETH/USD", assetType: "Kripto", position: "Long", openDate: new Date(2024, 5, 6), exitPrice: 3500, pnl: -180.20, result: "Loss", tags: ["Reversal", "Mistake"] },
];

export default function TradeHistoryPage() {
  const [isEquityVisible, setIsEquityVisible] = useState(true);

  return (
    <div className="space-y-8">
      <DashboardHeader 
        title="Riwayat Trade"
        description="Tinjau dan analisis semua trade yang telah selesai."
      />
      
      <div className="flex items-center space-x-2">
        <DatePickerWithRange />
        <Select>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Aset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="saham">Saham</SelectItem>
            <SelectItem value="kripto">Kripto</SelectItem>
            <SelectItem value="forex">Forex</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Hasil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="be">Break-even</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm">
                    Tanggal Buka
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead className="text-right">P/L (USD)</TableHead>
                <TableHead className="text-center">Hasil</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-medium">{trade.ticker}</TableCell>
                  <TableCell>{format(trade.openDate, "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{trade.assetType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={trade.position === 'Long' ? 'secondary' : 'destructive'} className={trade.position === 'Long' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}>
                        {trade.position}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${trade.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isEquityVisible ? trade.pnl.toFixed(2) : '••••'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={trade.result === 'Win' ? 'default' : 'destructive'} className={trade.result === 'Win' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {trade.result}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Buka menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DialogTrigger asChild>
                            <DropdownMenuItem>Lihat Detail</DropdownMenuItem>
                          </DialogTrigger>
                          <DropdownMenuItem>Edit Trade</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50">Hapus Trade</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detail Trade: {trade.ticker}</DialogTitle>
                          <DialogDescription>
                            Trade {trade.position} pada {format(trade.openDate, "dd MMMM yyyy")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div><p className="text-muted-foreground">P/L</p><p className={`font-semibold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{trade.pnl.toFixed(2)} USD</p></div>
                                <div><p className="text-muted-foreground">Hasil</p><p className="font-semibold">{trade.result}</p></div>
                                <div><p className="text-muted-foreground">Posisi</p><p className="font-semibold">{trade.position}</p></div>
                                <div><p className="text-muted-foreground">Aset</p><p className="font-semibold">{trade.assetType}</p></div>
                           </div>
                           <Separator />
                           <div>
                                <h4 className="font-semibold mb-2">Jurnal</h4>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Alasan Masuk</p>
                                        <p>Berdasarkan analisis teknikal, terbentuk pola bullish flag pada timeframe H4.</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Tags</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {trade.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                        </div>
                                    </div>
                                </div>
                           </div>
                           <Separator />
                           <div>
                               <h4 className="font-semibold mb-2">Screenshot</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-muted-foreground mb-2">Sebelum Masuk</p>
                                        <Skeleton className="w-full h-48 rounded-md" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-2">Sesudah Keluar</p>
                                        <Skeleton className="w-full h-48 rounded-md" />
                                    </div>
                               </div>
                           </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Separator component for use in the dialog
function Separator() {
    return <div className="border-t border-border" />;
}
