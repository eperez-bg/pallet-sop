import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generatePackingInstructions } from "./generatePackingInstructions";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const crateTypeImages = {
  "Fully Crated": {
    fileName: "fully-crated.png",
    type: "png",
    label: "Fully Crated",
  },
  "Open Style Crate": {
    fileName: "open-crate.jpg",
    type: "jpg",
    label: "Open Style Crate",
  },
  "Pallet Only": {
    fileName: "pallet-only.jpg",
    type: "jpg",
    label: "Pallet Only",
  },
};

async function getCrateTypeImage(pdfDoc, crateType) {
  const imageInfo = crateTypeImages[crateType];

  if (!imageInfo) {
    return null;
  }

  try {
    const imageUrl = `${import.meta.env.BASE_URL}${imageInfo.fileName}`;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Could not load image: ${imageInfo.fileName}`);
    }

    const imageBytes = await response.arrayBuffer();

    const image =
      imageInfo.type === "png"
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

    return {
      image,
      label: imageInfo.label,
    };
  } catch (error) {
    console.error("Failed to load crate type image:", error);
    return null;
  }
}

const constructionLabels = {
  nails: "Nails",
  screws: "Screws",
  staples: "Staples",
  glue: "Glue",
};

const packagingLabels = {
  shrinkWrap: "Shrink Wrap",
  straps: "Straps",
  cornerProtectors: "Corner Protectors",
  foamPadding: "Foam Padding",
};

function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function getSelectedLabels(optionState = {}, labelMap = {}) {
  return Object.entries(optionState)
    .filter(([_, isSelected]) => isSelected)
    .map(([key]) => labelMap[key] || key);
}

function formatFileName(value) {
  const safeName = String(value || "crate-spec")
    .trim()
    .replace(/[^a-z0-9-_]/gi, "_")
    .slice(0, 40);

  return safeName || "crate-spec";
}

function wrapText(text, font, fontSize, maxWidth) {
  const cleanText = sanitizePdfText(text);
  const words = cleanText.split(/\s+/).filter(Boolean);

  if (words.length === 0) return [""];

  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function downloadPdf(pdfBytes, fileName) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function downloadPalletSpecPdf(spec) {
  const pdfDoc = await PDFDocument.create();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function addNewPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(requiredSpace) {
    if (y - requiredSpace < MARGIN) {
      addNewPage();
    }
  }

  function drawLine(text, options = {}) {
    const {
      x = MARGIN,
      size = 11,
      font = regularFont,
      color = rgb(0, 0, 0),
      lineHeight = 16,
    } = options;

    ensureSpace(lineHeight);

    page.drawText(sanitizePdfText(text), {
      x,
      y,
      size,
      font,
      color,
    });

    y -= lineHeight;
  }

  function drawWrappedText(text, options = {}) {
    const {
      x = MARGIN,
      size = 11,
      font = regularFont,
      color = rgb(0, 0, 0),
      lineHeight = 15,
      maxWidth = CONTENT_WIDTH,
    } = options;

    const lines = wrapText(text, font, size, maxWidth);

    lines.forEach((line) => {
      ensureSpace(lineHeight);

      page.drawText(line, {
        x,
        y,
        size,
        font,
        color,
      });

      y -= lineHeight;
    });
  }

  function drawSectionTitle(title) {
    y -= 8;
    ensureSpace(30);

    page.drawText(sanitizePdfText(title), {
      x: MARGIN,
      y,
      size: 15,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 20;

    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.75, 0.75, 0.75),
    });

    y -= 16;
  }

  function drawKeyValue(label, value) {
    drawWrappedText(`${label}: ${value || "Not selected"}`, {
      size: 11,
      font: regularFont,
    });
  }

  function drawBullet(text) {
    const lines = wrapText(text, regularFont, 10.5, CONTENT_WIDTH - 18);

    lines.forEach((line, index) => {
      ensureSpace(15);

      const prefix = index === 0 ? "- " : "  ";

      page.drawText(`${prefix}${line}`, {
        x: MARGIN + 10,
        y,
        size: 10.5,
        font: regularFont,
        color: rgb(0, 0, 0),
      });

      y -= 15;
    });
  }

  async function drawCrateTypeImage() {
  const crateImageData = await getCrateTypeImage(pdfDoc, spec.crateType);

  if (!crateImageData) {
    return;
  }

  const { image, label } = crateImageData;

  const maxImageWidth = 220;
  const maxImageHeight = 150;

  const scaled = image.scale(1);

  const widthRatio = maxImageWidth / scaled.width;
  const heightRatio = maxImageHeight / scaled.height;
  const scaleFactor = Math.min(widthRatio, heightRatio);

  const imageWidth = scaled.width * scaleFactor;
  const imageHeight = scaled.height * scaleFactor;

  ensureSpace(imageHeight + 50);

  page.drawText("Selected Crate Type", {
    x: MARGIN,
    y,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 22;

  page.drawImage(image, {
    x: MARGIN,
    y: y - imageHeight,
    width: imageWidth,
    height: imageHeight,
  });

  page.drawText(label, {
    x: MARGIN + imageWidth + 24,
    y: y - 24,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= imageHeight + 24;
}

  function drawWarningBox(text) {
    const boxHeight = 52;

    ensureSpace(boxHeight + 12);

    page.drawRectangle({
      x: MARGIN,
      y: y - boxHeight + 12,
      width: CONTENT_WIDTH,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5,
      color: rgb(0.95, 0.95, 0.95),
    });

    const lines = wrapText(text, boldFont, 13, CONTENT_WIDTH - 24);

    let textY = y - 10;

    lines.forEach((line) => {
      page.drawText(line, {
        x: MARGIN + 12,
        y: textY,
        size: 13,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      textY -= 16;
    });

    y -= boxHeight + 8;
  }

  const selectedConstruction = getSelectedLabels(
    spec.construction,
    constructionLabels
  );

  const selectedPackaging = getSelectedLabels(
    spec.outerPackaging,
    packagingLabels
  );

  const instructions = generatePackingInstructions(spec);

  // Header
  drawLine("Pallet / Crate SOP", {
    size: 24,
    font: boldFont,
    lineHeight: 28,
  });

  drawLine("Generated specification sheet for crate manufacturer", {
    size: 11,
    color: rgb(0.35, 0.35, 0.35),
    lineHeight: 20,
  });

  drawLine(`Generated Date: ${new Date().toLocaleDateString()}`, {
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
    lineHeight: 18,
  });

  await drawCrateTypeImage();

  // Client / Project
  drawSectionTitle("Client / Project");
  drawKeyValue("Client / Project Name", spec.clientName);

  // Items
  drawSectionTitle("Items Being Stored");

  if (!spec.items || spec.items.length === 0) {
    drawLine("No items entered.", {
      size: 11,
      font: regularFont,
    });
  } else {
    spec.items.forEach((item, index) => {
      drawBullet(`${index + 1}. ${item.material} ${item.name}`);
    });
  }

  // Construction
  drawSectionTitle("Construction Specs");

  if (selectedConstruction.length === 0) {
    drawBullet("No construction method selected.");
  } else {
    selectedConstruction.forEach((option) => {
      drawBullet(option);
    });
  }

  // Outer Packaging
  drawSectionTitle("Outer Packaging");

  if (selectedPackaging.length === 0) {
    drawBullet("No outer packaging selected.");
  } else {
    selectedPackaging.forEach((option) => {
      drawBullet(option);
    });
  }

  // Crate Type
  drawSectionTitle("Crate Type");
  drawKeyValue("Selected Crate Type", spec.crateType);

  // Generated Instructions
  drawSectionTitle("Generated Packing Instructions");

  instructions.forEach((instruction) => {
    drawBullet(instruction);
  });

  // PM warning
  drawWarningBox("PROJECT MANAGERS: PLEASE SEND LABELS SEPARATELY");

  const pdfBytes = await pdfDoc.save();

  const fileName = `pallet-crate-sop-${formatFileName(
    spec.clientName
  )}.pdf`;

  downloadPdf(pdfBytes, fileName);
}