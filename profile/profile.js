// ============================================================================
// HALZZ WALL — profile.js
// ============================================================================

import { supabase, CLOUDFLARE_STREAM_SUBDOMAIN } from "../js/supabase-client.js";
import { getUser, getProfile, requireAuth } from "../js/auth.js";
import { badgeHtml, avatarHtml } from "../js/badges.js";

export async function initProfile() {
  const user = getUser();
  if (!user) return; // upload/index-style redirect handled by caller

  const profile = getProfile();
  renderHeader(profile);
  await renderVideos(user.id);
  wireEditForm(profile);
  wireAvatarUpload();
}

function renderHeader(profile) {
  document.getElementById("profileUsername").innerHTML = `@${profile?.username ?? "..."} ${badgeHtml(profile)}`;
  document.getElementById("profileBio").textContent = profile?.bio || "No bio yet.";
  document.getElementById("bioInput").value = profile?.bio || "";
  document.getElementById("displayNameInput").value = profile?.display_name || "";
  document.getElementById("avatarPreview").innerHTML = avatarHtml(profile, 88);
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

function wireAvatarUpload() {
  const input = document.getElementById("avatarInput");
  const statusEl = document.getElementById("avatarStatus");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      statusEl.textContent = "That's not an image.";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      statusEl.textContent = "Keep it under 5MB.";
      return;
    }

    const user = getUser();
    const ext = file.name.split(".").pop();
    // Path starts with the user's own id — required by the storage RLS
    // policy in migration_02_badges_avatars.sql.
    const path = `${user.id}/avatar.${ext}`;

    statusEl.textContent = "Uploading...";

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      statusEl.textContent = "Upload failed: " + uploadError.message;
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new image shows immediately instead of a cached old one.
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error: dbError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (dbError) {
      statusEl.textContent = "Saved image but couldn't update profile.";
      return;
    }

    statusEl.textContent = "Updated.";
    document.getElementById("avatarPreview").innerHTML =
      `<img class="avatar-img" src="${avatarUrl}" alt="" style="width:88px;height:88px" />`;
  });
}
