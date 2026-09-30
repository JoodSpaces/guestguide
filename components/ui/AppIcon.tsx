import {
  Bell, BellOff, ConciergeBell, KeyRound, BookOpen, MessageCircle, ClipboardCheck, Utensils, Coffee, Umbrella, Waves, Ticket,
  Siren, Wifi, Snowflake, ScrollText, TreePalm, Briefcase, Heart, Cake, Users, Sun, Moon, Sunrise, Sparkles, Compass, MapPin,
  CircleDot, Minus, Car, ChefHat, LogOut, Leaf, Laptop, Wine, Search, Bookmark, type LucideIcon,
} from "lucide-react";

/**
 * The app's icons are line icons (one stroke weight, inheriting the text colour). Use this instead of emoji or
 * symbol characters: emoji look different on every phone and do not follow the theme.
 */
const ICONS: Record<string, LucideIcon> = {
  bell: Bell, bellOff: BellOff, services: ConciergeBell, key: KeyRound, book: BookOpen, chat: MessageCircle,
  checkout: ClipboardCheck, departure: LogOut, food: Utensils, coffee: Coffee, beach: Umbrella, activities: Ticket,
  emergency: Siren, wifi: Wifi, ac: Snowflake, pool: Waves, rules: ScrollText, kitchen: ChefHat, parking: Car, transfer: Car,
  leisure: TreePalm, business: Briefcase, honeymoon: Heart, birthday: Cake, anniversary: Sparkles, family: Users,
  cool: Snowflake, warm: Sun, any: Minus, other: CircleDot, all: Sparkles, ai: Sparkles, memory: Heart, discover: Compass,
  relax: Leaf, explore: Compass, work: Laptop, social: Wine, search: Search, save: Bookmark,
  directions: MapPin, early_checkin: Sunrise, late_checkout: Moon, housekeeping: Sparkles, amenities: Sparkles,
};

export function AppIcon({ name, size = 18, strokeWidth = 1.5, style, filled }: { name: string | null | undefined; size?: number; strokeWidth?: number; style?: React.CSSProperties; filled?: boolean }) {
  const Icon = name ? ICONS[name] : undefined;
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} fill={filled ? "currentColor" : "none"} aria-hidden style={{ flexShrink: 0, ...style }} />;
}
