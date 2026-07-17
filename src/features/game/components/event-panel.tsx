import { Check, Droplets, LockKeyhole, Radio, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CurrentEvent, InventoryItem } from "@/features/game/types";

interface EventPanelProps {
  event: CurrentEvent;
  inventory: InventoryItem[];
  resolvedChoiceId: string | null;
  onResolve: (choiceId: string) => void;
}

export function EventPanel({
  event,
  inventory,
  resolvedChoiceId,
  onResolve,
}: EventPanelProps) {
  const resolvedChoice = event.choices.find(
    (choice) => choice.id === resolvedChoiceId,
  );

  if (resolvedChoice) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
      >
        <header>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="size-3.5" /> Sự kiện đã giải quyết
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{event.title}</h2>
        </header>

        <Card className="border-emerald-300/15 bg-emerald-300/5 shadow-none">
          <CardHeader className="flex-row items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-300/10 text-emerald-200">
              <Check className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">Lựa chọn đã được ghi nhận</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {resolvedChoice.label}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-zinc-300">
            {resolvedChoice.id === "trade-water" ? (
              <>
                <p>
                  Người lạ nhận chai nước rồi trượt một mẩu giấy qua khe cửa.
                  Trên đó là tần số phát sóng và vị trí của một trạm cứu trợ cũ.
                </p>
                <div className="grid gap-2 rounded-lg border border-white/8 bg-black/15 p-3 sm:grid-cols-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Droplets className="size-4" /> Nước sạch: 4 → 3
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Radio className="size-4" /> Mở khóa: Tần số 104.8
                  </span>
                </div>
              </>
            ) : (
              <p>
                Cả nhóm giữ im lặng. Sau vài phút, tiếng bước chân rời khỏi cửa
                hầm và biến mất trong hành lang.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-200/70">
            <span className="size-1.5 rounded-full bg-amber-300" /> Đang chờ
            quyết định
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sự kiện</h2>
        </div>
        <Badge
          variant="outline"
          className="border-violet-300/20 bg-violet-300/10 capitalize text-violet-200"
        >
          {event.rarity} · {event.category}
        </Badge>
      </header>

      <Card className="overflow-hidden border-white/8 bg-zinc-900/70 py-0 shadow-none">
        <div className="h-1 bg-gradient-to-r from-amber-300/70 via-zinc-600 to-transparent" />
        <CardHeader className="px-5 pt-6 sm:px-6">
          <CardTitle className="text-2xl tracking-tight sm:text-3xl">
            {event.title}
          </CardTitle>
          <p className="font-mono text-xs text-muted-foreground">
            Ngày 12 · 21:47 · Cửa hầm phía Bắc
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-6">
          <p className="max-w-2xl text-base leading-7 text-zinc-300">
            {event.description}
          </p>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 border-t border-white/6 bg-black/10 px-5 py-5 sm:px-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Bạn sẽ làm gì?
          </p>
          {event.choices.map((choice) => {
            const availableQuantity = choice.requiredItemKey
              ? inventory
                  .filter(
                    (item) =>
                      item.key === choice.requiredItemKey &&
                      item.condition === "intact",
                  )
                  .reduce((total, item) => total + item.quantity, 0)
              : Number.POSITIVE_INFINITY;
            const isAvailable =
              availableQuantity >= (choice.requiredQuantity ?? 0);

            return (
              <div
                key={choice.id}
                className="flex flex-col gap-3 rounded-xl border border-white/8 bg-zinc-950/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{choice.label}</p>
                    {choice.requiredItemKey && (
                      <Badge variant="secondary" className="font-normal">
                        <Droplets /> Nước x{choice.requiredQuantity}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {choice.description}
                  </p>
                  {!isAvailable && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
                      <LockKeyhole className="size-3" /> Không đủ vật phẩm
                    </p>
                  )}
                </div>
                <Button
                  variant={
                    choice.variant === "primary" ? "default" : "outline"
                  }
                  className="shrink-0 sm:min-w-32"
                  disabled={!isAvailable}
                  onClick={() => onResolve(choice.id)}
                >
                  Chọn
                </Button>
              </div>
            );
          })}
        </CardFooter>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Lựa chọn được lưu ngay lập tức và có thể ảnh hưởng đến những ngày sau.
      </p>
    </motion.section>
  );
}
