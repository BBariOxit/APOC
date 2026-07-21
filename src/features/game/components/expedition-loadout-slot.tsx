"use client";

import { Check, ChevronDown, Lock, Plus, X } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isOpen, setIsOpen] = useState(false);

  if (isLocked && !item) {
    return (
      <div className="grid min-h-16 place-items-center rounded-xl border border-dashed border-white/8 bg-black/10 text-zinc-700">
        <Lock className="size-4" />
        <span className="sr-only">Ô hành trang bị khóa</span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={
          item
            ? `Thay vật phẩm ${item.name} ở ô ${index + 1}`
            : `Chọn vật phẩm cho ô ${index + 1}`
        }
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          item
            ? "border-white/10 bg-zinc-950/45 hover:bg-zinc-800/60"
            : "border-dashed border-white/12 bg-transparent text-muted-foreground hover:border-white/25 hover:bg-white/3 hover:text-zinc-200",
          isLocked && "border-amber-300/45 bg-amber-300/5",
        )}
      >
        {item ? (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-300">
              <ItemIcon icon={item.icon} className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-zinc-100">
              {item.name}
            </span>
          </>
        ) : (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-dashed border-white/15">
              <Plus className="size-4" />
            </span>
            <span className="font-medium">Chọn vật phẩm</span>
          </>
        )}

        {isLocked ? (
          <Lock className="ml-auto size-4 shrink-0 text-amber-200/70" />
        ) : (
          <ChevronDown className="ml-auto size-4 shrink-0 text-zinc-500" />
        )}
      </button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isLocked ? "Ô hành trang đã khóa" : "Chọn vật phẩm"}
          </DialogTitle>
        </DialogHeader>

        {!isLocked && (
          <div className="grid max-h-[min(60vh,28rem)] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {loadoutItems.map((loadoutItem) => {
              const selectedCount =
                selectedItemCounts.get(loadoutItem.id) ?? 0;
              const remainingCount = loadoutItem.quantity - selectedCount;
              const isCurrentItem = item?.id === loadoutItem.id;
              const isUnavailable = remainingCount <= 0 && !isCurrentItem;

              return (
                <button
                  key={loadoutItem.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => {
                    onSelect(loadoutItem.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none hover:bg-zinc-800/80 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
                    isCurrentItem
                      ? "border-zinc-400 bg-zinc-800/70"
                      : "border-white/8 bg-zinc-950/40",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/6 text-zinc-300">
                    <ItemIcon icon={loadoutItem.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {loadoutItem.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isCurrentItem ? (
                      <Check className="size-4 text-zinc-200" />
                    ) : (
                      `Còn ${Math.max(0, remainingCount)}`
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {item && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              setIsOpen(false);
            }}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-300/20 text-rose-300 transition-colors hover:bg-rose-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" /> Bỏ khỏi ô này
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
