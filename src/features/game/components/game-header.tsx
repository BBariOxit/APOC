import {
  ArrowRight,
  Award,
  CircleAlert,
  LogOut,
  Menu,
  Settings,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GameHeaderProps {
  day: number;
  aliveCount: number;
  canEndDay: boolean;
  pendingEventCount: number;
  onEndDay: () => void;
  onOpenEvent: () => void;
  onMenuAction: (action: "achievements" | "settings" | "leave") => void;
}

export function GameHeader({
  day,
  aliveCount,
  canEndDay,
  pendingEventCount,
  onEndDay,
  onOpenEvent,
  onMenuAction,
}: GameHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-2.5 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold tracking-[0.18em]">APOC</p>

        <div className="mx-1 h-5 w-px bg-white/8 sm:mx-2" />

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="font-mono tabular-nums">
            Ngày {day}
          </Badge>
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="hidden cursor-default items-center gap-1.5 text-xs text-muted-foreground sm:flex" />
              }
            >
              <Users className="size-3.5" />
              <span className="font-mono tabular-nums">{aliveCount}</span>
            </TooltipTrigger>
            <TooltipContent>{aliveCount} người còn sống</TooltipContent>
          </Tooltip>
        </div>

        {pendingEventCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenEvent}
            className="relative text-amber-200/80 hover:bg-amber-300/10 hover:text-amber-100"
          >
            <CircleAlert />
            <span className="hidden lg:inline">
              {pendingEventCount} sự kiện chưa xử lý
            </span>
            <span className="grid min-w-4 place-items-center rounded-full bg-white/8 px-1 font-mono text-[10px] leading-4 lg:hidden">
              {pendingEventCount}
            </span>
          </Button>
        )}

        <Button
          disabled={!canEndDay}
          onClick={onEndDay}
          title={
            canEndDay
              ? "Kết thúc ngày hiện tại"
              : "Hãy xử lý tất cả sự kiện trước"
          }
          className="hidden min-w-28 sm:inline-flex"
        >
          <span>Qua ngày</span>
          <ArrowRight />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Mở menu trò chơi"
              />
            }
          >
            <Menu />
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
