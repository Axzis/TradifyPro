'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { useCollection } from '@/hooks/use-firestore';
import type { Trade } from '@/types/trade';
import { useToast } from '@/hooks/use-toast';
import { format, setHours, setMinutes, toDate } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// Skema Zod HANYA untuk menutup trade
const closeTradeSchema = z.object({
  exitPrice: z.coerce.number().positive('Harga keluar harus positif'),
  closeDate: z.date({
    required_error: 'Tanggal tutup tidak boleh kosong.',
  }),
});

type CloseTradeFormData = z.infer<typeof closeTradeSchema>;

const formatCurrencyUSD = (value: number | undefined | null) => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  // Handle both JS Date and Firestore Timestamp
  const d = date instanceof Date ? date : typeof date.toDate === 'function' ? date.toDate() : toDate(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OpenTradesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: rawOpenTrades, loading } = useCollection<Trade>(
    user ? `users/${user.uid}/trades` : '',
    'closeDate', '==', null
  );

  // Sort trades on the client-side
  const openTrades = useMemo(() => {
    if (!rawOpenTrades) return [];
    return [...rawOpenTrades].sort((a, b) => {
      const dateA = (a.openDate as Timestamp)?.toDate() || new Date(0);
      const dateB = (b.openDate as Timestamp)?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });
  }, [rawOpenTrades]);


  // 2. Setup form untuk modal "Tutup Posisi"
  const form = useForm<CloseTradeFormData>({
    resolver: zodResolver(closeTradeSchema),
    defaultValues: {
      exitPrice: undefined,
      closeDate: new Date(),
    },
  });

  const {
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = form;

  // 3. Logika untuk submit form "Tutup Posisi"
  const onCoseSubmit = async (data: CloseTradeFormData) => {
    if (!tradeToClose || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Trade tidak ditemukan atau Anda tidak login.',
      });
      return;
    }

    const tradeDocRef = doc(
      db,
      'users',
      user.uid,
      'trades',
      tradeToClose.id
    );

    try {
      // Update dokumen yang ada dengan harga & tanggal keluar
      await updateDoc(tradeDocRef, {
        exitPrice: data.exitPrice,
        closeDate: data.closeDate,
      });

      toast({
        title: 'Sukses!',
        description: `Posisi ${tradeToClose.ticker} berhasil ditutup.`,
      });
      handleCloseModal();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Menutup Posisi',
        description: error.message,
      });
    }
  };

  const handleOpenModal = (trade: Trade) => {
    setTradeToClose(trade);
    reset({ exitPrice: undefined, closeDate: new Date() }); // Reset form setiap kali modal dibuka
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTradeToClose(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        title="Posisi Terbuka"
        description="Daftar trade yang masih berjalan dan belum ditutup."
       />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Tgl Entry</TableHead>
                <TableHead>Simbol</TableHead>
                <TableHead className="hidden sm:table-cell">Arah</TableHead>
                <TableHead>Harga Entry</TableHead>
                <TableHead>Stop Loss</TableHead>
                <TableHead className="hidden sm:table-cell">Ukuran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : openTrades && openTrades.length > 0 ? (
                openTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="hidden sm:table-cell">{formatDate(trade.openDate)}</TableCell>
                    <TableCell className="font-medium">{trade.ticker}</TableCell>
                    <TableCell className="hidden sm:table-cell">{trade.position}</TableCell>
                    <TableCell>{formatCurrencyUSD(trade.entryPrice)}</TableCell>
                    <TableCell>
                      {formatCurrencyUSD(trade.stopLossPrice)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{trade.positionSize}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenModal(trade)}
                      >
                        Tutup
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Tidak ada posisi yang sedang terbuka.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal untuk Menutup Posisi */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Posisi: {tradeToClose?.ticker}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={handleSubmit(onCoseSubmit)}
              className="space-y-6 pt-4"
            >
              <FormField
                control={control}
                name="exitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Keluar (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Masukkan harga penutupan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="closeDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal & Waktu Tutup</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP HH:mm')
                            ) : (
                              <span>Pilih tanggal & waktu</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date <
                              ((tradeToClose?.openDate as Timestamp)?.toDate() ||
                                new Date('1900-01-01'))
                          }
                          initialFocus
                        />
                        <div className="p-2 border-t border-border">
                          <Input
                            type="time"
                            step="60"
                            onChange={(e) => {
                              const time = e.target.value;
                              if (!time) return;
                              const [hours, minutes] = time.split(':');
                              const newDate = setMinutes(
                                setHours(
                                  field.value || new Date(),
                                  parseInt(hours)
                                ),
                                parseInt(minutes)
                              );
                              field.onChange(newDate);
                            }}
                            value={
                              field.value ? format(field.value, 'HH:mm') : ''
                            }
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Simpan Penutupan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
