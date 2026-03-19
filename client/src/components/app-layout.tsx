import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import {
  LayoutDashboard,
  Upload,
  Users,
  ArrowLeftRight,
  Landmark,
  Settings,
  BarChart3,
  ListOrdered,
  LogOut,
  Moon,
  Sun,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";

const adminNavItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Import Trades", path: "/upload-trades", icon: Upload },
  { label: "Manage Clients", path: "/manage-clients", icon: Users },
  { label: "Deposits & Withdrawals", path: "/capital-movements", icon: ArrowLeftRight },
  { label: "Capital Accounts", path: "/capital-accounts", icon: Landmark },
  { label: "Settings", path: "/configuration", icon: Settings },
  { label: "Performance Overview", path: "/strategy-analysis", icon: BarChart3 },
  { label: "Monthly Breakdown", path: "/strategy-details", icon: ListOrdered },
];

const clientNavItems = [
  { label: "Capital Account", path: "/", icon: Landmark },
  { label: "Performance Overview", path: "/strategy-summary", icon: BarChart3 },
  { label: "Monthly Breakdown", path: "/strategy-details", icon: ListOrdered },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const navItems = user?.role === "admin" ? adminNavItems : clientNavItems;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold" data-testid="text-app-name">TradeView</span>
              <span className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
                {user?.name || user?.username} &middot; {user?.role}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.path}
                      tooltip={item.label}
                    >
                      <Link href={item.path} data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center justify-between px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsDark(!isDark)}
              data-testid="button-theme-toggle"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
        <PerplexityAttribution />
      </SidebarInset>
    </SidebarProvider>
  );
}
