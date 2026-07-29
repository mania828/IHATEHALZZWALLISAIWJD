// ============================================================================
// HALZZ WALL — comments.js
// Bottom-sheet comment drawer, opened from a feed card.
// ============================================================================

import { supabase } from "./supabase-client.js";
import { getUser, requireAuth } from "./auth.js";

export async function openComments(videoId) {
  closeComments();

  const backdrop = document.createElement("div");
  backdrop.id = "commentsBackdrop";
  backdrop.className = "drawer-backdrop";
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", closeComments);

  const drawer = document.createElement("div");
  drawer.id = "commentsDrawer";
  drawer.className = "drawer";
  drawer.innerHTML = `
    <div class="drawer-head">
      <span>COMMENTS</span>
      <button data-close style="background:none;border:none;font-size:18px">×</button>
    </div>
    <div class="drawer-list" data-list>
      <p class="mono" style="font-size:12px;color:var(--ink-dim)">Loading...</p>
    </div>
    <form class="drawer-input" data-form>
      <input type="text" name="body" placeholder="Say something" maxlength="500" required />
      <button type="submit" class="btn btn-primary">Post</button>
    </form>
  `;
  document.body.appendChild(drawer);

  drawer.querySelector("[data-close]").addEventListener("click", closeComments);

  drawer.querySelector("[data-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    requireAuth(async () => {
      const input = drawer.querySelector('input[name="body"]');
      const body = input.value.trim();
      if (!body) return;
      const user = getUser();
      const { error } = await supabase.from("comments").insert({
        video_id: videoId,
        user_id: user.id,
        body,
      });
      if (!error) {
        input.value = "";
        loadComments(videoId, drawer);
      }
    });
  });

  await loadComments(videoId, drawer);
}

async function loadComments(videoId, drawer) {
  const listEl = drawer.querySelector("[data-list]");
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, profiles(username)")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    listEl.innerHTML = `<p class="mono" style="font-size:12px;color:var(--ink-dim)">No comments yet. Say something first.</p>`;
    return;
  }

  listEl.innerHTML = data.map(c => `
    <div class="comment-row">
      <div class="who">@${c.profiles?.username ?? "unknown"}</div>
      <div class="body">${escapeHtml(c.body)}</div>
    </div>
  `).join("");

  listEl.scrollTop = listEl.scrollHeight;
}

export function closeComments() {
  document.getElementById("commentsBackdrop")?.remove();
  document.getElementById("commentsDrawer")?.remove();
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
