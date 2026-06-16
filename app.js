// 1. Wklej swoje dane z Supabase:
// Supabase → Project Settings → API
const SUPABASE_URL = "WKLEJ_TUTAJ_PROJECT_URL";
const SUPABASE_ANON_KEY = "WKLEJ_TUTAJ_ANON_PUBLIC_KEY";

// 2. Nazwa bucketu ze zdjęciami w Supabase Storage
const STORAGE_BUCKET = "Wesele_AL_2026";

// 3. Nazwa tabeli w bazie Supabase
const TABLE_NAME = "wedding_tasks";

const supabaseClient = supabase.createClient(https://pesjyqlzqujcxwkpexhq.supabase.co, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlc2p5cWx6cXVqY3h3a3BleGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzA1NDUsImV4cCI6MjA5NzIwNjU0NX0.A7n6sxXXfELmHphz73Hy4GnplohLyvX4OFVZAfxexy0);

const tasks = [
  "Zdjęcie z Panem Młodym",
  "Zdjęcie z Panną Młodą",
  "Selfie całego stołu",
  "Zdjęcie w tańcu",
  "Toast za Parę Młodą",
  "Zdjęcie z kimś poznanym dziś",
  "Najśmieszniejsza mina",
  "Zdjęcie dekoracji",
  "Zdjęcie z parkietu",
  "Zdjęcie z osobą w czerwieni",
  "Zdjęcie z rodzicami Pary Młodej",
  "Zdjęcie obrączek albo bukietu",
  "Grupowe serce z dłoni",
  "Zdjęcie przy fotobudce",
  "Zdjęcie deseru lub tortu",
  "Zdjęcie z największym uśmiechem"
];

const board = document.querySelector("#board");
const guestName = document.querySelector("#guestName");
const tableNumber = document.querySelector("#tableNumber");
const completedCount = document.querySelector("#completedCount");
const bingoStatus = document.querySelector("#bingoStatus");

const dialog = document.querySelector("#taskDialog");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogDescription = document.querySelector("#dialogDescription");
const photoInput = document.querySelector("#photoInput");
const preview = document.querySelector("#preview");
const saveTask = document.querySelector("#saveTask");
const uploadMessage = document.querySelector("#uploadMessage");

let selectedTaskIndex = null;
let completed = JSON.parse(localStorage.getItem("weddingBingoCompleted") || "[]");

function renderBoard() {
  board.innerHTML = "";

  tasks.forEach((task, index) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.textContent = task;

    if (completed.includes(index)) {
      tile.classList.add("done");
    }

    tile.addEventListener("click", () => openTask(index));
    board.appendChild(tile);
  });

  updateStatus();
}

function openTask(index) {
  selectedTaskIndex = index;
  dialogTitle.textContent = tasks[index];
  dialogDescription.textContent = "Zrób zdjęcie do tego zadania i zapisz je w bingo.";
  photoInput.value = "";
  preview.hidden = true;
  preview.src = "";
  uploadMessage.textContent = "";
  dialog.showModal();
}

photoInput.addEventListener("change", () => {
  const file = photoInput.files?.[0];

  if (!file) {
    preview.hidden = true;
    preview.src = "";
    return;
  }

  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

saveTask.addEventListener("click", async () => {
  try {
    const file = photoInput.files?.[0];

    if (!guestName.value.trim()) {
      uploadMessage.textContent = "Najpierw wpisz imię albo nazwę drużyny.";
      return;
    }

    if (!file) {
      uploadMessage.textContent = "Dodaj zdjęcie przed zapisem.";
      return;
    }

    if (SUPABASE_URL.includes("WKLEJ") || SUPABASE_ANON_KEY.includes("WKLEJ")) {
      uploadMessage.textContent = "Brakuje danych Supabase w pliku app.js.";
      return;
    }

    saveTask.disabled = true;
    uploadMessage.textContent = "Wysyłam zdjęcie...";

    const safeGuest = slugify(guestName.value.trim());
    const extension = file.name.split(".").pop() || "jpg";
    const filePath = `${safeGuest}/${Date.now()}-${selectedTaskIndex}.${extension}`;

    const { error: uploadError } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const photoUrl = publicData.publicUrl;

    const { error: insertError } = await supabaseClient
      .from(TABLE_NAME)
      .insert({
        guest_name: guestName.value.trim(),
        table_number: tableNumber.value.trim(),
        task_name: tasks[selectedTaskIndex],
        photo_url: photoUrl
      });

    if (insertError) {
      throw insertError;
    }

    if (!completed.includes(selectedTaskIndex)) {
      completed.push(selectedTaskIndex);
      localStorage.setItem("weddingBingoCompleted", JSON.stringify(completed));
    }

    uploadMessage.textContent = "Zapisane!";

    setTimeout(() => {
      dialog.close();
      saveTask.disabled = false;
      renderBoard();
    }, 650);
  } catch (error) {
    console.error(error);
    saveTask.disabled = false;
    uploadMessage.textContent = "Błąd zapisu. Sprawdź konfigurację Supabase.";
  }
});

function updateStatus() {
  completedCount.textContent = `${completed.length}/16`;

  if (hasBingo()) {
    bingoStatus.textContent = "BINGO!";
  } else {
    bingoStatus.textContent = "Jeszcze bez bingo";
  }
}

function hasBingo() {
  const lines = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
    [12, 13, 14, 15],
    [0, 4, 8, 12],
    [1, 5, 9, 13],
    [2, 6, 10, 14],
    [3, 7, 11, 15],
    [0, 5, 10, 15],
    [3, 6, 9, 12]
  ];

  return lines.some(line => line.every(index => completed.includes(index)));
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

renderBoard();
