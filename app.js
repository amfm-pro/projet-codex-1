const SESSION_KEY = "mini-list-session";

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const logoutBtn = document.getElementById("logout-btn");
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const userPanel = document.getElementById("user-panel");
const userEmail = document.getElementById("user-email");
const statusMessage = document.getElementById("status-message");

const addForm = document.getElementById("add-form");
const itemInput = document.getElementById("item-input");
const searchInput = document.getElementById("search-input");
const itemList = document.getElementById("item-list");

const appConfig = window.APP_CONFIG ?? {};
const supabaseUrl = appConfig.SUPABASE_URL;
const supabaseAnonKey = appConfig.SUPABASE_ANON_KEY;
const configReady = Boolean(supabaseUrl && supabaseAnonKey);

let authSession = loadSession();
let currentUser = authSession?.user ?? null;
let items = [];
let query = "";

init();

function init() {
  bindEvents();

  if (!configReady) {
    showStatus(
      "Configuration manquante: creez config.js a partir de config.example.js.",
      true
    );
    setAuthView(null);
    return;
  }

  restoreSession();
}

function bindEvents() {
  loginForm.addEventListener("submit", onLogin);
  signupForm.addEventListener("submit", onSignup);
  logoutBtn.addEventListener("click", onLogout);

  addForm.addEventListener("submit", onAddItem);
  searchInput.addEventListener("input", (event) => {
    query = event.target.value.trim().toLowerCase();
    renderItems();
  });

  itemList.addEventListener("click", onItemListClick);
}

async function restoreSession() {
  if (!authSession?.refresh_token) {
    handleUserChange(null);
    return;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    clearSession();
    handleUserChange(null);
    return;
  }

  const user = await fetchCurrentUser();
  handleUserChange(user);
}

async function onLogin(event) {
  event.preventDefault();
  const email = loginForm.querySelector("#login-email").value.trim();
  const password = loginForm.querySelector("#login-password").value;

  const response = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.error) {
    showStatus(`Connexion impossible: ${response.error}`, true);
    return;
  }

  authSession = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    user: response.data.user,
  };
  saveSession(authSession);

  loginForm.reset();
  showStatus("Connecte.", false);
  handleUserChange(authSession.user ?? null);
}

async function onSignup(event) {
  event.preventDefault();
  const email = signupForm.querySelector("#signup-email").value.trim();
  const password = signupForm.querySelector("#signup-password").value;

  const response = await authRequest("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.error) {
    showStatus(`Inscription impossible: ${response.error}`, true);
    return;
  }

  signupForm.reset();
  showStatus(
    "Compte cree. Verifiez votre email si la confirmation est activee, puis connectez-vous.",
    false
  );
}

async function onLogout() {
  if (authSession?.access_token) {
    await authRequest("/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authSession.access_token}`,
      },
    });
  }

  clearSession();
  handleUserChange(null);
  showStatus("Deconnecte.", false);
}

async function handleUserChange(user) {
  currentUser = user;
  setAuthView(user);

  if (!user) {
    items = [];
    renderItems();
    return;
  }

  await loadItems();
}

function setAuthView(user) {
  const isConnected = Boolean(user);
  authSection.hidden = isConnected;
  appSection.hidden = !isConnected;
  userPanel.hidden = !isConnected;
  userEmail.textContent = isConnected ? user.email : "";
}

async function loadItems() {
  const response = await restRequest(
    "/items?select=id,text,done,created_at&order=created_at.desc",
    { method: "GET" },
    true
  );

  if (response.error) {
    showStatus(`Chargement impossible: ${response.error}`, true);
    items = [];
    renderItems();
    return;
  }

  items = response.data ?? [];
  renderItems();
}

async function onAddItem(event) {
  event.preventDefault();
  if (!currentUser) return;

  const text = itemInput.value.trim();
  if (!text) return;

  const response = await restRequest(
    "/items",
    {
      method: "POST",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        text,
        done: false,
        user_id: currentUser.id,
      }),
    },
    true
  );

  if (response.error) {
    showStatus(`Ajout impossible: ${response.error}`, true);
    return;
  }

  const inserted = Array.isArray(response.data) ? response.data[0] : response.data;
  if (inserted) {
    items.unshift(inserted);
  }
  itemInput.value = "";
  itemInput.focus();
  renderItems();
}

async function onItemListClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const id = target.dataset.id;
  if (!id || !currentUser) return;

  if (target.matches(".delete-btn")) {
    const response = await restRequest(
      `/items?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE" },
      true
    );

    if (response.error) {
      showStatus(`Suppression impossible: ${response.error}`, true);
      return;
    }

    items = items.filter((item) => item.id !== id);
    renderItems();
    return;
  }

  if (target.matches(".toggle-btn")) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    const response = await restRequest(
      `/items?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ done: !item.done }),
      },
      true
    );

    if (response.error) {
      showStatus(`Mise a jour impossible: ${response.error}`, true);
      return;
    }

    items = items.map((entry) =>
      entry.id === id ? { ...entry, done: !entry.done } : entry
    );
    renderItems();
  }
}

function getFilteredItems() {
  if (!query) return items;
  return items.filter((item) => item.text.toLowerCase().includes(query));
}

function renderItems() {
  const filtered = getFilteredItems();

  if (filtered.length === 0) {
    const message = items.length === 0 ? "Aucun element pour le moment." : "Aucun resultat.";
    itemList.innerHTML = `<li class="empty">${message}</li>`;
    return;
  }

  itemList.innerHTML = filtered
    .map(
      (item) => `
      <li class="item ${item.done ? "item-done" : ""}">
        <span class="item-text">${escapeHtml(item.text)}</span>
        <div class="item-actions">
          <button class="toggle-btn" data-id="${item.id}" aria-label="Basculer l'etat de ${escapeHtml(
        item.text
      )}">
            ${item.done ? "Marquer a faire" : "Marquer fait"}
          </button>
          <button class="delete-btn" data-id="${item.id}" aria-label="Supprimer ${escapeHtml(
        item.text
      )}">Supprimer</button>
        </div>
      </li>
    `
    )
    .join("");
}

async function refreshSession() {
  if (!authSession?.refresh_token) return false;

  const response = await authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: authSession.refresh_token }),
  });

  if (response.error) return false;

  authSession = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token,
    user: response.data.user ?? authSession.user,
  };
  saveSession(authSession);
  return true;
}

async function fetchCurrentUser() {
  if (!authSession?.access_token) return null;

  const response = await authRequest("/user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authSession.access_token}`,
    },
  });

  if (!response.error && response.data) {
    authSession.user = response.data;
    saveSession(authSession);
    return response.data;
  }

  const refreshed = await refreshSession();
  if (!refreshed || !authSession?.access_token) return null;

  const retry = await authRequest("/user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authSession.access_token}`,
    },
  });

  if (retry.error || !retry.data) return null;

  authSession.user = retry.data;
  saveSession(authSession);
  return retry.data;
}

async function restRequest(path, options = {}, withAuth = false, retried = false) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (withAuth && authSession?.access_token) {
    headers.Authorization = `Bearer ${authSession.access_token}`;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  if (response.status === 401 && withAuth && !retried) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return restRequest(path, options, withAuth, true);
    }
  }

  if (!response.ok) {
    return { error: await readError(response) };
  }

  if (response.status === 204) {
    return { data: null };
  }

  return { data: await response.json() };
}

async function authRequest(path, options = {}) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  if (!response.ok) {
    return { error: await readError(response) };
  }

  if (response.status === 204) {
    return { data: null };
  }

  return { data: await response.json() };
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  authSession = null;
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
}

async function readError(response) {
  try {
    const data = await response.json();
    return data.msg || data.error_description || data.error || `Erreur HTTP ${response.status}`;
  } catch {
    return `Erreur HTTP ${response.status}`;
  }
}

function showStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("status-error", isError);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}