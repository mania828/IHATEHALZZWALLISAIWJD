// ============================================================================
// HALZZ WALL — nav.js
// Shared top bar + bottom nav, injected on every page.
// ============================================================================

import { getUser, getProfile, onAuthChange, openAuthModal, signOut } from "./auth.js";

export function mountNav(activePage) {
  const topbarRoot = document.getElementById("topbar");
  const bottomnavRoot = document.getElementById("bottomnav");
  if (!topbarRoot || !bottomnavRoot) return;

  bottomnavRoot.innerHTML = `
    <a href="/" class="${activePage === "feed" ? "active" : ""}">
      <svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/></svg>
      Feed
    </a>
    <a href="/upload/" class="${activePage === "upload" ? "active" : ""}">
      <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 9v6M9 12h6"/></svg>
      Post
    </a>
    <a href="/profile/" class="${activePage === "profile" ? "active" : ""}">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6"/></svg>
      Profile
    </a>
  `;

  function renderTopbar() {
    const user = getUser();
    const profile = getProfile();
    topbarRoot.innerHTML = `
      <a href="/" class="wordmark">
        HALZZ WALL
        <small>loser core</small>
      </a>
      <div class="topbar-actions">
        ${user
          ? `<span class="mono" style="font-size:12px;color:var(--ink-dim)">@${profile?.username ?? "..."}</span>
             <button class="btn btn-ghost" data-signout>Sign out</button>`
          : `<button class="btn btn-primary" data-signin>Sign in</button>`
        }
      </div>
    `;

    const signoutBtn = topbarRoot.querySelector("[data-signout]");
    if (signoutBtn) signoutBtn.addEventListener("click", () => signOut());

    const signinBtn = topbarRoot.querySelector("[data-signin]");
    if (signinBtn) signinBtn.addEventListener("click", () => openAuthModal("login"));
  }

  renderTopbar();
  onAuthChange(renderTopbar);
}
