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

// Matches /@username/vid/<uuid> — the permalink format for a single post.
const PERMALINK_RE = /^\/@([a-zA-Z0-9_]+)\/vid\/([0-9a-fA-F-]{36})\/?$/;

export async function initFeed() {
  const feedEl = document.getElementById("feed");
  if (!feedEl) return;

  const match = window.location.pathname.match(PERMALINK_RE);
  if (match) {
    await renderSingleVideo(feedEl, match[1], match[2]);
    return; // permalink view doesn't paginate
  }

  await loadMore(feedEl);

  feedEl.addEventListener("scroll", () => {
    const nearBottom = feedEl.scrollTop + feedEl.clientHeight > feedEl.scrollHeight - feedEl.clientHeight;
    if (nearBottom) loadMore(feedEl);
  });
}

// ---------------------------------------------------------------------------
// Single-video permalink view (halzzwall.org/@username/vid/<id>)
// ---------------------------------------------------------------------------

async function renderSingleVideo(feedEl, username, videoId) {
  const { data: v, error } = await supabase
    .from("videos")
    .select("id, cf_stream_uid, caption, l_count, comment_count, created_at, owner_id, status, profiles(username)")
    .eq("id", videoId)
    .single();

  if (error || !v || v.status !== "ready" || v.profiles?.username !== username) {
    feedEl.innerHTML = `
      <div class="slide">
        <div class="empty-state">
          <span class="stamp-font">NOT FOUND</span>
          <p>This one isn't here anymore — removed, still processing, or the link's wrong.</p>
          <a href="/" class="btn btn-primary" style="margin-top:16px; display:inline-flex;">Back to feed</a>
        </div>
      </div>
    `;
    return;
  }

  document.title = `@${username} on HALZZ WALL — ${v.caption ?? "loser core"}`;

  const user = getUser();
  let liked = false;
  if (user) {
    const { data: l } = await supabase
      .from("video_ls")
      .select("video_id")
      .eq("video_id", v.id)
      .eq("user_id", user.id)
      .maybeSingle();
    liked = !!l;
  }

  feedEl.appendChild(renderSlide(v, liked));

  const backLink = document.createElement("div");
  backLink.style.textAlign = "center";
  backLink.style.padding = "20px";
  backLink.innerHTML = `<a href="/" class="btn btn-ghost">← Back to the full feed</a>`;
  feedEl.appendChild(backLink);
}

function permalinkFor(v) {
  const username = v.profiles?.username ?? "unknown";
  return `${window.location.origin}/@${username}/vid/${v.id}`;
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
          <button class="report-link" data-share-btn>share</button>
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

  slide.querySelector("[data-share-btn]").addEventListener("click", async () => {
    const url = permalinkFor(v);
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied:\n" + url);
    } catch {
      prompt("Copy this link:", url);
    }
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
