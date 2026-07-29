// ============================================================================
// HALZZ WALL — profile.js
// ============================================================================

import { supabase, CLOUDFLARE_STREAM_SUBDOMAIN } from "../js/supabase-client.js";
import { getUser, getProfile, requireAuth } from "../js/auth.js";

export async function initProfile() {
  const user = getUser();
  if (!user) return; // upload/index-style redirect handled by caller

  const profile = getProfile();
  renderHeader(profile);
  await renderVideos(user.id);
  wireEditForm(profile);
}

function renderHeader(profile) {
  document.getElementById("profileUsername").textContent = "@" + (profile?.username ?? "...");
  document.getElementById("profileBio").textContent = profile?.bio || "No bio yet.";
  document.getElementById("bioInput").value = profile?.bio || "";
  document.getElementById("displayNameInput").value = profile?.display_name || "";
}

async function renderVideos(userId) {
  const grid = document.getElementById("profileGrid");
  const { data, error } = await supabase
    .from("videos")
    .select("id, cf_stream_uid, caption, status, l_count, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    grid.innerHTML = `<p class="mono" style="font-size:12px;color:var(--ink-dim);grid-column:1/-1">Nothing filed yet.</p>`;
    return;
  }

  grid.innerHTML = data.map(v => `
    <div style="position:relative; aspect-ratio:9/16; border:2px solid var(--ink); border-radius:3px; overflow:hidden; background:#000;">
      ${v.status === "ready"
        ? `<img src="https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.cf_stream_uid}/thumbnails/thumbnail.jpg" style="width:100%;height:100%;object-fit:cover" alt="" />`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:11px;text-align:center;padding:8px">${v.status.toUpperCase()}</div>`
      }
      <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(31,28,20,0.75);color:#efe9d8;font-size:11px;padding:4px 6px;font-family:'IBM Plex Mono',monospace">
        L ${v.l_count}
      </div>
    </div>
  `).join("");
}

function wireEditForm(profile) {
  const form = document.getElementById("editProfileForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    requireAuth(async () => {
      const user = getUser();
      const displayName = document.getElementById("displayNameInput").value.trim();
      const bio = document.getElementById("bioInput").value.trim();

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName || null, bio: bio || null })
        .eq("id", user.id);

      const statusEl = document.getElementById("editStatus");
      statusEl.textContent = error ? "Couldn't save." : "Saved.";
      if (!error) {
        document.getElementById("profileBio").textContent = bio || "No bio yet.";
      }
    });
  });
}
