import Link from "next/link";
import { LineChart } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" prefetch={false}>
      <LineChart className="h-7 w-7 text-primary" />
      <span className="text-xl font-bold text-foreground">Tradify Pro</span>
    </Link>
  );
}
