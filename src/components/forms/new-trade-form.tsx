"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ASSET_TYPES, POSITIONS } from "@/lib/constants";
import type { Trade } from "@/types/trade";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, UploadCloud } from "lucide-react";
import { format, toDate } from "date-fns";
import { Separator } from "@/components/ui/separator";

import { IKContext, IKUpload } from 'imagekitio-react';

const formSchema = z.object({
  ticker: z.string().min(1, "Ticker wajib diisi").toUpperCase(),
  assetType: z.enum(ASSET_TYPES),
  position: z.enum(POSITIONS),
  openDate: z.date({ required_error: "Tanggal buka wajib diisi" }),
  entryPrice: z.coerce.number().positive("Harga masuk harus positif"),
  exitPrice: z.coerce.number().optional().nullable(),
  positionSize: z.coerce.number().positive("Ukuran posisi harus positif"),
  stopLossPrice: z.coerce.number().optional().nullable(),
  takeProfitPrice: z.coerce.number().optional().nullable(),
  commission: z.coerce.number().optional().nullable(),
  tags: z.array(z.string()).optional(),
  entryReason: z.string().optional(),
  closeDate: z.date().optional().nullable(),
  imageUrlBefore: z.string().optional(),
  imageUrlAfter: z.string().optional(),
})
.refine(data => !((data.exitPrice && !data.closeDate) || (!data.exitPrice && data.closeDate)), {
    message: "Harga keluar dan tanggal tutup harus diisi bersamaan atau dikosongkan bersamaan.",
    path: ["closeDate"],
});


type NewTradeFormProps = {
  tradeToEdit?: Trade;
  onFormSubmit?: () => void;
};

const safeToDate = (date: any): Date | null => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date.toDate === 'function') return date.toDate();
    const parsed = toDate(date);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
}

export default function NewTradeForm({ tradeToEdit, onFormSubmit }: NewTradeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: tradeToEdit
      ? {
          ...tradeToEdit,
          openDate: safeToDate(tradeToEdit.openDate) || new Date(),
          closeDate: safeToDate(tradeToEdit.closeDate),
          entryPrice: tradeToEdit.entryPrice || 0,
          positionSize: tradeToEdit.positionSize || 0,
          stopLossPrice: tradeToEdit.stopLossPrice ?? null,
          takeProfitPrice: tradeToEdit.takeProfitPrice ?? null,
          commission: tradeToEdit.commission ?? null,
          exitPrice: tradeToEdit.exitPrice ?? null,
          entryReason: tradeToEdit.entryReason ?? "",
          tags: tradeToEdit.tags ?? [],
          imageUrlBefore: tradeToEdit.imageUrlBefore ?? "",
          imageUrlAfter: tradeToEdit.imageUrlAfter ?? "",
        }
      : {
          ticker: "",
          assetType: "Saham",
          position: "Long",
          tags: [],
          entryReason: "",
          openDate: new Date(),
          entryPrice: "" as any,
          positionSize: "" as any,
          stopLossPrice: null,
          takeProfitPrice: null,
          commission: null,
          exitPrice: null,
          closeDate: null,
          imageUrlBefore: "",
          imageUrlAfter: "",
        },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "Anda harus login." });
      return;
    }
    setIsSubmitting(true);
    
    const dataToSave = {
        ...values,
        exitPrice: values.exitPrice || null,
        closeDate: values.closeDate || null,
        stopLossPrice: values.stopLossPrice || null,
        takeProfitPrice: values.takeProfitPrice || null,
        commission: values.commission || null,
    }

    try {
      if (tradeToEdit) {
        const tradeRef = doc(db, "users", user.uid, "trades", tradeToEdit.id);
        await updateDoc(tradeRef, {
          ...dataToSave,
          userId: user.uid,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Trade Diperbarui",
          description: "Perubahan pada trade Anda telah disimpan.",
        });
      } else {
        await addDoc(collection(db, "users", user.uid, "trades"), {
            ...dataToSave,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
        toast({
          title: "Trade Disimpan",
          description: "Trade baru Anda telah berhasil ditambahkan.",
        });
        form.reset();
      }
      onFormSubmit?.();
    } catch (error: any) {
        console.error("Trade form error:", error);
        toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: error.message || "Terjadi kesalahan saat menyimpan trade.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const onUploadSuccess = (fieldName: "imageUrlBefore" | "imageUrlAfter") => (res: any) => {
    form.setValue(fieldName, res.url);
    toast({title: "Upload Sukses", description: `Gambar ${fieldName === 'imageUrlBefore' ? 'Sebelum' : 'Sesudah'} berhasil diupload.`})
  };
  
  const onUploadError = (err: any) => {
    console.error("Upload error:", err);
    toast({variant: "destructive", title: "Upload Gagal", description: "Gagal mengupload gambar."})
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-2 -mr-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <FormField control={form.control} name="ticker" render={({ field }) => (
            <FormItem><FormLabel>Ticker</FormLabel><FormControl><Input placeholder="misal: BTC" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="assetType" render={({ field }) => (
            <FormItem><FormLabel>Tipe Aset</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih tipe aset" /></SelectTrigger></FormControl><SelectContent>{ASSET_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="position" render={({ field }) => (
            <FormItem><FormLabel>Posisi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih posisi" /></SelectTrigger></FormControl><SelectContent>{POSITIONS.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>

        <Separator />
        <h3 className="text-lg font-medium">Detail Entry</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField control={form.control} name="openDate" render={({ field }) => (
             <FormItem className="flex flex-col"><FormLabel>Tanggal Buka</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="entryPrice" render={({ field }) => (
            <FormItem><FormLabel>Harga Masuk (USD)</FormLabel><FormControl><Input type="number" step="any" placeholder="100.50" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
           <FormField control={form.control} name="positionSize" render={({ field }) => (
            <FormItem><FormLabel>Ukuran Posisi (Unit)</FormLabel><FormControl><Input type="number" step="any" placeholder="10.5" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="commission" render={({ field }) => (
            <FormItem><FormLabel>Komisi (USD) (Opsional)</FormLabel><FormControl><Input type="number" step="any" placeholder="1.25" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField control={form.control} name="stopLossPrice" render={({ field }) => (
            <FormItem><FormLabel>Harga Stop Loss (USD) (Opsional)</FormLabel><FormControl><Input type="number" step="any" placeholder="95.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="takeProfitPrice" render={({ field }) => (
            <FormItem><FormLabel>Harga Take Profit (USD) (Opsional)</FormLabel><FormControl><Input type="number" step="any" placeholder="120.00" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <Separator />
        <h3 className="text-lg font-medium">Detail Exit (Opsional)</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField control={form.control} name="exitPrice" render={({ field }) => (
                <FormItem><FormLabel>Harga Keluar (USD)</FormLabel><FormControl><Input type="number" step="any" placeholder="cth: 110.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="closeDate" render={({ field }) => (
             <FormItem className="flex flex-col"><FormLabel>Tanggal Tutup</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => { const openDate = form.getValues("openDate"); return openDate ? date < openDate : false;}} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
            )} />
        </div>

        <Separator />
        <h3 className="text-lg font-medium">Jurnal & Lampiran</h3>

        <div className="space-y-4">
            <FormField control={form.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>Tags (Opsional)</FormLabel><FormControl><TagInput {...field} placeholder="misal: Breakout, FOMO, dll..."/></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="entryReason" render={({ field }) => (
                <FormItem><FormLabel>Alasan Masuk (Opsional)</FormLabel><FormControl><Textarea placeholder="Alasan teknikal dan fundamental..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        <IKContext
          publicKey={process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY}
          urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}
          authenticator={async () => {
            const response = await fetch('/api/imagekit-auth');
            return await response.json();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <FormLabel>Screenshot Sebelum (Opsional)</FormLabel>
                <div className="relative border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-accent flex flex-col items-center justify-center h-32">
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Klik atau tarik untuk upload</p>
                    <IKUpload 
                        fileName={`before-${user?.uid}-${Date.now()}.jpg`}
                        onSuccess={onUploadSuccess('imageUrlBefore')} 
                        onError={onUploadError}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                {form.watch('imageUrlBefore') && <Link href={form.watch('imageUrlBefore')!} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Lihat Gambar</Link>}
              </div>

              <div className="space-y-2">
                <FormLabel>Screenshot Sesudah (Opsional)</FormLabel>
                <div className="relative border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-accent flex flex-col items-center justify-center h-32">
                  <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Klik atau tarik untuk upload</p>
                  <IKUpload 
                      fileName={`after-${user?.uid}-${Date.now()}.jpg`}
                      onSuccess={onUploadSuccess('imageUrlAfter')} 
                      onError={onUploadError}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {form.watch('imageUrlAfter') && <Link href={form.watch('imageUrlAfter')!} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Lihat Gambar</Link>}
              </div>
          </div>
        </IKContext>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tradeToEdit ? "Simpan Perubahan" : "Simpan Trade"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
