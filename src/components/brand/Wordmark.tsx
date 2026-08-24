import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-xl font-display text-sm font-bold",
          tone === "light"
            ? "bg-navy-foreground/12 text-navy-foreground"
            : "bg-navy text-navy-foreground",
        )}
      >
        VG
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block font-display text-sm font-semibold",
            tone === "light" ? "text-navy-foreground" : "text-foreground",
          )}
        >
          Jornada do Empreendedor
        </span>
        <span
          className={cn(
            "block text-[11px] tracking-wide uppercase",
            tone === "light" ? "text-navy-foreground/65" : "text-muted-foreground",
          )}
        >
          VG Gestão de Resultados
        </span>
      </span>
    </div>
  );
}
