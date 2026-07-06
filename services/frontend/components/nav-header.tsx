'use client';
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplet } from "lucide-react";

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Find active tab value based on route, defaulting to 'twin'
  const activeTab = pathname.split('/')[1] || 'twin';

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b bg-background">
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Droplet className="text-primary size-5" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">RO Digital Twin</h1>
      </div>
      
      <Tabs 
        value={activeTab} 
        onValueChange={(val) => router.push(`/${val}`)}
        className="hidden md:block"
      >
        <TabsList className="bg-transparent h-10 border border-border/50 shadow-sm rounded-full p-1">
          <TabsTrigger value="twin" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Twin</TabsTrigger>
          <TabsTrigger value="simulation" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Simulation</TabsTrigger>
          <TabsTrigger value="industry" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Industry</TabsTrigger>
          <TabsTrigger value="cloud-data" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">Cloud Data</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="w-[180px]" /> {/* Spacer for flex layout balancing */}
    </header>
  );
}
