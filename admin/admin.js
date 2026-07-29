// ============================================================================
// HALZZ WALL — admin.js
// Moderation queue + (admin-only) user role management.
// ============================================================================

import { supabase, CLOUDFLARE_STREAM_SUBDOMAIN } from "../js/supabase-client.js";
import { getProfile } from "../js/auth.js";
import { badgeHtml } from "../js/badges.js";

let activeTab = "queue";

export async function initAdmin() {
  const profile = getProfile();
  const guard = document.getElementById("adminGuard");
  const main = document.getElementById("adminMain");

  // Mods can access the panel (for the moderation queue); only admins get
  // the Users tab, since granting mod/admin/verified status is a bigger
  // power than removing a reported video.
  if (!profile?.is_admin && !profile?.is_mod) {
    guard.style.display = "flex";
    main.style.display = "none";
    return;
  }
  guard.style.display = "none";
  main.style.display = "block";

  renderTabs(profile);
  await renderActiveTab();
}

function renderTabs(profile) {
  const tabsEl = document.getElementById("adminTabs");
  const showUsers = profile?.is_admin;

  tabsEl.innerHTML = `
    <button data-tab="queue" class="${activeTab === "queue" ? "active" : ""}">Reported videos</button>
    ${showUsers ? `<button data-tab="users" class="${activeTab === "users" ? "active" : ""}">Users</button>` : ""}
  `;

  tabsEl.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", async () => {
      activeTab = btn.dataset.tab;
      renderTabs(profile);
      await renderActiveTab();
    });
  });
}

async function renderActiveTab() {
  if (activeTab === "users") await renderUsers();
  else await renderQueue();
}

// ---------------------------------------------------------------------------
// Reported videos queue
// ---------------------------------------------------------------------------

async function renderQueue() {
  const listEl = document.getElementById("adminContent");
  listEl.innerHTML = `<p class="mono" style="font-size:12px;color:var(--ink-dim)">Loading...</p>`;

  const { data, error } = await supabase
    .from("videos")
    .select("id, cf_stream_uid, caption, report_count, status, owner_id, profiles(username)")
    .gt("report_count", 0)
    .neq("status", "removed")
    .order("report_count", { ascending: false });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = `<p class="mono" style="font-size:12px;color:var(--ink-dim)">Queue's empty. Nothing reported right now.</p>`;
    return;
  }

  listEl.innerHTML = data.map(v => `
    <div class="slip" style="width:100%; margin-bottom:16px;">
      <div class="slip-head">
        <span>@${v.profiles?.username ?? "unknown"} — ${v.report_count} report(s)</span>
      </div>
      <div style="display:flex; gap:12px; padding:12px 14px;">
        <img src="https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.cf_stream_uid}/thumbnails/thumbnail.jpg"
             style="width:90px; height:120px; object-fit:cover; border:1.5px solid var(--ink); flex:0 0 auto;" alt="" />
        <div style="flex:1; min-width:0;">
          <p style="font-size:13px; margin-bottom:10px;">${v.caption ? escapeHtml(v.caption) : "(no caption)"}</p>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-stamp" data-remove="${v.id}">Remove</button>
            <button class="btn btn-ghost" data-dismiss="${v.id}">Dismiss reports</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.from("videos").update({ status: "removed" }).eq("id", btn.dataset.remove);
      renderQueue();
    });
  });

  listEl.querySelectorAll("[data-dismiss]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await supabase.from("videos").update({ report_count: 0 }).eq("id", btn.dataset.dismiss);
      await supabase.from("reports").update({ resolved: true }).eq("video_id", btn.dataset.dismiss);
      renderQueue();
    });
  });
}

// ---------------------------------------------------------------------------
// Users tab (admin-only): grant/revoke mod, verified, admin
// ---------------------------------------------------------------------------

async function renderUsers() {
  const listEl = document.getElementById("adminContent");
  listEl.innerHTML = `<p class="mono" style="font-size:12px;color:var(--ink-dim)">Loading...</p>`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_admin, is_mod, is_verified, created_at")
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = `<p class="mono" style="font-size:12px;color:var(--ink-dim)">No users found.</p>`;
    return;
  }

  listEl.innerHTML = `
    <table class="users-table">
      <thead>
        <tr><th>User</th><th>Roles</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr data-row="${p.id}">
            <td>@${escapeHtml(p.username)}</td>
            <td>${badgeHtml(p) || "<span class='mono' style='color:var(--ink-dim)'>none</span>"}</td>
            <td>
              <button class="role-btn ${p.is_verified ? "on" : ""}" data-toggle="is_verified" data-id="${p.id}">Verified</button>
              <button class="role-btn ${p.is_mod ? "on" : ""}" data-toggle="is_mod" data-id="${p.id}">Mod</button>
              <button class="role-btn ${p.is_admin ? "on" : ""}" data-toggle="is_admin" data-id="${p.id}">Admin</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  listEl.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const field = btn.dataset.toggle;
      const id = btn.dataset.id;
      const turningOn = !btn.classList.contains("on");

      if (field === "is_admin" && turningOn) {
        if (!confirm("Grant full admin access to this account? Admins can manage every user's roles.")) return;
      }

      const { error } = await supabase.from("profiles").update({ [field]: turningOn }).eq("id", id);
      if (!error) renderUsers();
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
