// ============================================================================
// HALZZ WALL — feed.js
// ============================================================================

import { supabase, CLOUDFLARE_STREAM_SUBDOMAIN } from "./supabase-client.js";
import { getUser, requireAuth } from "./auth.js";
import { openComments } from "./comments.js";

const PAGE_SIZE = 8;
let page = 0;
let loading = false;
let reachedEnd = false;
const seenIds = new Set();

export async function initFeed() {
  const feedEl = document.getElementById("feed");
  if (!feedEl) return;

  await loadMore(feedEl);

  feedEl.addEventListener("scroll", () => {
    const nearBottom = feedEl.scrollTop + feedEl.clientHeight > feedEl.scrollHeight - feedEl.clientHeight;
    if (nearBottom) loadMore(feedEl);
  });
}

async function loadMore(feedEl) {
  if (loading || reachedEnd) return;
  loading = true;

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: videos, error } = await supabase
    .from("videos")
    .select("id, cf_stream_uid, caption, l_count, comment_count, created_at, owner_id, profiles(username)")
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .range(from, to);

  loading = false;

  if (error) {
    console.error(error);
    return;
  }

  if (!videos || videos.length === 0) {
    reachedEnd = true;
    if (page === 0) renderEmptyState(feedEl);
    return;
  }

  page += 1;
  if (videos.length < PAGE_SIZE) reachedEnd = true;

  const user = getUser();
  let likedSet = new Set();
  if (user && videos.length) {
    const { data: ls } = await supabase
      .from("video_ls")
      .select("video_id")
      .eq("user_id", user.id)
      .in("video_id", videos.map(v => v.id));
    likedSet = new Set((ls ?? []).map(r => r.video_id));
  }

  for (const v of videos) {
    if (seenIds.has(v.id)) continue;
    seenIds.add(v.id);
    feedEl.appendChild(renderSlide(v, likedSet.has(v.id)));
  }
}

function renderEmptyState(feedEl) {
  feedEl.innerHTML = `
    <div class="slide">
      <div class="empty-state">
        <span class="stamp-font">NOTHING ON FILE</span>
        <p>No videos posted yet. Be the first L on the board — hit Post below.</p>
      </div>
    </div>
  `;
}

function renderSlide(v, liked) {
  const slide = document.createElement("div");
  slide.className = "slide";

  const caseNumber = v.id.slice(0, 8).toUpperCase();
  const username = v.profiles?.username ?? "unknown";
  const dateStr = new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  slide.innerHTML = `
    <div class="slip">
      <div class="stamp">L</div>
      <div class="slip-head">
        <span>CASE #${caseNumber}</span>
        <span>${dateStr}</span>
      </div>
      <div class="slip-video">
        <iframe
          src="https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${v.cf_stream_uid}/iframe?muted=false&loop=true&preload=metadata"
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
      <div class="slip-body">
        <div class="slip-owner">FILED BY @${username}</div>
        ${v.caption ? `<div class="slip-caption">${escapeHtml(v.caption)}</div>` : ""}
        <div class="slip-actions">
          <button class="l-btn ${liked ? "active" : ""}" data-l-btn data-video="${v.id}">
            <span data-l-icon>L</span>
            <span data-l-count>${v.l_count}</span>
          </button>
          <span class="slip-stat" data-comment-open style="cursor:pointer">💬 ${v.comment_count}</span>
          <button class="report-link" data-report-btn>report</button>
        </div>
      </div>
    </div>
  `;

  slide.querySelector("[data-l-btn]").addEventListener("click", (e) => {
    requireAuth(() => toggleL(e.currentTarget, v.id));
  });

  slide.querySelector("[data-comment-open]").addEventListener("click", () => {
    openComments(v.id);
  });

  slide.querySelector("[data-report-btn]").addEventListener("click", () => {
    requireAuth(() => fileReport(v.id));
  });

  return slide;
}

async function toggleL(btn, videoId) {
  const user = getUser();
  const countEl = btn.querySelector("[data-l-count]");
  const isActive = btn.classList.contains("active");

  btn.classList.toggle("active");
  countEl.textContent = Number(countEl.textContent) + (isActive ? -1 : 1);

  if (isActive) {
    await supabase.from("video_ls").delete().eq("video_id", videoId).eq("user_id", user.id);
  } else {
    await supabase.from("video_ls").insert({ video_id: videoId, user_id: user.id });
  }
}

async function fileReport(videoId) {
  const reason = prompt("What's wrong with this one?");
  if (!reason) return;
  const user = getUser();
  const { error } = await supabase.from("reports").insert({
    video_id: videoId,
    reporter_id: user.id,
    reason,
  });
  alert(error ? "Couldn't file that — maybe you already reported this one." : "Filed. Thanks.");
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
