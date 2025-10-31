"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { EQUITY_TRANSACTION_TYPES } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "../ui/label";

const formSchema = z.object({
  type: z.enum(EQUITY_TRANSACTION_TYPES, {
    required_error: "Anda harus memilih tipe transaksi.",
  }),
  amount: z.coerce.number().positive("Jumlah harus positif"),
  date: z.date({ required_error: "Tanggal wajib diisi" }),
  notes: z.string().optional(),
});

type NewEquityTransactionFormProps = {
  onFormSubmit?: () => void;
};

export default function NewEquityTransactionForm({ onFormSubmit }: NewEquityTransactionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "deposit",
      amount: "" as any,
      date: new Date(),
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "Anda harus login." });
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "users", user.uid, "equityTransactions"), {
        ...values,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Transaksi Disimpan",
        description: "Transaksi ekuitas baru Anda telah berhasil ditambahkan.",
      });
      form.reset();
      onFormSubmit?.();
    } catch (error: any) {
        console.error("Equity transaction form error:", error);
        toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: error.message || "Terjadi kesalahan saat menyimpan transaksi.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipe Transaksi</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex gap-4"
                >
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="deposit" id="deposit" />
                    </FormControl>
                    <Label htmlFor="deposit">Deposit</Label>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <RadioGroupItem value="withdraw" id="withdraw" />
                    </FormControl>
                    <Label htmlFor="withdraw">Withdraw</Label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="amount" render={({ field }) => (
          <FormItem><FormLabel>Jumlah (USD)</FormLabel><FormControl><Input type="number" step="any" placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="date" render={({ field }) => (
             <FormItem className="flex flex-col"><FormLabel>Tanggal Transaksi</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
         <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Catatan (Opsional)</FormLabel><FormControl><Textarea placeholder="misal: Deposit dari bank lokal" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Transaksi
          </Button>
        </div>
      </form>
    </Form>
  );
}
