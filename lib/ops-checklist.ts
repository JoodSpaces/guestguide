export interface ChecklistTemplate {
  room: string;
  label: string;
  sort_order: number;
}

export const DEFAULT_CHECKLIST: ChecklistTemplate[] = [
  // Bedroom
  { room: "bedroom",  label: "Change bed linen & make beds",        sort_order: 0  },
  { room: "bedroom",  label: "Dust surfaces, mirrors & headboards", sort_order: 1  },
  { room: "bedroom",  label: "Check wardrobe & drawers are empty",  sort_order: 2  },

  // Bathroom
  { room: "bathroom", label: "Clean toilet, shower & bath",         sort_order: 3  },
  { room: "bathroom", label: "Polish sink, taps & mirror",          sort_order: 4  },
  { room: "bathroom", label: "Replace towels & refill amenities",   sort_order: 5  },
  { room: "bathroom", label: "Mop floor",                           sort_order: 6  },

  // Kitchen
  { room: "kitchen",  label: "Wipe counters, stove & oven",         sort_order: 7  },
  { room: "kitchen",  label: "Check fridge & run dishwasher",       sort_order: 8  },
  { room: "kitchen",  label: "Empty all bins",                      sort_order: 9  },
  { room: "kitchen",  label: "Mop floor",                           sort_order: 10 },

  // Living
  { room: "living",   label: "Vacuum carpets / mop floors",         sort_order: 11 },
  { room: "living",   label: "Wipe surfaces & furniture",           sort_order: 12 },
  { room: "living",   label: "Check TV remote & AC settings",       sort_order: 13 },

  // Outdoor
  { room: "outdoor",  label: "Clean terrace & outdoor furniture",   sort_order: 14 },
  { room: "outdoor",  label: "Check pool area",                     sort_order: 15 },

  // General
  { room: "general",  label: "Check all lights work",               sort_order: 16 },
  { room: "general",  label: "Set AC to standby",                   sort_order: 17 },
  { room: "general",  label: "Lock check & handover ready",         sort_order: 18 },
];

export const ROOM_LABELS: Record<string, string> = {
  bedroom:  "Bedroom",
  bathroom: "Bathroom",
  kitchen:  "Kitchen",
  living:   "Living",
  outdoor:  "Outdoor",
  general:  "General",
};
