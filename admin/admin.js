// ============================================================================
// HALZZ WALL — admin.js
// Moderation queue: shows reported videos, lets an admin remove or dismiss.
// ============================================================================

import { supabase, CLOUDFLARE_STREAM_SUBDOMAIN } from "../js/supabase-client.js";
import { getProfile } from "../js/auth.js";

export async function initAdmin() {
  const profile = getProfile();
  const guard = document.getElementById("adminGuard");
  const main = document.getElementById("adminMain");

  if (!profile?.is_admin) {
    guard.style.display = "flex";
    main.style.display = "none";
    return;
  }
  guard.style.display = "none";
  main.style.display = "block";

  await renderQueue();
}

async function renderQueue() {
  const listEl = document.getElementById("adminQueue");
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

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
