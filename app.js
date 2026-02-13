const STORAGE_KEY = "mini-list-items";

const addForm = document.getElementById("add-form");
const itemInput = document.getElementById("item-input");
const searchInput = document.getElementById("search-input");
const itemList = document.getElementById("item-list");

let items = loadItems();
let query = "";
let editingId = null;

render();

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = itemInput.value.trim();
  if (!text) return;

  items.unshift({
    id: crypto.randomUUID(),
    text,
  });

  saveItems();
  itemInput.value = "";
  itemInput.focus();
  render();
});

searchInput.addEventListener("input", (event) => {
  query = event.target.value.trim().toLowerCase();
  render();
});

itemList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const id = target.dataset.id;
  if (!id) return;

  if (target.matches(".delete-btn")) {
    items = items.filter((item) => item.id !== id);
    if (editingId === id) editingId = null;
    saveItems();
    render();
    return;
  }

  if (target.matches(".edit-btn")) {
    editingId = id;
    render();
    return;
  }

  if (target.matches(".cancel-edit-btn")) {
    editingId = null;
    render();
  }
});

itemList.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (!form.matches(".edit-form")) return;

  event.preventDefault();

  const id = form.dataset.id;
  const input = form.querySelector(".edit-input");
  if (!id || !(input instanceof HTMLInputElement)) return;

  const nextText = input.value.trim();
  if (!nextText) {
    input.focus();
    return;
  }

  items = items.map((item) => (item.id === id ? { ...item, text: nextText } : item));
  editingId = null;
  saveItems();
  render();
});

function loadItems() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getFilteredItems() {
  if (!query) return items;
  return items.filter((item) => item.text.toLowerCase().includes(query));
}

function render() {
  const filtered = getFilteredItems();

  if (filtered.length === 0) {
    const message = items.length === 0 ? "Aucun element pour le moment." : "Aucun resultat.";
    itemList.innerHTML = `<li class="empty">${message}</li>`;
    return;
  }

  itemList.innerHTML = filtered
    .map((item) => {
      if (item.id === editingId) {
        return `
          <li class="item">
            <form class="edit-form" data-id="${item.id}">
              <input class="edit-input" type="text" value="${escapeHtml(item.text)}" aria-label="Modifier ${escapeHtml(item.text)}" required />
              <button type="submit" class="save-btn">Enregistrer</button>
              <button type="button" class="cancel-edit-btn" data-id="${item.id}">Annuler</button>
            </form>
          </li>
        `;
      }

      return `
        <li class="item">
          <span class="item-text">${escapeHtml(item.text)}</span>
          <div class="item-actions">
            <button class="edit-btn" data-id="${item.id}" aria-label="Modifier ${escapeHtml(item.text)}">Modifier</button>
            <button class="delete-btn" data-id="${item.id}" aria-label="Supprimer ${escapeHtml(item.text)}">Supprimer</button>
          </div>
        </li>
      `;
    })
    .join("");

  const activeInput = itemList.querySelector(".edit-input");
  if (activeInput instanceof HTMLInputElement) {
    activeInput.focus();
    activeInput.select();
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}