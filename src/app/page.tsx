import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, BarChart, BookOpen, Lock, UploadCloud, Target } from "lucide-react";
import { Logo } from "@/components/logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const heroImage = PlaceHolderImages.find(p => p.id === 'hero');

const features = [
  {
    icon: <BookOpen className="h-8 w-8 text-primary" />,
    title: "Pencatatan Mendalam",
    description: "Catat setiap detail trade, termasuk strategi, emosi, dan bukti visual dengan screenshot.",
  },
  {
    icon: <BarChart className="h-8 w-8 text-primary" />,
    title: "Manajemen Ekuitas",
    description: "Lacak deposit dan withdraw untuk kurva ekuitas yang akurat, bukan hanya P&L.",
  },
  {
    icon: <Target className="h-8 w-8 text-primary" />,
    title: "Analisis Profesional",
    description: "Analisis kinerja berdasarkan tag, tanggal, dan metrik profesional seperti R-Multiple.",
  },
  {
    icon: <Lock className="h-8 w-8 text-primary" />,
    title: "Mode Privasi",
    description: "Sembunyikan semua nilai moneter di dashboard Anda dengan satu kali klik.",
  },
  {
    icon: <UploadCloud className="h-8 w-8 text-primary" />,
    title: "Upload Screenshot",
    description: "Integrasi dengan ImageKit.io untuk menyimpan bukti visual dari setup trading Anda.",
  },
    {
    icon: <CheckCircle className="h-8 w-8 text-primary" />,
    title: "Posisi Terbuka",
    description: "Pantau dan kelola semua posisi trading yang masih aktif secara real-time.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Daftar Gratis</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow">
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-foreground mb-6 font-headline">
              Jurnal Trading Tercanggih Anda
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
              Ubah cara Anda menganalisis trade. Tradify Pro membantu Anda mencatat, mengelola ekuitas, dan menemukan keunggulan trading Anda.
            </p>
            <Button size="lg" asChild>
              <Link href="/register">Mulai Gratis Sekarang</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
           {heroImage && (
             <div className="relative aspect-video max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden mb-24 border">
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  fill
                  className="object-cover"
                  data-ai-hint={heroImage.imageHint}
                />
             </div>
           )}
        </section>
        
        <section id="features" className="py-20 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline">
                Fitur untuk Setiap Trader
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Semua yang Anda butuhkan untuk menjadi trader yang lebih disiplin dan menguntungkan.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="bg-card hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle className="font-bold text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="py-10 bg-background border-t">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
            <Logo />
            <p className="mt-4 text-sm">&copy; {new Date().getFullYear()} Tradify Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
