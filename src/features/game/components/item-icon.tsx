import {
  Axe,
  Bandage,
  Droplets,
  Flashlight,
  MapPinned,
  Pill,
  Radio,
  Soup,
  type LucideIcon,
} from "lucide-react";

import type { ItemIconName } from "@/features/game/types";

const itemIcons: Record<ItemIconName, LucideIcon> = {
  can: Soup,
  water: Droplets,
  medicine: Pill,
  bandage: Bandage,
  radio: Radio,
  flashlight: Flashlight,
  axe: Axe,
  map: MapPinned,
};

interface ItemIconProps {
  icon: ItemIconName;
  className?: string;
}

export function ItemIcon({ icon, className }: ItemIconProps) {
  const Icon = itemIcons[icon];

  return <Icon className={className} aria-hidden="true" />;
}
