import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generatePackingInstructions } from "./generatePackingInstructions";
import fontkit from "@pdf-lib/fontkit";
import { generateChinesePackingInstructions } from "./generateChinesePackingInstructions";

// PDF size specs
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Object to store image information for each pallet style
const crateTypeImages = {
  "Fully Crated": {
    fileName: "fully-crated.jpg",
    type: "jpg",
    label: "Fully Crated",
  },
  "Open Style Crate": {
    fileName: "open-crate.jpg",
    type: "jpg",
    label: "Open Style Crate",
  },
  "Halo Crate": {
    fileName: "halo-crate.jpg",
    type: "jpg",
    label: "Halo Crate",
  },
};

// Function to embed image into provided pdfDoc depending on provided crateType
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

// Labels for construction options
const constructionLabels = {
  nails: "Nails",
  screws: "Screws",
  staples: "Staples",
  glue: "Glue",
};

// Labels for packaging options
const packagingLabels = {
  shrinkWrap: "Shrink Wrap",
  straps: "Straps",
  cornerProtectors: "Corner Protectors",
  foamPadding: "Foam Padding",
};

// Sanitizes text so it prints appropriately on PDF
function sanitizePdfText(value) {
  return String(value ?? "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

// Returns list of selected labels given list
function getSelectedLabels(optionState = {}, labelMap = {}) {
  return Object.entries(optionState)
    .filter(([_, isSelected]) => isSelected)
    .map(([key]) => labelMap[key] || key);
}

// Function to return file name for PDF
function formatFileName(value) {
  const safeName = String(value || "crate-spec")
    .trim()
    .replace(/[^a-z0-9-_]/gi, "_")
    .slice(0, 40);

  return safeName || "crate-spec";
}

// Function to return list of lines of text, takes text parameter and for each word, if adding it to a line exceeds the maxWidth, add it to a new line
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

// Function that takes raw PDF file bytes and file name, then creates blob using bytes and type application/pdf, creates URL to blob object, creates anchor element and adds to DOM that points to blob URL, clicks it, then removes anchor
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

// Function to download PDF using pallet spec
export async function downloadPalletSpecPdf(spec) {
  // instance of PDFDocument object
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Fonts to be used in PDF
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const chineseFontBytes = await fetch(
    `${import.meta.env.BASE_URL}fonts/NotoSansSC-Regular.ttf`
  ).then((response) => response.arrayBuffer());

  const chineseFont = await pdfDoc.embedFont(chineseFontBytes, {
    subset: false,
  });

  // Size of each page in PDF
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  /// Function to add new page to PDF
  function addNewPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  /// Function that adds new page if provided requiredSpace doesn't fit in current page
  function ensureSpace(requiredSpace) {
    if (y - requiredSpace < MARGIN) {
      addNewPage();
    }
  }

  function wrapChineseText(text, font, fontSize, maxWidth) {
    const cleanText = String(text ?? "");
    const characters = [...cleanText];

    const lines = [];
    let currentLine = "";

    characters.forEach((character) => {
      const testLine = currentLine + character;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }

        currentLine = character;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function drawChineseBullet(text) {
    const lines = wrapChineseText(text, chineseFont, 10.5, CONTENT_WIDTH - 18);

    lines.forEach((line, index) => {
      ensureSpace(16);

      const prefix = index === 0 ? "• " : "  ";

      page.drawText(`${prefix}${line}`, {
        x: MARGIN + 10,
        y,
        size: 10.5,
        font: chineseFont,
        color: rgb(0, 0, 0),
      });

      y -= 16;
    });
  }

  /// Function to draw line of text on PDF with given options
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

  /// Function to draw wrapped text which allows text to flow to next page
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

  /// Function to draw section title onto PDF 
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

  /// Function to draw label: value
  function drawKeyValue(label, value) {
    drawWrappedText(`${label}: ${value || "Not selected"}`, {
      size: 11,
      font: regularFont,
    });
  }

  /// Function to draw bullet before line if it is the first
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

  /// Function to draw crate type onto PDF
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

  /// Function to draw warning box about label at bottom of PDF
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

  // Stores which construction is currently being used
  const selectedConstruction = getSelectedLabels(
    spec.construction,
    constructionLabels
  );

  // Stores which packaging is currently being used
  const selectedPackaging = getSelectedLabels(
    spec.outerPackaging,
    packagingLabels
  );

  const instructions = generatePackingInstructions(spec);

  const chineseInstructions = generateChinesePackingInstructions(
    spec,
    instructions
  );

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

  y -= 20;

  // Items
  drawSectionTitle("Items Being Stored");

  // Prints item list
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

  y -= 20;

  // Construction
  drawSectionTitle("Construction Specs");

  if (selectedConstruction.length === 0) {
    drawBullet("No construction method selected.");
  } else {
    selectedConstruction.forEach((option) => {
      drawBullet(option);
    });
  }

  y -= 20;

  // Outer Packaging
  drawSectionTitle("Outer Packaging");

  if (selectedPackaging.length === 0) {
    drawBullet("No outer packaging selected.");
  } else {
    selectedPackaging.forEach((option) => {
      drawBullet(option);
    });
  }

  y -= 20;

  // Crate Type
  drawSectionTitle("Crate Type");
  drawKeyValue("Selected Crate Type", spec.crateType);

  y -= 20;

  // Generated Instructions
  drawSectionTitle("Generated Packing Instructions");

  instructions.forEach((instruction) => {
    drawBullet(instruction);
  });

  y -= 20;

  drawSectionTitle("中文包装说明");

  chineseInstructions.forEach((instruction) => {
    drawChineseBullet(instruction);
  });

  y -= 20;

  // PM warning
  drawWarningBox("PROJECT MANAGERS: PLEASE SEND LABELS SEPARATELY");

  const pdfBytes = await pdfDoc.save();

  const fileName = `pallet-crate-sop-${formatFileName(
    spec.clientName
  )}.pdf`;

  downloadPdf(pdfBytes, fileName);
}