// ============================================================================
// HALZZ WALL — auth.js
// Shared sign-up / log-in modal + session helpers, used on every page.
// ============================================================================

import { supabase } from "./supabase-client.js";

let currentUser = null;
let currentProfile = null;
const listeners = [];

export function onAuthChange(fn) {
  listeners.push(fn);
  if (currentUser !== null) fn(currentUser, currentProfile);
}

function notify() {
  for (const fn of listeners) fn(currentUser, currentProfile);
}

export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  await applySession(session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await applySession(session);
  });
}

async function applySession(session) {
  currentUser = session?.user ?? null;
  if (currentUser) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();
    currentProfile = data ?? null;
  } else {
    currentProfile = null;
  }
  notify();
}

export function getUser() { return currentUser; }
export function getProfile() { return currentProfile; }

// ---------------------------------------------------------------------------
// Modal UI
// ---------------------------------------------------------------------------

export function openAuthModal(mode = "login") {
  const existing = document.getElementById("authModalBackdrop");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "authModalBackdrop";
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = renderModal(mode);
  document.body.appendChild(backdrop);

  wireModal(backdrop, mode);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
}

function renderModal(mode) {
  const isLogin = mode === "login";
  return `
    <div class="modal" style="position:relative">
      <button class="modal-close" aria-label="Close" data-close>×</button>
      <h2 class="stamp-font">${isLogin ? "Sign back in" : "Get an account"}</h2>
      <p class="sub">${isLogin ? "Welcome back. You know what you did." : "Required to post an L. Free."}</p>
      <div class="modal-error" data-error></div>
      <form data-form>
        ${isLogin ? "" : `
        <div class="field">
          <label for="af-username">Username</label>
          <input id="af-username" name="username" type="text" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" />
        </div>`}
        <div class="field">
          <label for="af-email">Email</label>
          <input id="af-email" name="email" type="email" required />
        </div>
        <div class="field">
          <label for="af-password">Password</label>
          <input id="af-password" name="password" type="password" required minlength="6" />
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center" data-submit>
          ${isLogin ? "Sign in" : "Create account"}
        </button>
      </form>
      <div class="modal-switch">
        ${isLogin ? "New here?" : "Already got an account?"}
        <button type="button" data-switch>${isLogin ? "Create one" : "Sign in"}</button>
      </div>
    </div>
  `;
}

function wireModal(backdrop, mode) {
  backdrop.querySelector("[data-close]").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("[data-switch]").addEventListener("click", () => {
    openAuthModal(mode === "login" ? "signup" : "login");
  });

  const form = backdrop.querySelector("[data-form]");
  const errorEl = backdrop.querySelector("[data-error]");
  const submitBtn = backdrop.querySelector("[data-submit]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    submitBtn.disabled = true;

    const fd = new FormData(form);
    const email = fd.get("email");
    const password = fd.get("password");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const username = fd.get("username");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (error) throw error;
      }
      backdrop.remove();
    } catch (err) {
      errorEl.textContent = err.message || "Something went wrong. Try again.";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Requires a signed-in user before running `fn`; opens the login modal
// instead if the visitor isn't signed in yet.
export function requireAuth(fn) {
  if (getUser()) {
    fn();
  } else {
    openAuthModal("login");
  }
}
