const constructionTranslations = {
  nails: "钉子",
  screws: "螺丝",
  staples: "码钉",
  glue: "胶水",
};

function formatChineseList(items) {
  return items.join("、");
}

function getSelectedConstructionChinese(spec) {
  return Object.entries(spec.construction || {})
    .filter(([_, isSelected]) => isSelected)
    .map(([key]) => constructionTranslations[key] || key);
}

function translateInstruction(instruction, spec) {
  if (instruction.startsWith("Construction Requirement: Use ONLY")) {
    const selectedConstruction = getSelectedConstructionChinese(spec);

    if (selectedConstruction.length === 0) {
      return "警告：未选择木箱施工方式。请确认应使用钉子、螺丝、码钉或胶水。";
    }

    return `施工要求：木箱只能使用以下方式进行组装和固定：${formatChineseList(
        selectedConstruction
    )}。不得使用未列出的施工方式。`;
  }

  if (instruction.startsWith("Warning: No construction method")) {
    return "警告：未选择木箱施工方式。请确认应使用钉子、螺丝、码钉或胶水。";
  }

  if (instruction.startsWith("General Packing Requirement")) {
    return "一般包装要求：所有物品必须固定，确保在搬运过程中不会移动、滑动、晃动、摩擦，或与其他物品直接接触。如果物品仍可移动，仅使用气泡膜是不可以接受的。";
  }

  if (instruction.startsWith("Multiple items are included")) {
    return "包含多个物品。每个物品必须单独包裹，并使用泡棉、纸板、隔板或固定块分隔。物品之间不得互相接触或摩擦。";
  }

  if (instruction.startsWith("Mixed materials are included")) {
    return "包含多种材料。请尽可能将相同材料的物品放在一起，并使用隔板、泡棉、纸板或其他缓冲材料分隔不同材料的物品。";
  }

  if (instruction.startsWith("Glass items must")) {
    return "玻璃物品必须单独包裹，保护边缘，并与所有其他物品分隔。玻璃不得直接接触木材、金属、亚克力或其他玻璃。请使用泡棉或纸板隔开，并确保物品在木箱内无法移动。";
  }

  if (instruction.startsWith("Glass panels, mirrors")) {
    return "玻璃板、镜子或展示玻璃应尽可能竖直包装，并沿边缘进行支撑。所有角和外露边缘都必须保护。";
  }

  if (instruction.startsWith("Acrylic items must")) {
    return "亚克力物品必须防止刮伤。尽可能保留保护膜。亚克力之间应使用软泡棉、纸张或纸板分隔。不得让打包带或硬边直接压在亚克力表面。";
  }

  if (instruction.startsWith("Metal items must")) {
    return "金属物品必须与玻璃、亚克力、塑料和已完成表面的木制品分开包装。金属五金件、支架或散件必须装袋、装盒或固定，防止刮伤或撞击其他物品。";
  }

  if (instruction.startsWith("Electronics must")) {
    return "电子产品必须单独包裹，并防潮、防压、防撞击。不得将重物放在电子产品上方。电缆或小零件必须放入单独的袋子或盒子中并固定。";
  }

  if (instruction.startsWith("Warning: No outer packaging")) {
    return "警告：未选择外部包装方式。请在制作前确认是否需要缠绕膜、打包带、缓冲材料或护角。";
  }

  if (instruction.startsWith("Warning: Shrink wrap")) {
    return "警告：缠绕膜不是结构性固定方式。如果物品在托盘上可能移动，必须使用打包带、固定块或支撑结构进行固定。";
  }

  if (instruction.startsWith("Do not apply straps")) {
    return "不得将打包带直接压在玻璃或亚克力表面。必须在打包带下方使用护角、缓冲材料或固定块，防止开裂、压痕或刮伤。";
  }

  if (instruction.startsWith("Warning: Fragile or scratch-sensitive")) {
    return "警告：包含易碎或易刮伤物品，但未选择泡棉缓冲。请添加缓冲材料、隔板或分隔材料，确保物品不会移动或互相接触。";
  }

  if (instruction.startsWith("Warning: Glass or acrylic")) {
    return "警告：玻璃或亚克力物品可能需要护角或护边。装箱前必须保护所有外露的角和边缘。";
  }

  if (instruction.startsWith("Open style crate selected")) {
    return "已选择开放式木箱，且包含易碎或敏感物品。必须使用固定块、支撑结构、缓冲材料和护边保护。外露物品不得移动或接触木箱框架。";
  }

  if (instruction.startsWith("Halo crate selected")) {
    return "已选择 Halo 木箱。请确认所有物品都固定在木箱框架内，在搬运或运输过程中不会移动。";
  }

  if (instruction.startsWith("Fully crated items")) {
    return "全封闭木箱内的物品仍必须在内部固定和支撑。外部木箱不应作为唯一保护。请填充空隙，确保物品在木箱内无法移动。";
  }

  if (instruction.startsWith("Final Check")) {
    return "最终检查：包装完成后，物品不得移动、滑动、晃动、摩擦，或互相接触。如仍可能移动，请在发货前添加固定块、支撑结构、隔板、泡棉、纸板或其他保护材料。";
  }

  return `请参考英文说明：${instruction}`;
}

export function generateChinesePackingInstructions(spec, englishInstructions) {
  return englishInstructions.map((instruction) =>
    translateInstruction(instruction, spec)
  );
}