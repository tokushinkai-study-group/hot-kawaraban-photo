const SLOT_LABELS = [
  "1枚目",
  "2枚目",
  "3枚目",
];

/** インデックス: 0=1枚目, 1=2枚目, 2=3枚目 */
const INDEX = {
  front: 1,
  upper: 0,
  lower: 2,
  };

const counter = document.getElementById("counter");
const combineBtn = document.getElementById("combineBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const resultSection = document.getElementById("resultSection");
const resultCanvas = document.getElementById("resultCanvas");
/** @type {({ file: File, url: string, image: HTMLImageElement } | null)[]} */
let images = [null, null, null];

function getSlotElement(index) {
  return document.querySelector(`.upload-slot[data-index="${index}"]`);
}

/** @type {string | null} */
let combinedDataUrl = null;
let draggedIndex = null;

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
  slot.draggable = true;
  slot.ondragstart = () => {
    draggedIndex = index;
  };
    
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

  slot.draggable = false;

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

  const loadedImages = images
    .filter(Boolean)
    .map(item => item.image);

  if (loadedImages.length === 0) {
    return;
  }

  const targetWidth = Math.min(
    ...loadedImages.map(img => img.width)
  );

  const sizes = loadedImages.map(img => ({
    width: targetWidth,
    height: img.height * (targetWidth / img.width)
  }));

  resultCanvas.width = targetWidth;
  resultCanvas.height = sizes.reduce(
    (sum, size) => sum + size.height,
    0
  );

  const ctx = resultCanvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(
    0,
    0,
    resultCanvas.width,
    resultCanvas.height
  );

  let y = 0;

  loadedImages.forEach((img, i) => {
    ctx.drawImage(
      img,
      0,
      y,
      sizes[i].width,
      sizes[i].height
    );

    y += sizes[i].height;
  });

  combinedDataUrl =
    resultCanvas.toDataURL("image/png");

  resultSection.hidden = false;

  updateButtons();
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

  // 枠同士の入れ替え
  if (
    draggedIndex !== null &&
    draggedIndex !== index &&
    images[draggedIndex]
  ) {
    const temp = images[index];
    images[index] = images[draggedIndex];
    images[draggedIndex] = temp;

    renderAllSlots();

    draggedIndex = null;
    return;
  }

  // PCからファイルをドロップ
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
