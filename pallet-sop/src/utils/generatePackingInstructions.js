// Returns string representation of item list depending on size being 0, 1, 2, or 3+
function formatList(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Returns list of labels from provided array if they are set to true/isSelected
function getSelectedOptionLabels(optionState = {}, optionLabels = {}) {
  return Object.entries(optionState)
    .filter(([_, isSelected]) => isSelected)
    .map(([key]) => optionLabels[key] || key);
}

// Normalizes parameter string to lower case
function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

// Returns true if any item name has any of the search terms
function itemNameIncludes(items, searchTerms) {
  return items.some((item) => {
    const itemName = normalizeText(item.name);

    return searchTerms.some((term) => itemName.includes(term));
  });
}

// Given list of items, returns list of materials
function getMaterials(items = []) {
  return items
    .map((item) => item.material)
    .filter(Boolean);
}

// Returns true is materials list contains any targetMaterials
function hasMaterial(materials, targetMaterials) {
  const targets = Array.isArray(targetMaterials)
    ? targetMaterials
    : [targetMaterials];

  return materials.some((material) => targets.includes(material));
}

// Adds message to instructions list only if it isn't already in it
function addInstruction(instructions, message) {
  if (!instructions.includes(message)) {
    instructions.push(message);
  }
}


// Function to generate packing instructions given pallet spec
export function generatePackingInstructions(spec) {
  // List where instructions will be stored
  const instructions = [];

  // items list
  const items = spec.items || [];
  // materials list
  const materials = getMaterials(items);

  // set of unique materials
  const uniqueMaterials = [...new Set(materials)];

  // const list of fragile materials
  const fragileMaterials = ["Glass", "Acrylic", "Electronics"];
  // const list of scratch sensitive materials
  const scratchSensitiveMaterials = ["Glass", "Acrylic", "Plastic", "Wood"];

  // bool values to check if items contain any of following materials
  const hasGlass = hasMaterial(materials, "Glass");
  const hasAcrylic = hasMaterial(materials, "Acrylic");
  const hasMetal = hasMaterial(materials, "Metal");
  const hasElectronics = hasMaterial(materials, "Electronics");
  const hasFragileMaterial = hasMaterial(materials, fragileMaterials);

  // Labels for pallet construction types
  const constructionLabels = {
    nails: "nails",
    screws: "screws",
    staples: "staples",
    glue: "glue",
  };

  // List of labels of construction options that were selected in the pallet spec
  const selectedConstruction = getSelectedOptionLabels(
    spec.construction,
    constructionLabels
  );

  // If a construction option was included, add instruction to ONLY use those options, else add warning to confirm which ones to use
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

  // Instruction that all items must be secured and shouldn't be able to move
  addInstruction(
    instructions,
    "General Packing Requirement: All items must be secured so they cannot shift, slide, rattle, rub, or make direct contact with other items during handling. Bubble wrap alone is not acceptable if the item can still move."
  );

  // If more than one item is included, add instruction that each item should be separated
  if (items.length > 1) {
    addInstruction(
      instructions,
      "Multiple items are included. Each item must be wrapped separately and separated with foam, cardboard, dividers, or blocking. Items should not touch or rub against each other."
    );
  }

  // If more than 1 type of material, include instruction to separate them
  if (uniqueMaterials.length > 1) {
    addInstruction(
      instructions,
      "Mixed materials are included. Group similar materials together when possible and separate different materials with dividers, foam, cardboard, or padding."
    );
  }

  // If there is glass, include instruction to wrap separately and protect edges
  if (hasGlass) {
    addInstruction(
      instructions,
      "Glass items must be individually wrapped, edge protected, and separated from all other items. Do not place glass directly against wood, metal, acrylic, or other glass. Use foam/cardboard separators and make sure the item cannot move inside the crate."
    );
  }

  // If glass items include one of following names, include instruction to pack upright when possible
  if (
    hasGlass &&
    itemNameIncludes(items, ["mirror", "panel", "pane", "display", "glass"])
  ) {
    addInstruction(
      instructions,
      "Glass panels, mirrors, or display glass should be packed upright when possible and supported along the edges. Protect all corners and exposed edges."
    );
  }

  // If items include acrylic material, include instruction to protect it from scratches
  if (hasAcrylic) {
    addInstruction(
      instructions,
      "Acrylic items must be protected from scratches. Keep protective film on when possible. Use soft foam, paper, or cardboard between acrylic pieces. Do not allow straps or hard edges to press directly against acrylic surfaces."
    );
  }

  // If items include metal and scratchSensitiveMaterials, include instruction to package separately
  if (hasMetal && hasMaterial(materials, scratchSensitiveMaterials)) {
    addInstruction(
      instructions,
      "Metal items must be packed separately from glass, acrylic, plastic, and finished wood items. Metal hardware, brackets, or loose parts should be bagged, boxed, or secured so they cannot scratch or impact other items."
    );
  }

  // If items include electronics, include instruction to wrap separately
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

  // If no outter packagin selected, add instruction to confirm
  if (noOuterPackagingSelected) {
    addInstruction(
      instructions,
      "Warning: No outer packaging options were selected. Confirm whether shrink wrap, straps, padding, or corner protection are required before building."
    );
  }

  // If only shrink wrap selected, add instruction to make sure items cannot move
  if (outerPackaging.shrinkWrap && !outerPackaging.straps) {
    addInstruction(
      instructions,
      "Warning: Shrink wrap is not a structural restraint. If items can move on the pallet, straps, blocking, or bracing must be used."
    );
  }

  // If straps selected and there are glass or acrylic materials, include instruction to not add straps directly on them
  if (outerPackaging.straps && hasMaterial(materials, ["Glass", "Acrylic"])) {
    addInstruction(
      instructions,
      "Do not apply straps directly against glass or acrylic surfaces. Use edge protectors, padding, or blocking under straps to prevent cracking, pressure marks, or scratches."
    );
  }

  // If there are fragile materials but no foam padding was selected, add instruction to add anyways to make sure items don't touch eachother
  if (hasFragileMaterial && !outerPackaging.foamPadding) {
    addInstruction(
      instructions,
      "Warning: Fragile or scratch-sensitive items are included, but foam padding was not selected. Add padding, dividers, or separators so the items cannot move or touch each other."
    );
  }

  // If there are glass or acrylic materials but no corner protectors were selected, add instruction to maybe include to protect items
  if (hasMaterial(materials, ["Glass", "Acrylic"]) && !outerPackaging.cornerProtectors) {
    addInstruction(
      instructions,
      "Warning: Glass or acrylic items may require corner or edge protection. Protect all exposed corners and edges before crating."
    );
  }

  // If open style crate selected and items include fragile, include instruction to fully secure items
  if (spec.crateType === "Open Style Crate" && hasFragileMaterial) {
    addInstruction(
      instructions,
      "Open style crate selected with fragile or sensitive items. Items must be fully secured with blocking, bracing, padding, and edge protection. Exposed items must not be able to shift or contact the crate frame."
    );
  }

  // If halo crate selected and has fragile item, include instruction that item is protected
  if (spec.crateType === "Halo Crate" && hasFragileMaterial) {
    addInstruction(
      instructions,
      "Halo crate selected with fragile or sensitive items. Items must be secured with blocking, bracing, padding, and edge protection so they cannot shift, rub, or contact the crate frame."
    );
  }

  // If fully crated selected, include instruction to brace items inside.
  if (spec.crateType === "Fully Crated") {
    addInstruction(
      instructions,
      "Fully crated items must still be blocked and braced inside the crate. The outer crate should not be the only protection. Fill open space so items cannot move inside the crate."
    );
  }

  // Add final check that no items can move
  addInstruction(
    instructions,
    "Final Check: After packing, items should not shift, slide, rattle, rub, or contact each other. If movement is possible, add blocking, bracing, separators, foam, cardboard, or other protection before shipment."
  );

  return instructions;
}