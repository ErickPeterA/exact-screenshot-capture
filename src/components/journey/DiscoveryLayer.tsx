import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface Discovery {
  serviceCode: string;
  text: string;
  territory: string;
}

export function DiscoveryModal({
  discovery,
  onClose,
}: {
  discovery: Discovery | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(discovery)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span aria-hidden>💡</span> Uma descoberta no caminho
          </DialogTitle>
          <DialogDescription className="pt-2 text-[15px] leading-relaxed text-foreground">
            {discovery?.text}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose} className="mt-2 w-full">
          Continuar jornada
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function DiscoveryBackpack({ discoveries }: { discoveries: Discovery[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <span aria-hidden>🎒</span>
          Minhas descobertas
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
            {discoveries.length}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Minhas descobertas</SheetTitle>
          <SheetDescription>
            Pontos que apareceram enquanto você percorria a jornada.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 overflow-y-auto px-4 pb-6">
          {discoveries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma descoberta ainda. Continue a jornada.
            </p>
          )}
          {discoveries.map((d, i) => (
            <div key={`${d.serviceCode}-${i}`} className="surface-card p-4">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">{d.territory}</p>
              <p className="mt-1.5 text-sm leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
