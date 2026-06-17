// =======================================================
// KONFIGURACJA SUPABASE
// =======================================================

const SUPABASE_URL = "https://pesjyqlzqujcxwkpexhq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlc2p5cWx6cXVqY3h3a3BleGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA1NDUsImV4cCI6MjA5NzIwNjU0NX0.A7n6sxXXfELmHphz73Hy4GnplohLyvX4OFVZAfxexy0";

const STORAGE_BUCKET = "wedding-photos";
const TABLE_NAME = "wedding_tasks";

// =======================================================
// ZADANIA BINGO 3x3
// =======================================================

const tasks = [
  "Z Parą Młodą",
  "Pierwszy taniec",
  "Uśmiechający się gość",
  "Tańcząca para gości",
  "Krojenie tortu",
  "Wspólny toast przy stoliku",
  "Pocałunek Państwa Młodych",
  "Selfie z gośćmi z Twojego stolika",
  "Śmieszna mina albo poza"
];

const STORAGE_KEYS = {
  playerName: "weddingBingoPlayerName",
  completed: "weddingBingoCompleted3x3",
  thumbnails: "weddingBingoThumbnails3x3"
};

let supabaseClient = null;

if (window.supabase && !SUPABASE_ANON_KEY.includes("PASTE_YOUR")) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const board = document.querySelector("#board");
const nameCard = document.querySelector("#nameCard");
const fullName = document.querySelector("#fullName");
const saveName = document.querySelector("#saveName");
const nameHelp = document.querySelector("#nameHelp");
const resetButton = document.querySelector("#resetButton");

const completedCount = document.querySelector("#completedCount");
const boardStatus = document.querySelector("#boardStatus");

const dialog = document.querySelector("#taskDialog");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogDescription = document.querySelector("#dialogDescription");
const cameraInput = document.querySelector("#cameraInput");
const galleryInput = document.querySelector("#galleryInput");
const preview = document.querySelector("#preview");
const saveTask = document.querySelector("#saveTask");
const uploadMessage = document.querySelector("#uploadMessage");

let selectedTaskIndex = null;
let selectedFile = null;

let playerName = localStorage.getItem(STORAGE_KEYS.playerName) || "";
let completed = JSON.parse(localStorage.getItem(STORAGE_KEYS.completed) || "[]");
let thumbnails = JSON.parse(localStorage.getItem(STORAGE_KEYS.thumbnails) || "{}");

init();

function init() {
  setupName();
  setupResetButton();
  renderBoard();
}

function setupName() {
  if (playerName) {
    fullName.value = playerName;
    fullName.disabled = true;
    saveName.disabled = true;
    saveName.textContent = "Zapisano";
    nameCard.classList.add("locked");
    nameHelp.textContent = "Imię i nazwisko jest zapisane na tym telefonie.";
  }

  saveName.addEventListener("click", () => {
    const value = fullName.value.trim().replace(/\s+/g, " ");

    if (value.length < 3 || !value.includes(" ")) {
      nameHelp.textContent = "Wpisz proszę imię i nazwisko.";
      return;
    }

    playerName = value;
    localStorage.setItem(STORAGE_KEYS.playerName, playerName);

    fullName.value = playerName;
    fullName.disabled = true;
    saveName.disabled = true;
    saveName.textContent = "Zapisano";
    nameCard.classList.add("locked");
    nameHelp.textContent = "Imię i nazwisko jest zapisane na tym telefonie.";
  });
}

function setupResetButton() {
  resetButton.addEventListener("click", () => {
    const confirmed = confirm(
      "Czy na pewno chcesz rozpocząć od początku? Usunie to imię, postęp i miniatury zapisane na tym telefonie. Zdjęcia wysłane wcześniej zostaną w galerii Państwa Młodych."
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEYS.playerName);
    localStorage.removeItem(STORAGE_KEYS.completed);
    localStorage.removeItem(STORAGE_KEYS.thumbnails);

    location.reload();
  });
}

function renderBoard() {
  board.innerHTML = "";

  tasks.forEach((task, index) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.setAttribute("aria-label", task);

    if (completed.includes(index)) {
      tile.classList.add("done");
    }

    if (thumbnails[index]) {
      const img = document.createElement("img");
      img.className = "tile-thumb";
      img.src = thumbnails[index];
      img.alt = "";
      tile.appendChild(img);
    }

    const title = document.createElement("span");
    title.className = "tile-title";
    title.textContent = task;
    tile.appendChild(title);

    tile.addEventListener("click", () => openTask(index));
    board.appendChild(tile);
  });

  updateStatus();
}

function openTask(index) {
  if (!playerName) {
    nameHelp.textContent = "Najpierw zapisz imię i nazwisko.";
    fullName.focus();
    return;
  }

  selectedTaskIndex = index;
  selectedFile = null;

  dialogTitle.textContent = tasks[index];
  dialogDescription.textContent = completed.includes(index)
    ? "Możesz dodać nowe zdjęcie do tego zadania. Miniatura na planszy zostanie podmieniona."
    : "Dodaj zdjęcie wykonane aparatem albo wybierz je z galerii.";

  cameraInput.value = "";
  galleryInput.value = "";
  preview.hidden = true;
  preview.src = "";
  uploadMessage.textContent = "";
  saveTask.disabled = false;

  dialog.showModal();
}

cameraInput.addEventListener("change", () => handleFileChoice(cameraInput.files?.[0]));
galleryInput.addEventListener("change", () => handleFileChoice(galleryInput.files?.[0]));

function handleFileChoice(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    uploadMessage.textContent = "Wybierz plik ze zdjęciem.";
    return;
  }

  selectedFile = file;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  uploadMessage.textContent = "";
}

saveTask.addEventListener("click", async () => {
  try {
    if (!selectedFile) {
      uploadMessage.textContent = "Najpierw zrób zdjęcie albo wybierz je z galerii.";
      return;
    }

    if (!supabaseClient) {
      uploadMessage.textContent = "Brakuje anon public key w app.js.";
      return;
    }

    saveTask.disabled = true;
    uploadMessage.textContent = "Zmniejszam i wysyłam zdjęcie...";

    const compressed = await compressImage(selectedFile, 1600, 0.82);
    const thumb = await makeThumbnail(selectedFile);

    const safeName = slugify(playerName);
    const filePath = `${safeName}/${Date.now()}-${selectedTaskIndex}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, compressed, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const photoUrl = publicData.publicUrl;

    const { error: insertError } = await supabaseClient
      .from(TABLE_NAME)
      .insert({
        guest_name: playerName,
        table_number: null,
        task_name: tasks[selectedTaskIndex],
        photo_url: photoUrl
      });

    if (insertError) throw insertError;

    markTaskAsCompleted(selectedTaskIndex, thumb);

    uploadMessage.textContent = "Zapisane!";

    setTimeout(() => {
      dialog.close();
      renderBoard();
    }, 650);
  } catch (error) {
    console.error(error);
    saveTask.disabled = false;
    uploadMessage.textContent = error?.message
      ? `Błąd zapisu: ${error.message}`
      : "Błąd zapisu zdjęcia.";
  }
});

function markTaskAsCompleted(index, thumbnail) {
  if (!completed.includes(index)) {
    completed.push(index);
    localStorage.setItem(STORAGE_KEYS.completed, JSON.stringify(completed));
  }

  thumbnails[index] = thumbnail;
  localStorage.setItem(STORAGE_KEYS.thumbnails, JSON.stringify(thumbnails));
}

function updateStatus() {
  completedCount.textContent = `${completed.length}/9`;
  boardStatus.textContent = completed.length === tasks.length
    ? "Cała plansza!"
    : "Zbieraj dalej";
}

function compressImage(file, maxSize = 1600, quality = 0.82) {
  return resizeImage(file, maxSize, quality, "blob");
}

function makeThumbnail(file) {
  return resizeImage(file, 500, 0.72, "dataUrl");
}

function resizeImage(file, maxSize, quality, output) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, width, height);

      URL.revokeObjectURL(url);

      if (output === "dataUrl") {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error("Nie udało się przygotować zdjęcia."));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nie udało się odczytać zdjęcia."));
    };

    image.src = url;
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
