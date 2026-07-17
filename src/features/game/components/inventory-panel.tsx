import { CircleAlert, PackageOpen, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ItemIcon } from "@/features/game/components/item-icon";
import type {
  InventoryCategory,
  InventoryItem,
} from "@/features/game/types";
import { cn } from "@/lib/utils";

type InventoryFilter = "all" | InventoryCategory;

interface InventoryPanelProps {
  items: InventoryItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onUseItem: (item: InventoryItem) => void;
  className?: string;
}

const filters: Array<{ value: InventoryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "food", label: "Đồ ăn" },
  { value: "water", label: "Nước" },
  { value: "medical", label: "Y tế" },
  { value: "tool", label: "Công cụ" },
  { value: "quest", label: "Đặc biệt" },
];

const categoryLabels: Record<InventoryCategory, string> = {
  food: "Đồ ăn",
  water: "Nước uống",
  medical: "Y tế",
  tool: "Công cụ",
  quest: "Vật phẩm đặc biệt",
};

export function InventoryPanel({
  items,
  selectedItemId,
  onSelectItem,
  onUseItem,
  className,
}: InventoryPanelProps) {
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const filteredItems = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.category === filter),
    [filter, items],
  );
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/70",
        className,
      )}
    >
      <header className="border-b border-white/6 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <PackageOpen className="size-3.5" /> Vật tư
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Kho đồ</h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-medium tabular-nums">
              {totalQuantity}
            </p>
            <p className="text-[11px] text-muted-foreground">đơn vị</p>
          </div>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "secondary" : "ghost"}
              size="xs"
              className="shrink-0"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredItems.map((item) => {
              const isSelected = item.id === selectedItemId;
              const isBroken = item.condition === "broken";

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectItem(item.id)}
                  className={cn(
                    "group relative flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-xl border bg-zinc-950/50 p-2 text-center transition-all hover:-translate-y-0.5 hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-zinc-400 bg-zinc-800 ring-1 ring-zinc-400/20"
                      : "border-white/8",
                    isBroken &&
                      "border-amber-400/20 bg-amber-400/5 text-zinc-500",
                  )}
                >
                  {item.quantity > 1 && (
                    <span className="absolute right-1.5 top-1.5 rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-300">
                      ×{item.quantity}
                    </span>
                  )}
                  {isBroken && (
                    <span className="absolute left-1.5 top-1.5 text-amber-300">
                      <CircleAlert className="size-3.5" />
                    </span>
                  )}
                  <ItemIcon
                    icon={item.icon}
                    className={cn(
                      "size-6 text-zinc-300 transition-colors group-hover:text-zinc-100",
                      isBroken && "text-zinc-600 group-hover:text-zinc-500",
                    )}
                  />
                  <span className="w-full truncate text-[11px] text-zinc-400">
                    {item.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid h-40 place-items-center rounded-xl border border-dashed border-white/10 text-center">
            <div>
              <PackageOpen className="mx-auto size-5 text-zinc-600" />
              <p className="mt-2 text-sm text-muted-foreground">
                Không có vật phẩm trong nhóm này.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/6 bg-zinc-950/50 p-4 sm:p-5">
        {selectedItem ? (
          <div>
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/5",
                  selectedItem.condition === "broken" &&
                    "border-amber-400/15 bg-amber-400/5 text-zinc-500",
                )}
              >
                <ItemIcon icon={selectedItem.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{selectedItem.name}</h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-normal",
                      selectedItem.condition === "broken"
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                        : "border-emerald-400/15 bg-emerald-400/8 text-emerald-200",
                    )}
                  >
                    {selectedItem.condition === "broken" ? "Bị hỏng" : "Còn tốt"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {categoryLabels[selectedItem.category]} · Có {selectedItem.quantity}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {selectedItem.description}
            </p>
            <Separator className="my-3" />
            <div className="flex gap-2">
              {selectedItem.condition === "broken" ? (
                <Button variant="outline" size="sm" disabled className="flex-1">
                  <Wrench /> Cần dụng cụ sửa
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!selectedItem.usable}
                  onClick={() => onUseItem(selectedItem)}
                >
                  Sử dụng
                </Button>
              )}
              <Button variant="ghost" size="sm">
                Chi tiết
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground">
            Chọn một vật phẩm để xem chi tiết.
          </p>
        )}
      </div>
    </aside>
  );
}
