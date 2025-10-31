"use client"

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ArrowUpDown, Loader2 } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format, toDate } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-firestore";
import type { Trade } from "@/types/trade";
import { db } from "@/lib/firebase";
import { deleteDoc, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ASSET_TYPES } from "@/lib/constants";

const calculatePnl = (trade: Trade) => {
    if (trade.exitPrice === null || trade.exitPrice === undefined) return 0;
    const pnlPerUnit = trade.exitPrice - trade.entryPrice;
    const totalPnl = pnlPerUnit * trade.positionSize;
    return trade.position === "Short" ? totalPnl * -1 : totalPnl;
};

export default function TradeHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const { data: rawTrades, loading } = useCollection<Trade>(
    user ? `users/${user.uid}/trades` : ''
  );

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  const [filterAssetType, setFilterAssetType] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');

  const filteredTrades = useMemo(() => {
    if (!rawTrades) return [];
    return rawTrades.filter(trade => {
        if (!trade.openDate) return false;
        const tradeDate = toDate((trade.openDate as Timestamp).seconds * 1000);

        if (filterDateRange?.from && tradeDate < filterDateRange.from) return false;
        if (filterDateRange?.to && tradeDate > filterDateRange.to) return false;
        if (filterAssetType !== 'all' && trade.assetType !== filterAssetType) return false;
        
        const pnl = calculatePnl(trade);
        const result = !trade.closeDate ? "open" : pnl > 0 ? "win" : pnl < 0 ? "loss" : "be";

        if (filterResult !== 'all' && result !== filterResult) {
            return false;
        }
        
        return true;
    }).sort((a,b) => toDate((b.openDate as any)).getTime() - toDate((a.openDate as any)).getTime());
  }, [rawTrades, filterDateRange, filterAssetType, filterResult]);

  const handleSelectTrade = (trade: Trade) => {
    setSelectedTrade(trade);
    setDetailOpen(true);
  }

  const handleDeleteTrade = async () => {
    if (!user || !selectedTrade) return;
    setIsDeleting(true);
    try {
      const tradeRef = doc(db, "users", user.uid, "trades", selectedTrade.id);
      await deleteDoc(tradeRef);
      toast({
        title: "Trade Dihapus",
        description: `Trade ${selectedTrade.ticker} telah berhasil dihapus.`,
      });
      setDeleteAlertOpen(false);
      setDetailOpen(false);
      setSelectedTrade(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Menghapus",
        description: "Terjadi kesalahan saat menghapus trade.",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const openDeleteAlert = () => {
      setDeleteAlertOpen(true);
  }

  return (
    <div className="space-y-8">
      <DashboardHeader 
        title="Riwayat Trade"
        description="Tinjau dan analisis semua trade yang telah selesai."
      />
      
      <div className="flex flex-wrap items-center gap-2">
        <DatePickerWithRange onDateChange={setFilterDateRange} />
        <Select value={filterAssetType} onValueChange={setFilterAssetType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Aset" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aset</SelectItem>
            {ASSET_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Hasil" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Hasil</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="be">Break-even</SelectItem>
            <SelectItem value="open">Open</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticker</TableHead>
                <TableHead>Tanggal Buka</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead className="text-right">P/L (USD)</TableHead>
                <TableHead className="text-center">Hasil</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-14 mx-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
              ))}
              {!loading && filteredTrades?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        Belum ada riwayat transaksi.
                    </TableCell>
                </TableRow>
              )}
              {!loading && filteredTrades?.map((trade) => {
                  const pnl = calculatePnl(trade);
                  const result = !trade.closeDate ? "Open" : pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "BE";

                  return (
                    <TableRow key={trade.id} onClick={() => handleSelectTrade(trade)} className="cursor-pointer">
                      <TableCell className="font-medium">{trade.ticker}</TableCell>
                      <TableCell>{format(toDate(trade.openDate as any), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{trade.assetType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trade.position === 'Long' ? 'secondary' : 'destructive'} className={trade.position === 'Long' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}>
                            {trade.position}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${!trade.closeDate ? 'text-muted-foreground' : pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {trade.closeDate ? pnl.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={result === 'Win' ? 'default' : result === 'Loss' ? 'destructive' : 'secondary'} className={result === 'Win' ? 'bg-green-500 hover:bg-green-600' : result === "Open" ? "bg-sky-500 hover:bg-sky-600" : ""}>
                          {result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleSelectTrade(trade)}>Lihat Detail</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-trade/${trade.id}`)}>Edit Trade</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/50" onSelect={(e) => { e.preventDefault(); setSelectedTrade(trade); openDeleteAlert(); }}>Hapus Trade</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
            <AlertDialogDescription>
              Aksi ini tidak dapat dibatalkan. Ini akan menghapus data trade secara permanen dari server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrade} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isDetailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Trade: {selectedTrade?.ticker}</DialogTitle>
            <DialogDescription>
              {selectedTrade?.position} trade pada {selectedTrade && format(toDate(selectedTrade.openDate as any), "dd MMMM yyyy")}
            </DialogDescription>
          </DialogHeader>
          {selectedTrade && (
            <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-muted-foreground">P/L</p><p className={`font-semibold ${calculatePnl(selectedTrade) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{selectedTrade.closeDate ? `${calculatePnl(selectedTrade).toFixed(2)} USD` : '-'}</p></div>
                    <div><p className="text-muted-foreground">Hasil</p><p className="font-semibold">{!selectedTrade.closeDate ? 'Open' : calculatePnl(selectedTrade) > 0 ? "Win" : calculatePnl(selectedTrade) < 0 ? "Loss" : "BE"}</p></div>
                    <div><p className="text-muted-foreground">Posisi</p><p className="font-semibold">{selectedTrade.position}</p></div>
                    <div><p className="text-muted-foreground">Aset</p><p className="font-semibold">{selectedTrade.assetType}</p></div>
               </div>
               <Separator />
               <div>
                    <h4 className="font-semibold mb-2">Jurnal</h4>
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-muted-foreground">Alasan Masuk</p>
                            <p>{selectedTrade.entryReason || "-"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Tags</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {selectedTrade.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                                {(!selectedTrade.tags || selectedTrade.tags.length === 0) && <p className="text-sm text-muted-foreground">-</p>}
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
                            {selectedTrade.imageUrlBefore ? <a href={selectedTrade.imageUrlBefore} target="_blank" rel="noopener noreferrer"><Image src={selectedTrade.imageUrlBefore} alt="Screenshot sebelum masuk" width={300} height={200} className="rounded-md border object-cover aspect-video" /></a> : <div className="w-full h-48 rounded-md bg-muted flex items-center justify-center text-muted-foreground">Tidak ada gambar</div>}
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-2">Sesudah Keluar</p>
                             {selectedTrade.imageUrlAfter ? <a href={selectedTrade.imageUrlAfter} target="_blank" rel="noopener noreferrer"><Image src={selectedTrade.imageUrlAfter} alt="Screenshot sesudah keluar" width={300} height={200} className="rounded-md border object-cover aspect-video" /></a> : <div className="w-full h-48 rounded-md bg-muted flex items-center justify-center text-muted-foreground">Tidak ada gambar</div>}
                        </div>
                   </div>
               </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>Tutup</Button>
            <Button onClick={() => { if(selectedTrade) { setDetailOpen(false); router.push(`/dashboard/edit-trade/${selectedTrade?.id}`)}}}>Edit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
