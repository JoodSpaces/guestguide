export interface ChecklistTemplate {
  room: string;
  label: string;
  sort_order: number;
}

export const DEFAULT_CHECKLIST: ChecklistTemplate[] = [
  { room: "bedroom",  label: "Strip all beds",                  sort_order: 0  },
  { room: "bedroom",  label: "Make beds with fresh linen",      sort_order: 1  },
  { room: "bedroom",  label: "Dust all surfaces & headboards",  sort_order: 2  },
  { room: "bedroom",  label: "Check wardrobe & drawers",        sort_order: 3  },
  { room: "bedroom",  label: "Clean mirrors",                   sort_order: 4  },
  { room: "bathroom", label: "Clean & disinfect toilet",        sort_order: 5  },
  { room: "bathroom", label: "Clean shower / bath",             sort_order: 6  },
  { room: "bathroom", label: "Polish sink & taps",              sort_order: 7  },
  { room: "bathroom", label: "Replace towels",                  sort_order: 8  },
  { room: "bathroom", label: "Refill soap & amenities",         sort_order: 9  },
  { room: "bathroom", label: "Mop bathroom floor",              sort_order: 10 },
  { room: "kitchen",  label: "Clean all countertops",           sort_order: 11 },
  { room: "kitchen",  label: "Clean stovetop & oven",           sort_order: 12 },
  { room: "kitchen",  label: "Check & clean fridge",            sort_order: 13 },
  { room: "kitchen",  label: "Run / empty dishwasher",          sort_order: 14 },
  { room: "kitchen",  label: "Empty & replace trash bags",      sort_order: 15 },
  { room: "kitchen",  label: "Mop kitchen floor",               sort_order: 16 },
  { room: "living",   label: "Vacuum carpets / mop floors",     sort_order: 17 },
  { room: "living",   label: "Dust furniture & surfaces",       sort_order: 18 },
  { room: "living",   label: "Check TV & remote batteries",     sort_order: 19 },
  { room: "living",   label: "Wipe light switches & sockets",   sort_order: 20 },
  { room: "outdoor",  label: "Clean pool / terrace area",       sort_order: 21 },
  { room: "outdoor",  label: "Wipe outdoor furniture",          sort_order: 22 },
  { room: "outdoor",  label: "Sweep / blow outdoor floors",     sort_order: 23 },
  { room: "general",  label: "Check all door locks & keys",     sort_order: 24 },
  { room: "general",  label: "Set AC to standby temp",          sort_order: 25 },
  { room: "general",  label: "Check all lights work",           sort_order: 26 },
  { room: "general",  label: "Final walk-through photo",        sort_order: 27 },
];

export const ROOM_LABELS: Record<string, string> = {
  bedroom:  "Bedroom",
  bathroom: "Bathroom",
  kitchen:  "Kitchen",
  living:   "Living",
  outdoor:  "Outdoor",
  general:  "General",
};
