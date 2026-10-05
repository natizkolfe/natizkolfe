import type { CareInstruction, CareSections } from "@/lib/types";

/**
 * Placeholder care text for building the feature.
 * DRAFT / PLACEHOLDER – NOT FINAL.
 * The kitchen replaces this from Food care before launch.
 */

const DRAFT = "2026-10-05T00:00:00.000Z";

function sections(partial: Partial<CareSections>): CareSections {
  return {
    storage: "",
    serving: "",
    utensils: "",
    reheating: "",
    leftovers: "",
    notes: "",
    ...partial,
  };
}

const WOT = ["misir-wot", "shiro-wot", "doro-wot", "key-wot", "kik-alicha", "beef-alicha", "atkilt-wot"];

export function seedCareInstructions(): CareInstruction[] {
  return [
    {
      id: "car_wot_standard",
      kind: "template",
      name: "Standard Wot Care Instructions",
      foodIds: WOT,
      category: "Wot",
      service: "",
      durationDays: null,
      templateId: null,
      active: true,
      version: 1,
      placeholder: true,
      updatedAt: DRAFT,
      sections: sections({
        storage:
          "After pickup or delivery, place the food in the refrigerator according to the provided care instructions.",
        serving: "Serve from the container with a clean spoon kept for this dish.",
        utensils:
          "Use a clean spoon when serving food from the container.\n\nAvoid using a spoon that has already contacted Injera or another food and then placing that spoon back into the main Wot container.\n\nWash the spoon or use another clean spoon before serving from the main container.",
        leftovers:
          "If a portion of Wot has already been removed, served, or handled separately, do not place that leftover portion back into the original large container.",
        reheating:
          "Reheat according to the care instructions for this dish. Final reheating steps will be added before launch.",
      }),
    },
    {
      id: "car_wot_2week",
      kind: "template",
      name: "2-Week Wot Storage",
      foodIds: WOT,
      category: "Wot",
      service: "weekly",
      durationDays: 14,
      templateId: "car_wot_standard",
      active: true,
      version: 1,
      placeholder: true,
      updatedAt: DRAFT,
      sections: sections({
        notes:
          "For applicable 2-week orders, certain Wot dishes may require additional reheating and storage steps after approximately five days.\n\nThe exact timing and procedure will be replaced with approved instructions before launch.",
      }),
    },
    {
      id: "car_doro",
      kind: "override",
      name: "Doro Wot",
      foodIds: ["doro-wot"],
      category: "Wot",
      service: "",
      durationDays: null,
      templateId: "car_wot_standard",
      active: true,
      version: 1,
      placeholder: true,
      updatedAt: DRAFT,
      sections: sections({
        reheating:
          "Reheat this dish according to the Doro Wot care steps. The final reheating method will be added before launch.",
      }),
    },
    {
      id: "car_tibs",
      kind: "template",
      name: "Tibs Care",
      foodIds: ["awaze-tibs"],
      category: "Tibs",
      service: "",
      durationDays: null,
      templateId: null,
      active: true,
      version: 1,
      placeholder: true,
      updatedAt: DRAFT,
      sections: sections({
        storage:
          "Follow the storage instructions for this dish after pickup or delivery. Final Tibs handling steps will be added before launch.",
        reheating:
          "Reheat according to the instructions for this dish. Final reheating steps will be added before launch.",
      }),
    },
    {
      id: "car_habesha",
      kind: "template",
      name: "Habesha Defo Care",
      foodIds: ["habesha-defo"],
      category: "Bread",
      service: "",
      durationDays: null,
      templateId: null,
      active: true,
      version: 1,
      placeholder: true,
      updatedAt: DRAFT,
      sections: sections({
        storage:
          "Follow the provided storage instructions after receiving your order.\n\nAfter approximately two days, the storage method may need to change depending on the final approved Gebeta bread-storage procedure.\n\nFinal room-temperature and refrigeration instructions will be added before launch.",
      }),
    },
    {
      id: "car_vegetables",
      kind: "template",
      name: "Cooked Vegetable Care",
      foodIds: ["gomen", "fosolia"],
      category: "Vegetables",
      service: "",
      durationDays: null,
      templateId: null,
      active: true,
      version: 1,
      placeholder: true,
      updatedAt: DRAFT,
      sections: sections({
        storage: "After pickup or delivery, refrigerate according to the care instructions for this dish.",
        serving: "Use a clean utensil when serving from the container.",
      }),
    },
  ];
}
