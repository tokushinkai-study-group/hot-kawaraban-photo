const SLOT_LABELS = [
  "1枚目",
  "2枚目",
  "3枚目",
];

/** インデックス: 0=1枚目, 1=2枚目, 2=3枚目 */
const INDEX = {
  upper: 0,
  front: 1,
  lower: 2,
  };

const counter = document.getElementById("counter");
const combineBtn = document.getElementById("combineBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const resultSection = document.getElementById("resultSection");
const resultCanvas = document.getElementById("resultCanvas");
/** @type {({ file: File, url: string, image: HTMLImageElement } | null)[]} */
let images = [null, null, null, null, null];

function getSlotElement(index) {
  return document.querySelector(`.upload-slot[data-index="${index}"]`);
}

/** @type {string | null} */
let combinedDataUrl = null;

function getFilledCount() {
  return images.filter(Boolean).length;
}

function updateCounter() {
  counter.textContent = `${getFilledCount()} / 3 枚`;
}

function updateButtons() {
  const filled = getFilledCount();
  combineBtn.disabled = filled === 0;
  clearBtn.disabled = filled === 0;
  downloadBtn.disabled = !combinedDataUrl;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => resolve({ file, url, image });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`画像の読み込みに失敗しました: ${file.name}`));
    };

    image.src = url;
  });
}

function renderSlot(index) {
  const slot = getSlotElement(index);
  if (!slot) {
    return;
  }
  const item = images[index];
  const label = SLOT_LABELS[index];
  let body = slot.querySelector(".slot-body");

  slot.querySelector(".slot-label").textContent = label;

  if (item) {
    slot.classList.remove("slot-empty");
    slot.classList.add("slot-filled");

    if (!body) {
      body = document.createElement("div");
      body.className = "slot-body";
      slot.appendChild(body);
    }

    body.innerHTML = "";

    const img = document.createElement("img");
    img.src = item.url;
    img.alt = label;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "削除";
    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      removeImage(index);
    });

    body.append(img, removeBtn);
  } else {
    slot.classList.remove("slot-filled");
    slot.classList.add("slot-empty");

    if (!body) {
      body = document.createElement("div");
      body.className = "slot-body";
      slot.appendChild(body);
    }

    body.innerHTML = `
      <span class="slot-icon">＋</span>
      <p class="slot-text">画像を追加</p>
    `;
  }
}

function renderAllSlots() {
  images.forEach((_, index) => renderSlot(index));
  updateCounter();
  updateButtons();
}

function removeImage(index) {
  const removed = images[index];
  if (removed) {
    URL.revokeObjectURL(removed.url);
  }
  images[index] = null;
  combinedDataUrl = null;
  resultSection.hidden = true;

  const input = getSlotElement(index)?.querySelector(".slot-input");
  if (input) {
    input.value = "";
  }

  renderSlot(index);
  updateCounter();
  updateButtons();
}

function clearAll() {
  images.forEach((item, index) => {
    if (item) {
      URL.revokeObjectURL(item.url);
    }
    images[index] = null;
    const input = getSlotElement(index)?.querySelector(".slot-input");
    if (input) {
      input.value = "";
    }
  });

  combinedDataUrl = null;
  resultSection.hidden = true;
  renderAllSlots();
}

async function setImageAtIndex(index, file) {
  if (!file.type.startsWith("image/")) {
    alert("画像ファイル（PNG、JPEG など）を選択してください。");
    return;
  }

  try {
    const loaded = await loadImageFromFile(file);

    if (images[index]) {
      URL.revokeObjectURL(images[index].url);
    }

    images[index] = loaded;
    combinedDataUrl = null;
    resultSection.hidden = true;
    renderSlot(index);
    updateCounter();
    updateButtons();
  } catch (error) {
    alert(error.message);
  }
}

function scaleToWidth(img, width) {
  return {
    width,
    height: img.height * (width / img.width),
  };
}

function scaleToHeight(img, height) {
  return {
    width: img.width * (height / img.height),
    height,
  };
}

function combineImages() {
  const slots = {
    front: images[INDEX.front]?.image ?? null,
    upper: images[INDEX.upper]?.image ?? null,
    lower: images[INDEX.lower]?.image ?? null,
    left: images[INDEX.left]?.image ?? null,
    right: images[INDEX.right]?.image ?? null,
  };

  const loaded = Object.values(slots).filter(Boolean);
  if (loaded.length === 0) {
    return;
  }

  const cellSize = Math.min(...loaded.map((img) => Math.max(img.width, img.height)));

  const upperSize = slots.upper ? scaleToWidth(slots.upper, cellSize) : null;
  const frontSize = slots.front ? scaleToWidth(slots.front, cellSize) : null;
  const lowerSize = slots.lower ? scaleToWidth(slots.lower, cellSize) : null;

  const yFront = upperSize?.height ?? 0;
  const frontHeight = frontSize?.height ?? cellSize;
  const yLower = yFront + (frontSize?.height ?? 0);

  const leftSize = slots.left ? scaleToHeight(slots.left, frontHeight) : null;
  const rightSize = slots.right ? scaleToHeight(slots.right, frontHeight) : null;

  const centerWidth = frontSize?.width ?? cellSize;
  const leftWidth = leftSize?.width ?? 0;
  const rightWidth = rightSize?.width ?? 0;
  const centerX = leftWidth;

  const canvasWidth = leftWidth + centerWidth + rightWidth || cellSize;

  const canvasHeight =
    (upperSize?.height ?? 0) +
    (frontSize?.height ?? 0) +
    (lowerSize?.height ?? 0) || cellSize;

  resultCanvas.width = canvasWidth;
  resultCanvas.height = canvasHeight;

  const ctx = resultCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (upperSize && slots.upper) {
    ctx.drawImage(slots.upper, centerX, 0, upperSize.width, upperSize.height);
  }

  if (frontSize && slots.front) {
    ctx.drawImage(slots.front, centerX, yFront, frontSize.width, frontSize.height);
  }

  if (lowerSize && slots.lower) {
    ctx.drawImage(slots.lower, centerX, yLower, lowerSize.width, lowerSize.height);
  }

  if (leftSize && slots.left) {
    ctx.drawImage(slots.left, 0, yFront, leftSize.width, leftSize.height);
  }

  if (rightSize && slots.right) {
    ctx.drawImage(slots.right, centerX + centerWidth, yFront, rightSize.width, rightSize.height);
  }

  combinedDataUrl = resultCanvas.toDataURL("image/png");
  resultSection.hidden = false;
  updateButtons();
}

function downloadPng() {
  if (!combinedDataUrl) {
    alert("先に「画像を結合」ボタンを押してください。");
    return;
  }

  const link = document.createElement("a");
  link.href = combinedDataUrl;
  link.download = "dental-combined.png";
  link.click();
}

SLOT_LABELS.forEach((_, index) => {
  const slot = getSlotElement(index);
  if (!slot) {
    return;
  }

  const input = slot.querySelector(".slot-input");

  slot.addEventListener("click", (event) => {
    if (event.target.closest(".remove-btn")) {
      return;
    }
    input.click();
  });

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageAtIndex(index, file);
    }
    input.value = "";
  });

  slot.addEventListener("dragover", (event) => {
    event.preventDefault();
    slot.classList.add("drag-over");
  });

  slot.addEventListener("dragleave", () => {
    slot.classList.remove("drag-over");
  });

  slot.addEventListener("drop", (event) => {
    event.preventDefault();
    slot.classList.remove("drag-over");

    const file = event.dataTransfer.files[0];
    if (file) {
      setImageAtIndex(index, file);
    }
  });
});

combineBtn.addEventListener("click", combineImages);
downloadBtn.addEventListener("click", downloadPng);
clearBtn.addEventListener("click", clearAll);

renderAllSlots();
