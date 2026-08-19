import {
  Activity,
  BarChart3,
  CircleDollarSign,
  DatabaseZap,
  FileText,
  History,
  PanelLeft,
  ShieldCheck,
  TableProperties,
} from "lucide-react";
import React from "react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";

const navigation = [
  { icon: BarChart3, label: "Visão consolidada", path: "/" },
  { icon: CircleDollarSign, label: "Exposições", path: "/exposicoes" },
  { icon: DatabaseZap, label: "Dados de mercado", path: "/dados" },
  { icon: TableProperties, label: "DataFrames", path: "/dataframes" },
  { icon: Activity, label: "Cenários", path: "/cenarios" },
  { icon: History, label: "Pacotes de cenário", path: "/historico" },
  { icon: FileText, label: "Relatórios", path: "/relatorios" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const current = navigation.find(item => item.path === location) ?? navigation[0]!;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#09141c] text-[#dae8ed]">
        <SidebarHeader className="h-[84px] justify-center border-b border-white/10 px-3">
          <div className="flex w-full items-center gap-2.5">
            <button
              onClick={toggleSidebar}
              aria-label="Alternar navegação"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[#9ab4be] transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72d2bf] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09141c]"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            {!collapsed && (
              <div className="flex items-center gap-2.5 leading-none">
                <div aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg border border-[#72d2bf]/30 bg-[#72d2bf]/10 font-mono text-xs font-semibold text-[#9aead9]">H</div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#72d2bf]">HEDGE</p>
                  <p className="mt-1 text-sm font-semibold tracking-[0.17em] text-white">LAB</p>
                  <p className="mt-1 text-[8px] font-medium uppercase tracking-[0.14em] text-[#6e8790]">Laboratório de risco</p>
                </div>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f7780] group-data-[collapsible=icon]:hidden">Plataforma</p>
          <SidebarMenu>
            {navigation.map(item => {
              const active = current.path === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={active}
                    onClick={() => setLocation(item.path)}
                    className="h-10 rounded-lg px-3 text-[#9fb6be] transition hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-[#164148] data-[active=true]:text-[#a7f4df]"
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-[13px]">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.035] px-2.5 py-2.5 group-data-[collapsible=icon]:justify-center">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#72d2bf]" />
            {!collapsed && <div><p className="text-[11px] font-medium text-[#d8e6e9]">Sessão local</p><p className="mt-0.5 text-[10px] text-[#6e8790]">sem banco de dados</p></div>}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f4f7f6]">
        <header className="sticky top-0 z-30 flex h-[84px] items-center justify-between border-b border-[#dce7e5] bg-[#f8faf9]/90 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 rounded-xl border border-[#dce7e5] bg-white text-[#27424a] lg:hidden" />
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6c8790]">HEDGE LAB / ambiente de análise</p><h1 className="mt-1 text-[17px] font-semibold tracking-tight text-[#14303a]">{current.label}</h1></div>
          </div>
          <div className="hidden items-center gap-2 sm:flex"><span className="h-2 w-2 rounded-full bg-[#2bae90] shadow-[0_0_0_4px_rgba(43,174,144,.12)]" /><span className="text-xs font-medium text-[#42606a]">Dados e cálculos em sessão</span></div>
        </header>
        <main className="min-h-[calc(100vh-84px)] p-5 lg:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
