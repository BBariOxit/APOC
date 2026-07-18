import { Check, ChevronDown, Lock, Plus, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ItemIcon } from "@/features/game/components/item-icon";
import type { InventoryItem } from "@/features/game/types";
import { cn } from "@/lib/utils";

interface ExpeditionLoadoutSlotProps {
  index: number;
  item?: InventoryItem;
  isLocked: boolean;
  loadoutItems: InventoryItem[];
  selectedItemCounts: Map<string, number>;
  onSelect: (itemId: string) => void;
  onRemove: () => void;
}

export function ExpeditionLoadoutSlot({
  index,
  item,
  isLocked,
  loadoutItems,
  selectedItemCounts,
  onSelect,
  onRemove,
}: ExpeditionLoadoutSlotProps) {
  if (isLocked && !item) {
    return (
      <div className="grid min-h-20 place-items-center rounded-xl border border-dashed border-white/8 bg-black/10 text-zinc-700">
        <Lock className="size-4" />
        <span className="sr-only">Ô hành trang bị khóa</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={
              item
                ? `Thay vật phẩm ${item.name} ở ô ${index + 1}`
                : `Chọn vật phẩm cho ô ${index + 1}`
            }
            className={cn(
              "flex min-h-20 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              item
                ? "border-white/10 bg-zinc-950/45 hover:bg-zinc-800/60"
                : "border-dashed border-white/12 bg-transparent text-muted-foreground hover:border-white/25 hover:bg-white/3 hover:text-zinc-200",
              isLocked &&
                "border-amber-300/45 bg-amber-300/5 hover:bg-amber-300/10",
            )}
          />
        }
      >
        {item ? (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-300">
              <ItemIcon icon={item.icon} className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium text-zinc-100">
                  {item.name}
                </span>
              </span>
              <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                {item.shortDescription}
              </span>
            </span>
            {isLocked ? (
              <Lock className="size-4 shrink-0 text-amber-200/70" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-zinc-500" />
            )}
          </>
        ) : (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-dashed border-white/15">
              <Plus className="size-4" />
            </span>
            <span className="font-medium">Chọn vật phẩm</span>
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] p-1.5"
      >
        <DropdownMenuLabel className="px-2 py-1.5">
          Vật phẩm cho ô {index + 1}
        </DropdownMenuLabel>
        {!isLocked && loadoutItems.map((loadoutItem) => {
          const selectedCount = selectedItemCounts.get(loadoutItem.id) ?? 0;
          const remainingCount = loadoutItem.quantity - selectedCount;
          const isCurrentItem = item?.id === loadoutItem.id;
          const isUnavailable = remainingCount <= 0 && !isCurrentItem;

          return (
            <DropdownMenuItem
              key={loadoutItem.id}
              disabled={isUnavailable}
              className="gap-3 px-2 py-2.5"
              onClick={() => onSelect(loadoutItem.id)}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-300">
                <ItemIcon icon={loadoutItem.icon} className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {loadoutItem.name}
                </span>
                <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                  {loadoutItem.shortDescription}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {isCurrentItem ? (
                  <Check className="size-4 text-zinc-200" />
                ) : (
                  `Còn ${Math.max(0, remainingCount)}`
                )}
              </span>
            </DropdownMenuItem>
          );
        })}

        {item && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRemove}>
              <X /> Bỏ khỏi ô này
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
