import { Link, useLocation } from "wouter";
import { BookOpen, Globe, MessageCircle, CircleUser, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import rellioLogo from "@assets/rellio-logo.png";

const tabs = [
  { href: "/read", label: "Read",    icon: BookOpen },
  { href: "/map",  label: "Explore", icon: Globe },
  { href: "/ask",  label: "Ask",     icon: MessageCircle },
  { href: "/you",  label: "You",     icon: CircleUser },
] as const;

interface AppShellProps {
  children: React.ReactNode;
}

function activeTab(location: string): string {
  if (location === "/" || location.startsWith("/read")) return "/read";
  if (location.startsWith("/map")) return "/map";
  if (location.startsWith("/ask")) return "/ask";
  if (location.startsWith("/you") || location.startsWith("/profile")) return "/you";
  return "";
}

function GlobalHeader() {
  const { user, isGuest } = useAuth();
  const initials = (() => {
    if (isGuest || !user) return null;
    const name = user.firstName ?? user.username ?? user.email?.split("@")[0] ?? "S";
    return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  })();

  return (
    <header
      className="flex items-center justify-end px-4 lg:px-6 h-12 border-b border-gray-100 bg-white flex-shrink-0"
      data-testid="global-header"
    >
      <Link
        href="/you"
        className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-gray-50 text-gray-700 no-underline"
        aria-label="You"
        data-testid="header-avatar"
      >
        {user?.profileImageUrl
          ? <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          : initials
            ? <span className="text-[11px] font-bold">{initials}</span>
            : <User size={15} />}
      </Link>
    </header>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const active = activeTab(location);

  return (
    <div className="flex h-[100dvh] w-full bg-white overflow-hidden">
      {/* Desktop left rail */}
      <aside className="hidden lg:flex flex-col w-20 border-r border-gray-200 bg-white flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-center">
          <img src={rellioLogo} alt="Rellio" className="h-8 w-auto object-contain" />
        </div>
        <nav className="flex-1 flex flex-col items-stretch py-3 gap-1 px-2">
          {tabs.map(({ href, label, icon: Icon }) => {
            const isActive = active === href;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-${label.toLowerCase()}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-colors no-underline",
                  isActive ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.75} />
                <span className={cn("text-[10px] font-medium tracking-wide", isActive && "font-semibold")}>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content with global top header */}
      <main className="flex-1 min-w-0 min-h-0 flex flex-col relative pb-[calc(64px+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <GlobalHeader />
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-[400] flex items-stretch bg-white border-t border-gray-200"
        style={{
          height: "calc(64px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = active === href;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`tab-${label.toLowerCase()}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              className="flex-1 flex flex-col items-center justify-center gap-[3px] relative transition-all duration-150 no-underline"
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-black"
                  style={{ width: "24px", height: "2px" }}
                />
              )}
              <Icon size={21} strokeWidth={isActive ? 2.2 : 1.75} className={isActive ? "text-black" : "text-gray-400"} />
              <span className={cn("text-[10px] font-medium tracking-wide", isActive ? "text-black font-semibold" : "text-gray-400")}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
