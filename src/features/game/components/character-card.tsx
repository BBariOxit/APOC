import {
  Activity,
  Droplets,
  EyeOff,
  HeartPulse,
  Utensils,
} from "lucide-react";

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

const conditionStyles = {
  neutral: "border-white/10 bg-white/5 text-zinc-300",
  warning: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  danger: "border-red-400/20 bg-red-400/10 text-red-200",
};

export function CharacterCard({ character, onCare }: CharacterCardProps) {
  const canReceiveCare = character.state === "shelter";

  return (
    <Card className="gap-0 overflow-hidden border-white/8 bg-zinc-900/70 py-0 shadow-none">
      <CardHeader className="flex-row items-center gap-3 border-b border-white/6 px-4 py-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-zinc-800 font-mono text-sm font-semibold text-zinc-200">
          {character.initials}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{character.name}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{character.role}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 border-white/10 text-[10px] uppercase tracking-wide",
            character.state === "expedition" &&
              "border-sky-400/20 bg-sky-400/10 text-sky-200",
          )}
        >
          {stateLabels[character.state]}
        </Badge>
      </CardHeader>

      {character.state === "expedition" ? (
        <CardContent className="px-4 py-5">
          <div className="flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-white/10 bg-zinc-950/30 px-4 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400">
              <EyeOff className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                Không có thông tin từ bên ngoài
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Chỉ số và tình trạng sẽ được cập nhật nếu nhân vật trở về.
              </p>
            </div>
          </div>
        </CardContent>
      ) : (
        <>
          <CardContent className="space-y-4 px-4 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <StatMeter label="Sức khỏe" value={character.stats.health} />
              <StatMeter label="No bụng" value={character.stats.satiety} />
              <StatMeter label="Đủ nước" value={character.stats.hydration} />
              <StatMeter label="Tinh thần" value={character.stats.sanity} />
            </div>

            <div className="flex min-h-6 flex-wrap gap-1.5">
              {character.conditions.length > 0 ? (
                character.conditions.map((condition) => (
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
                ))
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Activity className="size-3.5" /> Không có tình trạng đặc biệt
                </span>
              )}
            </div>
          </CardContent>

          {canReceiveCare && (
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
          )}
        </>
      )}
    </Card>
  );
}
