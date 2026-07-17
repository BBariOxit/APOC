"use client";

import {
  Footprints,
  Newspaper,
  PackageOpen,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  mockCharacters,
  mockCurrentEvent,
  mockDailyUpdates,
  mockInventory,
} from "@/features/game/mock-data";
import { CharactersPanel } from "@/features/game/components/characters-panel";
import type { CareAction } from "@/features/game/components/character-card";
import { DailyPanel } from "@/features/game/components/daily-panel";
import { EventPanel } from "@/features/game/components/event-panel";
import { ExpeditionPanel } from "@/features/game/components/expedition-panel";
import { GameHeader } from "@/features/game/components/game-header";
import { InventoryPanel } from "@/features/game/components/inventory-panel";
import { ItemIcon } from "@/features/game/components/item-icon";
import type {
  GameCharacter,
  GameTab,
  InventoryItem,
} from "@/features/game/types";

interface CareRequest {
  character: GameCharacter;
  action: CareAction;
}

const careLabels: Record<
  CareAction,
  { title: string; description: string; categories: InventoryItem["category"][] }
> = {
  feed: {
    title: "Chọn thức ăn",
    description: "Chọn một khẩu phần để cho nhân vật sử dụng.",
    categories: ["food"],
  },
  hydrate: {
    title: "Chọn nước uống",
    description: "Mỗi lần sử dụng sẽ tiêu hao một đơn vị nước sạch.",
    categories: ["water"],
  },
  heal: {
    title: "Chọn vật phẩm y tế",
    description: "Hiệu quả phụ thuộc vào tình trạng hiện tại của nhân vật.",
    categories: ["medical"],
  },
};

export function GameplayScreen() {
  const [activeTab, setActiveTab] = useState<GameTab>("daily");
  const [resolvedChoiceId, setResolvedChoiceId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    mockInventory[0]?.id ?? null,
  );
  const [selectedExpeditionCharacterId, setSelectedExpeditionCharacterId] =
    useState<string | null>(null);
  const [selectedLoadoutIds, setSelectedLoadoutIds] = useState<string[]>([]);
  const [careRequest, setCareRequest] = useState<CareRequest | null>(null);

  const aliveCount = mockCharacters.filter(
    (character) => character.state !== "dead",
  ).length;
  const careItems = useMemo(() => {
    if (!careRequest) {
      return [];
    }

    return mockInventory.filter(
      (item) =>
        item.condition === "intact" &&
        item.quantity > 0 &&
        careLabels[careRequest.action].categories.includes(item.category),
    );
  }, [careRequest]);

  function handleResolveEvent(choiceId: string) {
    setResolvedChoiceId(choiceId);
    toast.success("Lựa chọn đã được lưu", {
      description: "Kết quả có thể ảnh hưởng đến những ngày tiếp theo.",
    });
  }

  function handleCare(character: GameCharacter, action: CareAction) {
    setCareRequest({ character, action });
  }

  function handleApplyCareItem(item: InventoryItem) {
    if (!careRequest) {
      return;
    }

    toast.success(`Đã dùng ${item.name} cho ${careRequest.character.name}`);
    setCareRequest(null);
  }

  function handleUseInventoryItem(item: InventoryItem) {
    setActiveTab("characters");
    toast.info(`Đã chọn ${item.name}`, {
      description: "Chọn hành động trên một nhân vật để tiếp tục.",
    });
  }

  function handleToggleLoadout(itemId: string, checked: boolean) {
    setSelectedLoadoutIds((current) =>
      checked
        ? Array.from(new Set([...current, itemId]))
        : current.filter((id) => id !== itemId),
    );
  }

  function handleDepart() {
    const character = mockCharacters.find(
      (item) => item.id === selectedExpeditionCharacterId,
    );

    if (!character) {
      return;
    }

    toast.success(`${character.name} đã sẵn sàng xuất phát`, {
      description: `${selectedLoadoutIds.length} loại vật tư đã được chọn.`,
    });
  }

  function handleMenuAction(
    action: "achievements" | "settings" | "leave",
  ) {
    const messages = {
      achievements: "Trang thành tựu sẽ được mở từ đây.",
      settings: "Cài đặt trò chơi sẽ được mở từ đây.",
      leave: "Ván hiện tại đã được lưu an toàn.",
    };

    toast.info(messages[action]);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <GameHeader
        day={12}
        aliveCount={aliveCount}
        canEndDay={resolvedChoiceId !== null}
        onEndDay={() =>
          toast.success("Ngày 12 đã hoàn tất", {
            description: "Game engine sẽ tạo diễn biến cho ngày tiếp theo.",
          })
        }
        onMenuAction={handleMenuAction}
      />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as GameTab)}
          className="gap-5"
        >
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)] xl:gap-6">
            <div className="min-w-0">
              <TabsList
                variant="line"
                className="mb-5 h-10 w-full max-w-full justify-start overflow-x-auto border-b border-white/8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <TabsTrigger value="daily" className="px-3">
                  <Newspaper /> Hằng ngày
                </TabsTrigger>
                <TabsTrigger value="event" className="px-3">
                  <Sparkles /> Sự kiện
                  {resolvedChoiceId === null && (
                    <span className="size-1.5 rounded-full bg-amber-300" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="characters" className="px-3">
                  <Users /> Nhân vật
                </TabsTrigger>
                <TabsTrigger value="expedition" className="px-3">
                  <Footprints /> Thám hiểm
                </TabsTrigger>
                <TabsTrigger value="inventory" className="px-3 lg:hidden">
                  <PackageOpen /> Kho đồ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <DailyPanel
                  updates={mockDailyUpdates}
                  onOpenEvent={() => setActiveTab("event")}
                />
              </TabsContent>
              <TabsContent value="event">
                <EventPanel
                  event={mockCurrentEvent}
                  inventory={mockInventory}
                  resolvedChoiceId={resolvedChoiceId}
                  onResolve={handleResolveEvent}
                />
              </TabsContent>
              <TabsContent value="characters">
                <CharactersPanel
                  characters={mockCharacters}
                  onCare={handleCare}
                />
              </TabsContent>
              <TabsContent value="expedition">
                <ExpeditionPanel
                  characters={mockCharacters}
                  inventory={mockInventory}
                  selectedCharacterId={selectedExpeditionCharacterId}
                  selectedLoadoutIds={selectedLoadoutIds}
                  onSelectCharacter={setSelectedExpeditionCharacterId}
                  onToggleLoadout={handleToggleLoadout}
                  onDepart={handleDepart}
                />
              </TabsContent>
              <TabsContent value="inventory" className="lg:hidden">
                <InventoryPanel
                  items={mockInventory}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  onUseItem={handleUseInventoryItem}
                  className="min-h-[620px]"
                />
              </TabsContent>
            </div>

            <div className="sticky top-21 hidden lg:block">
              <InventoryPanel
                items={mockInventory}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                onUseItem={handleUseInventoryItem}
                className="h-[calc(100vh-6.5rem)] min-h-[580px]"
              />
            </div>
          </div>
        </Tabs>
      </main>

      <Dialog
        open={careRequest !== null}
        onOpenChange={(open) => !open && setCareRequest(null)}
      >
        <DialogContent className="sm:max-w-md">
          {careRequest && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {careLabels[careRequest.action].title} cho {careRequest.character.name}
                </DialogTitle>
                <DialogDescription>
                  {careLabels[careRequest.action].description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {careItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-950/50 p-3"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5">
                      <ItemIcon icon={item.icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Còn {item.quantity} trong kho
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleApplyCareItem(item)}>
                      Sử dụng
                    </Button>
                  </div>
                ))}

                {careItems.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                    <Badge variant="secondary">Kho trống</Badge>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Không có vật phẩm phù hợp cho hành động này.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
