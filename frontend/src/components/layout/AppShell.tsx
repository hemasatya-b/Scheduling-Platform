import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/constants';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme/ModeToggle';

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-semibold text-sidebar-foreground">Cal Clone</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-r-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-sidebar-foreground',
                isActive && 'border-foreground bg-accent text-sidebar-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center justify-between border-t border-border px-3 py-3">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ModeToggle />
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:hidden">
          <div className="flex items-center">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <span className="ml-3 text-base font-semibold text-foreground">Cal Clone</span>
          </div>
          <ModeToggle />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
