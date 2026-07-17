"use client";

import { CircleAlert, PackageOpen, Wrench } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  highlightedItemKeys?: string[];
  onSelectItem: (itemId: string | null) => void;
  onUseItem: (item: InventoryItem) => void;
  className?: string;
}

const filters: Array<{ value: InventoryFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "food", label: "Đồ ăn" },
  { value: "water", label: "Nước" },
  { value: "medical", label: "Y tế" },
  { value: "tool", label: "Công cụ" },
  { value: "quest", label: "Nhiệm vụ" },
];

const visibleSlotCount = 12;

export function InventoryPanel({
  items,
  selectedItemId,
  highlightedItemKeys = [],
  onSelectItem,
  onUseItem,
  className,
}: InventoryPanelProps) {
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const filteredItems = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.category === filter),
    [filter, items],
  );
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const placeholderCount = Math.max(
    0,
    visibleSlotCount - filteredItems.length,
  );

  function handleFilterChange(nextFilter: InventoryFilter) {
    setFilter(nextFilter);
    setIsDescriptionOpen(false);

    const nextItems =
      nextFilter === "all"
        ? items
        : items.filter((item) => item.category === nextFilter);

    if (!nextItems.some((item) => item.id === selectedItemId)) {
      onSelectItem(nextItems[0]?.id ?? null);
    }
  }

  return (
    <>
      <aside
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/70 [container-type:inline-size]",
          className,
        )}
      >
        <header className="border-b border-white/6 px-4 py-4 sm:px-5">
          <h2 className="text-xl font-semibold tracking-tight">Kho đồ</h2>

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((item) => (
              <Button
                key={item.value}
                variant={filter === item.value ? "secondary" : "ghost"}
                size="xs"
                className="shrink-0"
                onClick={() => handleFilterChange(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </header>

        <div
          className={cn(
            "inventory-scroll min-h-0 shrink p-4 sm:p-5",
            filteredItems.length > visibleSlotCount
              ? "overflow-y-auto"
              : "overflow-y-hidden",
          )}
          style={{ height: "min(calc(75cqw + 0.5rem), 45dvh)" }}
        >
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {filteredItems.map((item) => (
                <InventoryTile
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedItemId}
                  isHighlighted={highlightedItemKeys.includes(item.key)}
                  onSelect={() => onSelectItem(item.id)}
                />
              ))}

              {Array.from({ length: placeholderCount }, (_, index) => (
                <div
                  key={`empty-position-${index}`}
                  aria-hidden="true"
                  className="aspect-square"
                />
              ))}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-white/10 text-center">
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
            <SelectedItemDetails
              item={selectedItem}
              isHighlighted={highlightedItemKeys.includes(selectedItem.key)}
              onUseItem={onUseItem}
              onShowFullDescription={() => setIsDescriptionOpen(true)}
            />
          ) : (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Chọn một vật phẩm để xem thông tin.
            </p>
          )}
        </div>
      </aside>

      <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.name}</DialogTitle>
                <DialogDescription>
                  Thông tin đầy đủ về vật phẩm
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-zinc-950/50 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5">
                  <ItemIcon icon={selectedItem.icon} className="size-5" />
                </span>
                <p className="text-sm leading-6 text-zinc-300">
                  {selectedItem.description}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface InventoryTileProps {
  item: InventoryItem;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
}

function InventoryTile({
  item,
  isSelected,
  isHighlighted,
  onSelect,
}: InventoryTileProps) {
  const isBroken = item.condition === "broken";

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={cn(
        "group relative flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-xl border bg-zinc-950/50 p-2 text-center transition-all hover:-translate-y-0.5 hover:bg-zinc-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isSelected
          ? "border-zinc-400 bg-zinc-800 ring-1 ring-zinc-400/20"
          : "border-white/8",
        isBroken && "border-amber-400/20 bg-amber-400/5 text-zinc-500",
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
      {isHighlighted && !isBroken && (
        <span
          className="absolute left-2 top-2 size-1.5 rounded-full bg-amber-300 shadow-[0_0_0_3px_rgba(252,211,77,0.1)]"
          title="Cần cho sự kiện hiện tại"
        />
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
}

interface SelectedItemDetailsProps {
  item: InventoryItem;
  isHighlighted: boolean;
  onUseItem: (item: InventoryItem) => void;
  onShowFullDescription: () => void;
}

function SelectedItemDetails({
  item,
  isHighlighted,
  onUseItem,
  onShowFullDescription,
}: SelectedItemDetailsProps) {
  const hasLongDescription = item.description.length > 120;

  return (
    <div>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/5",
            item.condition === "broken" &&
              "border-amber-400/15 bg-amber-400/5 text-zinc-500",
          )}
        >
          <ItemIcon icon={item.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">
              {item.name}{" "}
              <span className="font-mono text-xs font-normal text-muted-foreground">
                ×{item.quantity}
              </span>
            </h3>
            {item.condition === "broken" && (
              <Badge
                variant="outline"
                className="border-amber-400/20 bg-amber-400/10 font-normal text-amber-200"
              >
                Bị hỏng
              </Badge>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {item.shortDescription}
      </p>
      {hasLongDescription && (
        <Button
          variant="link"
          size="xs"
          className="mt-1 h-auto p-0 text-xs"
          onClick={onShowFullDescription}
        >
          Xem đầy đủ
        </Button>
      )}
      {isHighlighted && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200/80">
          <CircleAlert className="size-3.5" /> Cần cho sự kiện hiện tại
        </p>
      )}
      <Separator className="my-3" />
      <InventoryAction item={item} onUseItem={onUseItem} />
    </div>
  );
}

interface InventoryActionProps {
  item: InventoryItem;
  onUseItem: (item: InventoryItem) => void;
}

function InventoryAction({ item, onUseItem }: InventoryActionProps) {
  if (item.condition === "broken") {
    return (
      <div>
        <Button variant="outline" size="sm" disabled className="w-full">
          <Wrench /> Sửa chữa
        </Button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Thiếu bộ dụng cụ sửa chữa
        </p>
      </div>
    );
  }

  if (item.usable) {
    return (
      <Button size="sm" className="w-full" onClick={() => onUseItem(item)}>
        Dùng cho nhân vật
      </Button>
    );
  }

  return (
    <p className="py-1 text-xs leading-5 text-muted-foreground">
      {item.category === "quest"
        ? "Vật phẩm này có thể mở khóa một sự kiện."
        : "Được sử dụng trong sự kiện hoặc chuyến thám hiểm."}
    </p>
  );
}
