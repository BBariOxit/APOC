"use client";

import {
  ArrowRight,
  CircleAlert,
  Footprints,
  MessageSquareText,
  Newspaper,
  PackageOpen,
  Route,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  mockCurrentEvents,
  mockDailyUpdates,
  mockInventory,
  mockPreviousDayChanges,
  mockReturnJourney,
} from "@/features/game/mock-data";
import { CharactersPanel } from "@/features/game/components/characters-panel";
import type { CareAction } from "@/features/game/components/character-card";
import { DailyPanel } from "@/features/game/components/daily-panel";
import { EventPanel } from "@/features/game/components/event-panel";
import { ExpeditionPanel } from "@/features/game/components/expedition-panel";
import { MAX_LOADOUT_SLOTS } from "@/features/game/expedition";
import { GameHeader } from "@/features/game/components/game-header";
import { InventoryPanel } from "@/features/game/components/inventory-panel";
import { ItemIcon } from "@/features/game/components/item-icon";
import { ReturnJourneyPanel } from "@/features/game/components/return-journey-panel";
import { PlayerAuthDialog } from "@/features/game/components/player-auth-dialog";
import {
  MAX_EVENTS_PER_DAY,
  SHOWCASE_ALL_EVENT_RARITIES,
} from "@/features/game/config";
import type {
  CurrentEvent,
  DailyUpdate,
  DailyTask,
  GameCharacter,
  GameTab,
  InventoryItem,
} from "@/features/game/types";
import type {
  GameApiEnvelope,
  GameRunDto,
  GameRunInventoryDto,
} from "@/features/game/api-types";

interface CareRequest {
  character: GameCharacter;
  action: CareAction;
}

interface GameNavigationTab {
  value: GameTab;
  label: string;
  icon: LucideIcon;
  mobileOnly?: boolean;
  returnOnly?: boolean;
}

const gameNavigationTabs: GameNavigationTab[] = [
  { value: "daily", label: "Hằng ngày", icon: Newspaper },
  { value: "journey", label: "Hành trình", icon: Route, returnOnly: true },
  { value: "event", label: "Sự kiện", icon: MessageSquareText },
  { value: "characters", label: "Nhân vật", icon: Users },
  { value: "expedition", label: "Thám hiểm", icon: Footprints },
  {
    value: "inventory",
    label: "Kho đồ",
    icon: PackageOpen,
    mobileOnly: true,
  },
];

const previewEvents = SHOWCASE_ALL_EVENT_RARITIES
  ? mockCurrentEvents
  : mockCurrentEvents.slice(0, MAX_EVENTS_PER_DAY);
const emptyResolvedChoices: Record<string, string> = {};

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

class GameApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function gameRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const payload = (await response.json().catch(() => ({}))) as GameApiEnvelope<T>;
  if (!response.ok || !("data" in payload)) {
    throw new GameApiError(
      payload.error?.code ?? "REQUEST_FAILED",
      payload.error?.message ?? "Không thể tải dữ liệu trò chơi.",
      response.status,
    );
  }
  return payload.data as T;
}

function displayLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function mapCharacters(run: GameRunDto): GameCharacter[] {
  return run.characters.map((character) => ({
    id: character.key,
    name: character.name,
    initials: character.name.slice(0, 2).toLocaleUpperCase("vi"),
    role: character.description || "Người sống sót",
    baseLoadoutSlots: 3,
    state: character.state,
    stats: character.stats,
    conditions: character.conditions.map((condition) => ({
      label: displayLabel(condition.key),
      tone: condition.severity && condition.severity >= 2 ? "danger" : "warning",
    })),
  }));
}

function itemIcon(item: GameRunInventoryDto): InventoryItem["icon"] {
  const hint = `${item.key} ${item.name}`.toLocaleLowerCase("vi");
  if (item.category === "food") return "can";
  if (item.category === "water") return "water";
  if (item.category === "medical") return hint.includes("băng") ? "bandage" : "medicine";
  if (hint.includes("radio")) return "radio";
  if (hint.includes("đèn") || hint.includes("flash")) return "flashlight";
  if (item.category === "quest" || hint.includes("bản đồ")) return "map";
  return "axe";
}

function mapInventory(run: GameRunDto): InventoryItem[] {
  return run.inventory.flatMap((item) => {
    const category: InventoryItem["category"] =
      item.category === "weapon" ? "tool" : item.category;
    const common = {
      key: item.key,
      name: item.name,
      shortName: item.name,
      shortDescription: item.description,
      description: item.description,
      category,
      icon: itemIcon(item),
      usable: ["food", "water", "medical"].includes(category),
    };
    return [
      ...(item.intactQuantity > 0
        ? [{ ...common, id: `${item.key}-intact`, condition: "intact" as const, quantity: item.intactQuantity }]
        : []),
      ...(item.brokenQuantity > 0
        ? [{ ...common, id: `${item.key}-broken`, condition: "broken" as const, quantity: item.brokenQuantity }]
        : []),
    ];
  });
}

function mapEvents(run: GameRunDto): CurrentEvent[] {
  return run.pendingEvents.map((event) => ({
    id: event.instanceId,
    title: event.name,
    description: event.description,
    category: event.category,
    rarity: event.rarity,
    day: event.generatedDay,
    location: "Hầm trú ẩn",
    choices: event.choices.map((choice) => ({
      id: choice.key,
      label: choice.label,
      description: choice.description,
      available: choice.available,
      unavailableReason: choice.unavailableReason,
      result: {
        title: "Lựa chọn đã được ghi nhận",
        description: "Kết quả sẽ được tính bởi game engine.",
        effects: [],
      },
    })),
  }));
}

export function GameplayScreen() {
  const [run, setRun] = useState<GameRunDto | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [apiError, setApiError] = useState<GameApiError | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GameTab>("daily");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    mockInventory[0]?.id ?? null,
  );
  const [selectedExpeditionCharacterId, setSelectedExpeditionCharacterId] =
    useState<string | null>(null);
  const [selectedLoadoutIds, setSelectedLoadoutIds] = useState<
    Array<string | null>
  >(() => Array.from({ length: MAX_LOADOUT_SLOTS }, () => null));
  const [careRequest, setCareRequest] = useState<CareRequest | null>(null);
  const [completedCareActions, setCompletedCareActions] = useState<string[]>([]);
  const [hasUnreadReturnReport, setHasUnreadReturnReport] = useState(true);

  const loadRun = useCallback(async () => {
    setApiError(null);
    try {
      const nextRun = await gameRequest<GameRunDto | null>("/api/game-runs");
      const session = await getSession();
      setAuthenticated(true);
      setIsAdmin(session?.user.role === "admin");
      setRun(nextRun);
    } catch (caught) {
      const nextError = caught instanceof GameApiError
        ? caught
        : new GameApiError("NETWORK_ERROR", "Không kết nối được máy chủ.", 0);
      if (nextError.status === 401) {
        setAuthenticated(false);
        setIsAdmin(false);
        setRun(null);
      } else {
        setApiError(nextError);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    gameRequest<GameRunDto | null>("/api/game-runs")
      .then((nextRun) => {
        if (!active) return;
        setAuthenticated(true);
        setRun(nextRun);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        const nextError = caught instanceof GameApiError
          ? caught
          : new GameApiError("NETWORK_ERROR", "Không kết nối được máy chủ.", 0);
        if (nextError.status === 401) {
          setAuthenticated(false);
          setRun(null);
        } else {
          setApiError(nextError);
        }
      });
    getSession().then((session) => {
      if (active) setIsAdmin(session?.user.role === "admin");
    });
    return () => {
      active = false;
    };
  }, []);

  const characters = useMemo(
    () => (run ? mapCharacters(run) : mockCharacters),
    [run],
  );
  const inventory = useMemo(
    () => (run ? mapInventory(run) : mockInventory),
    [run],
  );
  const events = useMemo(
    () => (run ? mapEvents(run) : previewEvents),
    [run],
  );
  const activeResolvedChoices = emptyResolvedChoices;
  const returnJourney = run ? null : mockReturnJourney;
  const visibleNavigationTabs = gameNavigationTabs.filter(
    (tab) => !tab.returnOnly || returnJourney !== null,
  );

  const aliveCount = characters.filter(
    (character) => character.state !== "dead",
  ).length;
  const unresolvedEvents = useMemo(
    () => events.filter((event) => !activeResolvedChoices[event.id]),
    [activeResolvedChoices, events],
  );
  const pendingEventItemKeys = useMemo(
    () =>
      Array.from(
        new Set(
          unresolvedEvents.flatMap((event) =>
            event.choices.flatMap((choice) =>
              choice.requiredItem ? [choice.requiredItem.itemKey] : [],
            ),
          ),
        ),
      ),
    [unresolvedEvents],
  );
  const canEndDay = Boolean(
    authenticated && run?.status === "active" && unresolvedEvents.length === 0 && !mutating,
  );
  const careItems = useMemo(() => {
    if (!careRequest) {
      return [];
    }

    return inventory.filter(
      (item) =>
        item.condition === "intact" &&
        item.quantity > 0 &&
        careLabels[careRequest.action].categories.includes(item.category),
    );
  }, [careRequest, inventory]);
  const dailyTasks = useMemo<DailyTask[]>(() => {
    const tasks: DailyTask[] = [];

    if (unresolvedEvents.length > 0) {
      const [firstEvent] = unresolvedEvents;

      tasks.push({
        id: "pending-event",
        type: "event",
        title:
          unresolvedEvents.length === 1
            ? firstEvent.title
            : `${unresolvedEvents.length} sự kiện chờ xử lý`,
        description:
          unresolvedEvents.length === 1
            ? "Cần đưa ra lựa chọn trước khi qua ngày."
            : "Cần xử lý lần lượt trước khi qua ngày.",
        actionLabel: "Xử lý",
        destination: "event",
      });
    }

    return tasks;
  }, [unresolvedEvents]);

  const visibleSelectedItemId = inventory.some((item) => item.id === selectedItemId)
    ? selectedItemId
    : inventory[0]?.id ?? null;

  const day = run?.day ?? 12;
  const dailyUpdates: DailyUpdate[] = run?.lastResult
    ? [{
        id: `run-${run.revision}`,
        kind: "outcome",
        label: "Kết quả mới nhất",
        title: run.lastResult.title,
        description: run.lastResult.description,
        time: "Gần đây",
        effects: run.lastResult.effects.map((label) => ({ label, tone: "neutral" as const })),
      }]
    : run
      ? []
      : mockDailyUpdates;
  const ambientUpdates = dailyUpdates.filter((update) => update.kind === "ambient");
  const expeditionUpdates = dailyUpdates.filter((update) => update.kind === "return");
  const recentResults = dailyUpdates.filter((update) => update.kind === "outcome");
  const previousDayChanges = run ? [] : mockPreviousDayChanges;

  function handleNavigate(tab: GameTab) {
    setActiveTab(tab);

    if (tab === "journey") {
      setHasUnreadReturnReport(false);
    }
  }

  function activeRunOrPrompt(): GameRunDto | null {
    if (!authenticated) {
      setAuthDialogOpen(true);
      return null;
    }
    if (!run) {
      toast.info("Hãy bắt đầu một ván mới trước.");
      return null;
    }
    return run;
  }

  async function advanceDay() {
    const activeRun = activeRunOrPrompt();
    if (!activeRun) return;
    setMutating(true);
    try {
      const nextRun = await gameRequest<GameRunDto>(
        `/api/game-runs/${activeRun.id}/advance-day`,
        {
          method: "POST",
          body: JSON.stringify({
            commandId: crypto.randomUUID(),
            expectedRevision: activeRun.revision,
          }),
        },
      );
      setRun(nextRun);
      setActiveTab(nextRun.pendingEvents.length ? "event" : "daily");
      toast.success(`Đã sang ngày ${nextRun.day}.`);
    } catch (caught) {
      const error = caught as GameApiError;
      toast.error(error.message);
      if (error.code === "EDIT_CONFLICT") await loadRun();
    } finally {
      setMutating(false);
    }
  }

  async function handleResolveEvent(eventId: string, choiceId: string) {
    const activeRun = activeRunOrPrompt();
    if (!activeRun) return;
    setMutating(true);
    try {
      const nextRun = await gameRequest<GameRunDto>(
        `/api/game-runs/${activeRun.id}/events/${encodeURIComponent(eventId)}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({
            commandId: crypto.randomUUID(),
            expectedRevision: activeRun.revision,
            intentKey: choiceId,
          }),
        },
      );
      setRun(nextRun);
      toast.success(nextRun.lastResult?.title ?? "Lựa chọn đã được lưu", {
        description: nextRun.lastResult?.description,
      });
      if (nextRun.pendingEvents.length === 0) setActiveTab("daily");
    } catch (caught) {
      const error = caught as GameApiError;
      toast.error(error.message);
      if (error.code === "EDIT_CONFLICT") await loadRun();
    } finally {
      setMutating(false);
    }
  }

  function handleCare(character: GameCharacter, action: CareAction) {
    if (!activeRunOrPrompt()) return;
    setCareRequest({ character, action });
  }

  function handleCareReturnedCharacter() {
    if (!returnJourney) {
      return;
    }

    const character = characters.find(
      (item) => item.id === returnJourney.characterId,
    );

    if (character) {
      handleCare(character, "hydrate");
    }
  }

  function handleApplyCareItem(item: InventoryItem) {
    if (!careRequest) {
      return;
    }

    const careKey = `${careRequest.character.id}:${careRequest.action}`;
    setCompletedCareActions((current) =>
      Array.from(new Set([...current, careKey])),
    );

    toast.success(`Đã dùng ${item.name} cho ${careRequest.character.name}`);
    setCareRequest(null);
  }

  function handleUseInventoryItem(item: InventoryItem) {
    if (!activeRunOrPrompt()) return;
    handleNavigate("characters");
    toast.info(`Đã chọn ${item.name}`, {
      description: "Chọn hành động trên một nhân vật để tiếp tục.",
    });
  }

  function handleDepart() {
    if (!activeRunOrPrompt()) return;
    const character = characters.find(
      (item) => item.id === selectedExpeditionCharacterId,
    );

    if (!character) {
      return;
    }

    toast.info(`Đã chuẩn bị hành trang cho ${character.name}`, {
      description: "Lệnh thám hiểm sẽ được nối với game engine ở bước runtime tiếp theo.",
    });
  }

  function handleMenuAction(
    action: "achievements" | "settings" | "leave",
  ) {
    if (action === "leave") {
      void logOutPlayer();
      return;
    }
    const messages = {
      achievements: "Trang thành tựu sẽ được mở từ đây.",
      settings: "Cài đặt trò chơi sẽ được mở từ đây.",
      leave: "",
    };

    toast.info(messages[action]);
  }

  async function logOutPlayer() {
    await signOut({ redirect: false });
    setAuthenticated(false);
    setIsAdmin(false);
    setRun(null);
    setApiError(null);
    toast.success("Đã đăng xuất. Giao diện game vẫn mở ở chế độ xem trước.");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <GameHeader
        day={day}
        aliveCount={aliveCount}
        canEndDay={canEndDay}
        pendingEventCount={unresolvedEvents.length}
        authenticated={authenticated}
        isAdmin={isAdmin}
        onLogin={() => setAuthDialogOpen(true)}
        onEndDay={advanceDay}
        onOpenEvent={() => handleNavigate("event")}
        onMenuAction={handleMenuAction}
      />

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-5 sm:px-6 sm:py-6 lg:px-8">
        {run && apiError ? (
          <div className="mb-5">
            <div className="flex items-center gap-3 rounded-xl border border-red-300/15 bg-red-300/5 px-4 py-3 text-sm text-red-200">
              <CircleAlert className="size-4" />
              <span className="min-w-0 flex-1">{apiError.message}</span>
              <Button variant="outline" size="sm" onClick={loadRun}>Tải lại</Button>
            </div>
          </div>
        ) : null}

        <Tabs
          value={activeTab}
          onValueChange={(value) => handleNavigate(value as GameTab)}
          className="gap-5"
        >
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.8fr)] xl:gap-6">
            <div className="min-w-0">
              <TabsList
                variant="line"
                className="mb-5 h-10 w-full max-w-full justify-start gap-1 overflow-x-auto border-b border-white/8 sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {visibleNavigationTabs.map((tab) => {
                  const Icon = tab.icon;

                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={`flex-none px-3 sm:px-4 ${
                        tab.mobileOnly ? "lg:hidden" : ""
                      }`}
                    >
                      <Icon /> {tab.label}
                      {tab.value === "event" && unresolvedEvents.length > 0 && (
                        <span className="grid min-w-4 place-items-center rounded-full bg-amber-300/15 px-1 font-mono text-[10px] leading-4 text-amber-200">
                          {unresolvedEvents.length}
                        </span>
                      )}
                      {tab.value === "journey" && hasUnreadReturnReport && (
                        <span className="size-1.5 rounded-full bg-emerald-300" />
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="daily">
                <DailyPanel
                  day={day}
                  ambients={ambientUpdates}
                  previousDayChanges={previousDayChanges}
                  pendingEvents={dailyTasks}
                  expeditionUpdates={expeditionUpdates}
                  recentResults={recentResults}
                  onNavigate={handleNavigate}
                  onOpenJournal={() =>
                    toast.info("Nhật ký đầy đủ sẽ được mở từ đây.")
                  }
                />
              </TabsContent>
              {returnJourney && (
                <TabsContent value="journey">
                  <ReturnJourneyPanel
                    report={returnJourney}
                    needsCare={
                      !completedCareActions.includes(
                        `${returnJourney.characterId}:hydrate`,
                      )
                    }
                    onBackToDaily={() => handleNavigate("daily")}
                    onCareCharacter={handleCareReturnedCharacter}
                  />
                </TabsContent>
              )}
              <TabsContent value="event">
                <EventPanel
                  events={events}
                  inventory={inventory}
                  resolvedChoices={activeResolvedChoices}
                  onResolve={handleResolveEvent}
                  onFinish={() => handleNavigate("daily")}
                />
              </TabsContent>
              <TabsContent value="characters">
                  <CharactersPanel
                  characters={characters}
                  onCare={handleCare}
                />
              </TabsContent>
              <TabsContent value="expedition">
                  <ExpeditionPanel
                  characters={characters}
                  inventory={inventory}
                  selectedCharacterId={selectedExpeditionCharacterId}
                  selectedLoadoutIds={selectedLoadoutIds}
                  onSelectCharacter={setSelectedExpeditionCharacterId}
                  onChangeLoadout={setSelectedLoadoutIds}
                  onDepart={handleDepart}
                />
              </TabsContent>
              <TabsContent value="inventory" className="lg:hidden">
                  <InventoryPanel
                  items={inventory}
                  selectedItemId={visibleSelectedItemId}
                  highlightedItemKeys={pendingEventItemKeys}
                  onSelectItem={setSelectedItemId}
                  onUseItem={handleUseInventoryItem}
                />
              </TabsContent>
            </div>

            <div className="sticky top-19 hidden lg:block">
              <InventoryPanel
                items={inventory}
                selectedItemId={visibleSelectedItemId}
                highlightedItemKeys={pendingEventItemKeys}
                onSelectItem={setSelectedItemId}
                onUseItem={handleUseInventoryItem}
                className="max-h-[calc(100vh-5.75rem)]"
              />
            </div>
          </div>
        </Tabs>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-zinc-950/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl sm:hidden">
        <Button
          size="lg"
          className="w-full"
          disabled={!canEndDay}
          title={
            !canEndDay
              ? "Hãy xử lý tất cả sự kiện trước"
              : "Kết thúc ngày hiện tại"
          }
          onClick={advanceDay}
        >
          Qua ngày <ArrowRight />
        </Button>
      </div>

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

      <PlayerAuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onAuthenticated={loadRun}
      />
    </div>
  );
}
