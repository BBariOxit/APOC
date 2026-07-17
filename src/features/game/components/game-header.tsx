import {
  ArrowRight,
  Award,
  Check,
  Ellipsis,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GameHeaderProps {
  day: number;
  aliveCount: number;
  canEndDay: boolean;
  onEndDay: () => void;
  onMenuAction: (action: "achievements" | "settings" | "leave") => void;
}

export function GameHeader({
  day,
  aliveCount,
  canEndDay,
  onEndDay,
  onMenuAction,
}: GameHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-white/10 bg-zinc-900">
            <Shield className="size-4 text-zinc-200" />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-[0.18em]">APOC</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Shelter 07
            </p>
          </div>
        </div>

        <div className="mx-1 h-6 w-px bg-white/8 sm:mx-3" />

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="font-mono tabular-nums">
            Ngày {day}
          </Badge>
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Users className="size-3.5" /> {aliveCount} người còn sống
          </span>
          <span className="hidden items-center gap-1.5 text-xs text-emerald-300/80 lg:flex">
            <Check className="size-3.5" /> Đã lưu
          </span>
        </div>

        {!canEndDay && (
          <span className="hidden items-center gap-1.5 text-xs text-amber-200/70 xl:flex">
            <span className="size-1.5 rounded-full bg-amber-300" /> Còn sự kiện
            chưa xử lý
          </span>
        )}

        <Button
          disabled={!canEndDay}
          onClick={onEndDay}
          title={
            canEndDay
              ? "Kết thúc ngày hiện tại"
              : "Hãy giải quyết sự kiện trước"
          }
          className="sm:min-w-28"
        >
          <span className="hidden sm:inline">Qua ngày</span>
          <ArrowRight />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mở menu trò chơi"
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuLabel>Trò chơi</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onMenuAction("achievements")}>
              <Award /> Thành tựu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMenuAction("settings")}>
              <Settings /> Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onMenuAction("leave")}
            >
              <LogOut /> Rời ván chơi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
