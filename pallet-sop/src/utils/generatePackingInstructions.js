function formatList(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getSelectedOptionLabels(optionState = {}, optionLabels = {}) {
  return Object.entries(optionState)
    .filter(([_, isSelected]) => isSelected)
    .map(([key]) => optionLabels[key] || key);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function itemNameIncludes(items, searchTerms) {
  return items.some((item) => {
    const itemName = normalizeText(item.name);

    return searchTerms.some((term) => itemName.includes(term));
  });
}

function getMaterials(items = []) {
  return items
    .map((item) => item.material)
    .filter(Boolean);
}

function hasMaterial(materials, targetMaterials) {
  const targets = Array.isArray(targetMaterials)
    ? targetMaterials
    : [targetMaterials];

  return materials.some((material) => targets.includes(material));
}

function addInstruction(instructions, message) {
  if (!instructions.includes(message)) {
    instructions.push(message);
  }
}

export function generatePackingInstructions(spec) {
  const instructions = [];

  const items = spec.items || [];
  const materials = getMaterials(items);

  const uniqueMaterials = [...new Set(materials)];

  const fragileMaterials = ["Glass", "Acrylic", "Electronics"];
  const scratchSensitiveMaterials = ["Glass", "Acrylic", "Plastic", "Wood"];

  const hasGlass = hasMaterial(materials, "Glass");
  const hasAcrylic = hasMaterial(materials, "Acrylic");
  const hasMetal = hasMaterial(materials, "Metal");
  const hasElectronics = hasMaterial(materials, "Electronics");
  const hasFragileMaterial = hasMaterial(materials, fragileMaterials);

  const constructionLabels = {
    nails: "nails",
    screws: "screws",
    staples: "staples",
    glue: "glue",
  };

  const selectedConstruction = getSelectedOptionLabels(
    spec.construction,
    constructionLabels
  );

  if (selectedConstruction.length > 0) {
    addInstruction(
      instructions,
      `Construction Requirement: Use ONLY ${formatList(
        selectedConstruction
      )} to construct crate.`
    );
  } else {
    addInstruction(
      instructions,
      "Warning: No construction method was selected. Confirm whether nails, screws, staples, or glue should be used to construct crate."
    );
  }

  addInstruction(
    instructions,
    "General Packing Requirement: All items must be secured so they cannot shift, slide, rattle, rub, or make direct contact with other items during handling. Bubble wrap alone is not acceptable if the item can still move."
  );

  if (items.length > 1) {
    addInstruction(
      instructions,
      "Multiple items are included. Each item must be wrapped separately and separated with foam, cardboard, dividers, or blocking. Items should not touch or rub against each other."
    );
  }

  if (uniqueMaterials.length > 1) {
    addInstruction(
      instructions,
      "Mixed materials are included. Group similar materials together when possible and separate different materials with dividers, foam, cardboard, or padding."
    );
  }

  if (hasGlass) {
    addInstruction(
      instructions,
      "Glass items must be individually wrapped, edge protected, and separated from all other items. Do not place glass directly against wood, metal, acrylic, or other glass. Use foam/cardboard separators and make sure the item cannot move inside the crate."
    );
  }

  if (
    hasGlass &&
    itemNameIncludes(items, ["mirror", "panel", "pane", "display", "glass"])
  ) {
    addInstruction(
      instructions,
      "Glass panels, mirrors, or display glass should be packed upright when possible and supported along the edges. Protect all corners and exposed edges."
    );
  }

  if (hasAcrylic) {
    addInstruction(
      instructions,
      "Acrylic items must be protected from scratches. Keep protective film on when possible. Use soft foam, paper, or cardboard between acrylic pieces. Do not allow straps or hard edges to press directly against acrylic surfaces."
    );
  }

  if (hasMetal && hasMaterial(materials, scratchSensitiveMaterials)) {
    addInstruction(
      instructions,
      "Metal items must be packed separately from glass, acrylic, plastic, and finished wood items. Metal hardware, brackets, or loose parts should be bagged, boxed, or secured so they cannot scratch or impact other items."
    );
  }

  if (hasElectronics) {
    addInstruction(
      instructions,
      "Electronics must be wrapped separately and protected from moisture, pressure, and impact. Do not place heavy items on top of electronics. Secure cables or small parts in a separate bag or box."
    );
  }

  const outerPackaging = spec.outerPackaging || {};

  const noOuterPackagingSelected = Object.values(outerPackaging).every(
    (value) => value === false
  );

  if (noOuterPackagingSelected) {
    addInstruction(
      instructions,
      "Warning: No outer packaging options were selected. Confirm whether shrink wrap, straps, padding, or corner protection are required before building."
    );
  }

  if (outerPackaging.shrinkWrap && !outerPackaging.straps) {
    addInstruction(
      instructions,
      "Warning: Shrink wrap is not a structural restraint. If items can move on the pallet, straps, blocking, or bracing must be used."
    );
  }

  if (outerPackaging.straps && hasMaterial(materials, ["Glass", "Acrylic"])) {
    addInstruction(
      instructions,
      "Do not apply straps directly against glass or acrylic surfaces. Use edge protectors, padding, or blocking under straps to prevent cracking, pressure marks, or scratches."
    );
  }

  if (hasFragileMaterial && !outerPackaging.foamPadding) {
    addInstruction(
      instructions,
      "Warning: Fragile or scratch-sensitive items are included, but foam padding was not selected. Add padding, dividers, or separators so the items cannot move or touch each other."
    );
  }

  if (hasMaterial(materials, ["Glass", "Acrylic"]) && !outerPackaging.cornerProtectors) {
    addInstruction(
      instructions,
      "Warning: Glass or acrylic items may require corner or edge protection. Protect all exposed corners and edges before crating."
    );
  }

  if (spec.crateType === "Open Style Crate" && hasFragileMaterial) {
    addInstruction(
      instructions,
      "Open style crate selected with fragile or sensitive items. Items must be fully secured with blocking, bracing, padding, and edge protection. Exposed items must not be able to shift or contact the crate frame."
    );
  }

  if (spec.crateType === "Pallet Only" && hasFragileMaterial) {
    addInstruction(
      instructions,
      "Warning: Pallet only selected with fragile or sensitive items. Confirm that items are protected from impact and cannot shift. Bubble wrap alone is not acceptable."
    );
  }

  if (spec.crateType === "Fully Crated") {
    addInstruction(
      instructions,
      "Fully crated items must still be blocked and braced inside the crate. The outer crate should not be the only protection. Fill open space so items cannot move inside the crate."
    );
  }

  addInstruction(
    instructions,
    "Final Check: After packing, items should not shift, slide, rattle, rub, or contact each other. If movement is possible, add blocking, bracing, separators, foam, cardboard, or other protection before shipment."
  );

  return instructions;
}