"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cloud,
  LayoutDashboard,
  FileText,
  Rss,
  ListChecks,
  LineChart,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

type NavItem = { href: string; label: string; icon: LucideIcon; soon?: boolean };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/resume", label: "Resumes", icon: FileText },
  { href: "/queue", label: "Queue", icon: ListChecks },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Cloud className="h-5 w-5 text-primary" />
          CloudHunt
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Inner = (
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  item.soon && "cursor-not-allowed opacity-50",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.soon && (
                  <span className="rounded bg-muted px-1 text-[10px] uppercase">
                    soon
                  </span>
                )}
              </span>
            );
            return item.soon ? (
              <span key={item.href} title="Coming in a later phase">
                {Inner}
              </span>
            ) : (
              <Link key={item.href} href={item.href}>
                {Inner}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {email}
          </span>
          <ThemeToggle />
          <form action={signOut}>
            <Button variant="ghost" size="icon" aria-label="Sign out" type="submit">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
