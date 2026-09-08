export interface ChecklistTemplate {
  room: string;
  label: string;
  sort_order: number;
}

export type RoomType = "bedroom" | "bathroom" | "living" | "kitchen";
export type KitchenType = "full" | "kitchenette" | "none";

export interface RoomSpec {
  id: string;
  type: RoomType;
  name: string;
}

export interface PropertySpecs {
  rooms: RoomSpec[];
  has_pool: boolean;
  has_outdoor: boolean;
  kitchen_type: KitchenType;
}

function bedroomItems(roomName: string, base: number): ChecklistTemplate[] {
  return [
    { room: roomName, label: "Change bed linen & make beds",        sort_order: base     },
    { room: roomName, label: "Dust surfaces, mirrors & headboards", sort_order: base + 1 },
    { room: roomName, label: "Vacuum / mop floor",                  sort_order: base + 2 },
    { room: roomName, label: "Check wardrobe & drawers are empty",  sort_order: base + 3 },
  ];
}

function bathroomItems(roomName: string, base: number): ChecklistTemplate[] {
  return [
    { room: roomName, label: "Clean toilet, shower & bath",       sort_order: base     },
    { room: roomName, label: "Polish sink, taps & mirror",        sort_order: base + 1 },
    { room: roomName, label: "Replace towels & refill amenities", sort_order: base + 2 },
    { room: roomName, label: "Mop floor",                         sort_order: base + 3 },
  ];
}

function kitchenItems(roomName: string, type: KitchenType, base: number): ChecklistTemplate[] {
  const items: ChecklistTemplate[] = [
    { room: roomName, label: "Wipe all counters & sink", sort_order: base },
  ];
  if (type === "full") {
    items.push({ room: roomName, label: "Wipe stovetop & oven",              sort_order: base + 1 });
    items.push({ room: roomName, label: "Check fridge & run dishwasher",     sort_order: base + 2 });
    items.push({ room: roomName, label: "Empty all bins",                    sort_order: base + 3 });
    items.push({ room: roomName, label: "Mop floor",                        sort_order: base + 4 });
  } else {
    items.push({ room: roomName, label: "Empty all bins",                    sort_order: base + 1 });
    items.push({ room: roomName, label: "Mop floor",                        sort_order: base + 2 });
  }
  return items;
}

function livingItems(roomName: string, base: number): ChecklistTemplate[] {
  return [
    { room: roomName, label: "Vacuum carpets / mop floors",   sort_order: base     },
    { room: roomName, label: "Wipe surfaces & furniture",     sort_order: base + 1 },
    { room: roomName, label: "Check TV remote & AC settings", sort_order: base + 2 },
  ];
}

export function buildChecklist(specs: PropertySpecs): ChecklistTemplate[] {
  const items: ChecklistTemplate[] = [];
  let order = 0;

  for (const room of specs.rooms) {
    switch (room.type) {
      case "bedroom":
        items.push(...bedroomItems(room.name, order));
        break;
      case "bathroom":
        items.push(...bathroomItems(room.name, order));
        break;
      case "kitchen":
        items.push(...kitchenItems(room.name, specs.kitchen_type, order));
        break;
      case "living":
        items.push(...livingItems(room.name, order));
        break;
    }
    order += 10;
  }

  if (specs.has_outdoor) {
    items.push({ room: "Outdoor", label: "Clean terrace & outdoor furniture", sort_order: order     });
    items.push({ room: "Outdoor", label: "Sweep outdoor floors",              sort_order: order + 1 });
    order += 10;
  }

  if (specs.has_pool) {
    items.push({ room: "Outdoor", label: "Check pool area & clean surrounds", sort_order: order });
    order += 10;
  }

  items.push({ room: "General", label: "Check all lights work",       sort_order: order     });
  items.push({ room: "General", label: "Set AC to standby",           sort_order: order + 1 });
  items.push({ room: "General", label: "Lock check & handover ready", sort_order: order + 2 });

  return items;
}

export const DEFAULT_SPECS: PropertySpecs = {
  rooms: [
    { id: "r1", type: "bedroom",  name: "Bedroom"     },
    { id: "r2", type: "bathroom", name: "Bathroom"    },
    { id: "r3", type: "living",   name: "Living Room" },
    { id: "r4", type: "kitchen",  name: "Kitchen"     },
  ],
  has_pool: false,
  has_outdoor: true,
  kitchen_type: "full",
};

export const DEFAULT_CHECKLIST: ChecklistTemplate[] = buildChecklist(DEFAULT_SPECS);

export const ROOM_LABELS: Record<string, string> = {
  bedroom:  "Bedroom",
  bathroom: "Bathroom",
  kitchen:  "Kitchen",
  living:   "Living Room",
  outdoor:  "Outdoor",
  general:  "General",
};
