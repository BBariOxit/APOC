"use client";

import {
  ArrowRight,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  PackageOpen,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  GameApiEnvelope,
  GameRunDto,
  GameRunEventDto,
} from "@/features/game/api-types";
import { cn } from "@/lib/utils";

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
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  const payload = (await response.json().catch(() => ({}))) as GameApiEnvelope<T>;
  if (!response.ok || !payload.data) {
    throw new GameApiError(
      payload.error?.code ?? "REQUEST_FAILED",
      payload.error?.message ?? "Không thể tải dữ liệu trò chơi.",
      response.status,
    );
  }
  return payload.data;
}

const statLabels = {
  health: "Sức khỏe",
  satiety: "Dinh dưỡng",
  hydration: "Nước",
  sanity: "Tinh thần",
};

const stateLabels = {
  shelter: "Trong hầm",
  expedition: "Đang thám hiểm",
  missing: "Mất tích",
  dead: "Đã chết",
  insane: "Mất kiểm soát",
};

const rarityLabels = {
  common: "Thường",
  uncommon: "Ít gặp",
  rare: "Hiếm",
  ultra_rare: "Cực hiếm",
};

const rarityClasses = {
  common: "border-white/10 text-zinc-400",
  uncommon: "border-sky-300/20 bg-sky-300/5 text-sky-200",
  rare: "border-violet-300/20 bg-violet-300/5 text-violet-200",
  ultra_rare: "border-amber-200/25 bg-amber-300/5 text-amber-100",
};

export function GameplayScreen() {
  const [run, setRun] = useState<GameRunDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<GameApiError | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("overview");

  const loadRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/game-runs", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as GameApiEnvelope<GameRunDto | null>;
      if (!response.ok) {
        throw new GameApiError(
          payload.error?.code ?? "REQUEST_FAILED",
          payload.error?.message ?? "Không thể tải dữ liệu trò chơi.",
          response.status,
        );
      }
      setRun(payload.data ?? null);
    } catch (caught) {
      setError(
        caught instanceof GameApiError
          ? caught
          : new GameApiError("NETWORK_ERROR", "Không kết nối được máy chủ.", 0),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/game-runs", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as GameApiEnvelope<GameRunDto | null>;
        if (!response.ok) {
          throw new GameApiError(
            payload.error?.code ?? "REQUEST_FAILED",
            payload.error?.message ?? "Không thể tải dữ liệu trò chơi.",
            response.status,
          );
        }
        if (active) setRun(payload.data ?? null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof GameApiError
            ? caught
            : new GameApiError("NETWORK_ERROR", "Không kết nối được máy chủ.", 0),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function createRun() {
    setMutating(true);
    setError(null);
    try {
      setRun(
        await gameRequest<GameRunDto>("/api/game-runs", {
          method: "POST",
          body: JSON.stringify({ mode: "normal" }),
        }),
      );
      toast.success("Đã tạo ván từ content đang publish");
    } catch (caught) {
      setError(caught as GameApiError);
    } finally {
      setMutating(false);
    }
  }

  async function advanceDay() {
    if (!run) return;
    setMutating(true);
    try {
      const next = await gameRequest<GameRunDto>(`/api/game-runs/${run.id}/advance-day`, {
        method: "POST",
        body: JSON.stringify({ commandId: crypto.randomUUID(), expectedRevision: run.revision }),
      });
      setRun(next);
      setActiveTab(next.pendingEvents.length ? "events" : "overview");
      toast.success(`Đã sang ngày ${next.day}`);
    } catch (caught) {
      const apiError = caught as GameApiError;
      toast.error(apiError.message);
      if (apiError.code === "EDIT_CONFLICT") await loadRun();
    } finally {
      setMutating(false);
    }
  }

  async function resolvePendingEvent(event: GameRunEventDto) {
    if (!run) return;
    const intentKey = selectedChoices[event.instanceId];
    if (!intentKey) return;
    setMutating(true);
    try {
      const next = await gameRequest<GameRunDto>(
        `/api/game-runs/${run.id}/events/${encodeURIComponent(event.instanceId)}/resolve`,
        {
          method: "POST",
          body: JSON.stringify({ commandId: crypto.randomUUID(), expectedRevision: run.revision, intentKey }),
        },
      );
      setRun(next);
      setSelectedChoices((current) => {
        const copy = { ...current };
        delete copy[event.instanceId];
        return copy;
      });
      toast.success(next.lastResult?.title ?? "Đã xử lý sự kiện");
    } catch (caught) {
      const apiError = caught as GameApiError;
      toast.error(apiError.message);
      if (apiError.code === "EDIT_CONFLICT") await loadRun();
    } finally {
      setMutating(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-400">
        <LoaderCircle className="size-6 animate-spin" aria-label="Đang tải" />
      </main>
    );
  }

  if (error || !run) {
    const unauthenticated = error?.status === 401;
    const noPublishedContent = error?.code === "NO_PUBLISHED_CONTENT";
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-zinc-100">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900/70 shadow-none">
          <CardHeader>
            <CardTitle>{unauthenticated ? "Cần đăng nhập" : "Bắt đầu ván mới"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-zinc-400">
              {error?.message ?? "Ván mới sẽ dùng đúng snapshot content đang được publish trong admin."}
            </p>
            <div className="flex flex-wrap gap-2">
              {unauthenticated ? (
                <Button render={<Link href="/admin/login" />}>Đăng nhập</Button>
              ) : (
                <Button onClick={createRun} disabled={mutating || noPublishedContent}>
                  {mutating && <LoaderCircle className="animate-spin" />}
                  Tạo ván
                </Button>
              )}
              <Button variant="outline" onClick={loadRun}>
                <RefreshCw /> Tải lại
              </Button>
              {noPublishedContent && (
                <Button variant="outline" render={<Link href="/admin" />}>
                  <Shield /> Mở admin <ExternalLink />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const aliveCount = run.characters.filter(({ state }) => state !== "dead").length;
  const canAdvance = run.status === "active" && run.pendingEvents.length === 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <span className="font-semibold tracking-[0.16em]">APOC</span>
          <Badge variant="secondary" className="font-mono">Ngày {run.day}</Badge>
          <span className="hidden text-xs text-zinc-500 sm:inline">Content {run.contentVersion}</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
            <Users className="size-3.5" /> {aliveCount}
          </span>
          <Button variant="outline" size="sm" render={<Link href="/admin" />}>
            <Shield /> <span className="hidden sm:inline">Admin</span>
          </Button>
          <Button size="sm" disabled={!canAdvance || mutating} onClick={advanceDay}>
            {mutating ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
            Qua ngày
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {run.ending && (
          <Card className="mb-6 border-amber-300/20 bg-amber-300/5 shadow-none">
            <CardHeader><CardTitle>{run.ending.name}</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-6 text-zinc-300">{run.ending.description}</p></CardContent>
          </Card>
        )}

        {run.lastResult && (
          <Card className="mb-6 border-emerald-300/15 bg-emerald-300/5 shadow-none">
            <CardHeader><CardTitle className="text-lg">{run.lastResult.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-zinc-300">{run.lastResult.description}</p>
              {run.lastResult.effects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {run.lastResult.effects.map((effect, index) => <Badge key={`${effect}:${index}`} variant="outline">{effect}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Nhân vật</TabsTrigger>
            <TabsTrigger value="events">
              Sự kiện
              {run.pendingEvents.length > 0 && <span className="ml-1 rounded-full bg-amber-300/15 px-1.5 font-mono text-[10px] text-amber-200">{run.pendingEvents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="inventory">Kho đồ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <CharacterGrid run={run} />
          </TabsContent>
          <TabsContent value="events" className="mt-5 space-y-4">
            {run.pendingEvents.length === 0 ? (
              <EmptyState icon={CircleAlert} text="Không có sự kiện chờ xử lý." />
            ) : run.pendingEvents.map((event) => (
              <EventCard
                key={event.instanceId}
                event={event}
                selected={selectedChoices[event.instanceId]}
                disabled={mutating}
                onSelect={(choice) => setSelectedChoices((current) => ({ ...current, [event.instanceId]: choice }))}
                onResolve={() => resolvePendingEvent(event)}
              />
            ))}
          </TabsContent>
          <TabsContent value="inventory" className="mt-5">
            <InventoryGrid run={run} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CharacterGrid({ run }: { run: GameRunDto }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {run.characters.map((character) => (
        <Card key={character.key} className="border-white/8 bg-zinc-900/60 shadow-none">
          <CardHeader className="flex-row items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/6 font-mono font-semibold">
              {character.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle>{character.name}</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">{stateLabels[character.state]}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(character.stats).map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>{statLabels[key as keyof typeof statLabels]}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className={cn("h-full rounded-full", value <= 25 ? "bg-red-400" : value <= 50 ? "bg-amber-300" : "bg-emerald-300")} style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {character.conditions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {character.conditions.map((condition) => <Badge key={condition.key} variant="outline">{condition.key}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EventCard({
  event,
  selected,
  disabled,
  onSelect,
  onResolve,
}: {
  event: GameRunEventDto;
  selected?: string;
  disabled: boolean;
  onSelect: (choice: string) => void;
  onResolve: () => void;
}) {
  return (
    <Card className={cn("overflow-hidden bg-zinc-900/60 shadow-none", rarityClasses[event.rarity])}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={rarityClasses[event.rarity]}>{rarityLabels[event.rarity]}</Badge>
          <span className="text-xs text-zinc-500">Ngày {event.generatedDay} · {event.category}</span>
        </div>
        <CardTitle className="mt-2 text-2xl">{event.name}</CardTitle>
        <p className="max-w-3xl text-sm leading-6 text-zinc-300">{event.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {event.choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            disabled={disabled || !choice.available}
            onClick={() => onSelect(choice.key)}
            className={cn(
              "block w-full rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45",
              selected === choice.key ? "border-zinc-400 bg-zinc-800" : "border-white/8 bg-zinc-950/40 hover:bg-zinc-900",
            )}
          >
            <span className="font-medium">{choice.label}</span>
            {(choice.description || choice.unavailableReason) && (
              <span className="mt-1 block text-sm text-zinc-500">{choice.available ? choice.description : choice.unavailableReason}</span>
            )}
          </button>
        ))}
        <div className="flex justify-end pt-2">
          <Button disabled={!selected || disabled} onClick={onResolve}>Xác nhận <ArrowRight /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryGrid({ run }: { run: GameRunDto }) {
  const items = useMemo(
    () => run.inventory.flatMap((item) => [
      ...(item.intactQuantity > 0 ? [{ ...item, condition: "Nguyên vẹn", quantity: item.intactQuantity }] : []),
      ...(item.brokenQuantity > 0 ? [{ ...item, condition: "Bị hỏng", quantity: item.brokenQuantity }] : []),
    ]),
    [run.inventory],
  );
  if (items.length === 0) return <EmptyState icon={PackageOpen} text="Kho đồ đang trống." />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={`${item.key}:${item.condition}`} className="border-white/8 bg-zinc-900/60 shadow-none">
          <CardHeader className="flex-row items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/6 font-mono">{item.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">{item.name}</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">{item.category} · {item.condition}</p>
            </div>
            <Badge variant="secondary" className="font-mono">×{item.quantity}</Badge>
          </CardHeader>
          <CardContent><p className="text-sm leading-6 text-zinc-400">{item.description}</p></CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof CircleAlert; text: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-white/10 text-center text-zinc-500">
      <div><Icon className="mx-auto size-5" /><p className="mt-2 text-sm">{text}</p></div>
    </div>
  );
}
