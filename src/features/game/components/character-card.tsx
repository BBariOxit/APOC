"use client";

import {
  ChevronDown,
  Droplets,
  EyeOff,
  HeartPulse,
  Utensils,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatMeter } from "@/features/game/components/stat-meter";
import type { GameCharacter } from "@/features/game/types";
import { cn } from "@/lib/utils";

export type CareAction = "feed" | "hydrate" | "heal";

interface CharacterCardProps {
  character: GameCharacter;
  onCare: (character: GameCharacter, action: CareAction) => void;
}

const stateLabels: Record<GameCharacter["state"], string> = {
  shelter: "Trong hầm",
  expedition: "Đang thám hiểm",
  missing: "Mất tích",
  dead: "Đã chết",
  insane: "Mất kiểm soát",
};

const stateDescriptions: Partial<Record<GameCharacter["state"], string>> = {
  expedition: "Chỉ số và tình trạng sẽ được cập nhật nếu nhân vật trở về.",
  missing: "Chưa có thông tin đáng tin cậy về tình trạng hiện tại.",
  dead: "Nhân vật không còn có thể nhận nhiệm vụ hoặc chăm sóc.",
  insane: "Nhân vật tạm thời không thể nhận chăm sóc trực tiếp.",
};

const conditionStyles = {
  neutral: "border-sky-300/20 bg-sky-300/8 text-sky-200/80",
  warning: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  danger: "border-rose-300/30 bg-rose-300/10 text-rose-200",
};

const tonePriority = {
  neutral: 0,
  warning: 1,
  danger: 2,
};

export function CharacterCard({ character, onCare }: CharacterCardProps) {
  const [showStats, setShowStats] = useState(true);
  const canReceiveCare = character.state === "shelter";
  const sortedConditions = [...character.conditions].sort(
    (first, second) =>
      tonePriority[second.tone] - tonePriority[first.tone],
  );

  return (
    <Card className="self-start gap-0 overflow-hidden border-white/8 bg-zinc-900/70 py-0 shadow-none">
      <CardHeader
        className={cn(
          "flex items-center gap-3 px-4 py-3.5",
          (!canReceiveCare || showStats) && "border-b border-white/6",
        )}
      >
        <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-zinc-600/70 bg-zinc-800 font-mono text-sm font-semibold text-zinc-200">
          {character.initials}
        </div>

        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base font-semibold">
            {character.name}
          </CardTitle>

          {canReceiveCare && sortedConditions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sortedConditions.map((condition) => (
                <Badge
                  key={condition.label}
                  variant="outline"
                  className={cn(
                    "font-normal",
                    conditionStyles[condition.tone],
                  )}
                >
                  {condition.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {canReceiveCare ? (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showStats}
            aria-label={showStats ? "Thu gọn chỉ số" : "Mở rộng chỉ số"}
            onClick={() => setShowStats((current) => !current)}
            className="shrink-0 bg-transparent px-2 text-zinc-400 hover:bg-white/5 aria-expanded:bg-transparent"
          >
            <span className="hidden sm:inline">Chỉ số</span>
            <ChevronDown
              className={cn(
                "transition-transform duration-200",
                !showStats && "-rotate-90",
              )}
            />
          </Button>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[10px] uppercase tracking-wide",
              character.state === "expedition"
                ? "border-sky-300/30 bg-sky-300/10 text-sky-200"
                : "border-zinc-500/50 bg-zinc-500/10 text-zinc-300",
            )}
          >
            {stateLabels[character.state]}
          </Badge>
        )}
      </CardHeader>

      {!canReceiveCare ? (
        <CardContent className="px-4 py-4">
          <div className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-600/50 bg-zinc-950/30 px-3.5 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400">
              <EyeOff className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                {character.state === "expedition"
                  ? "Không có thông tin từ bên ngoài"
                  : stateLabels[character.state]}
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {stateDescriptions[character.state]}
              </p>
            </div>
          </div>
        </CardContent>
      ) : (
        <>
          {showStats && (
            <CardContent className="px-4 py-4">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                <StatMeter label="Sức khỏe" value={character.stats.health} />
                <StatMeter
                  label="Dinh dưỡng"
                  value={character.stats.satiety}
                />
                <StatMeter label="Nước" value={character.stats.hydration} />
                <StatMeter label="Tinh thần" value={character.stats.sanity} />
              </div>
            </CardContent>
          )}

          <CardFooter className="grid grid-cols-3 gap-2 border-t border-white/6 bg-black/10 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCare(character, "feed")}
            >
              <Utensils /> Ăn
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCare(character, "hydrate")}
            >
              <Droplets /> Uống
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCare(character, "heal")}
            >
              <HeartPulse /> Chữa trị
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
