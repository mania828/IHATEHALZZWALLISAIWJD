// ============================================================================
// HALZZ WALL — badges.js
// Shared helper for rendering role badges (admin / mod / verified) and
// avatar circles anywhere a username shows up (feed, comments, profile).
// ============================================================================

export function badgeHtml(profile) {
  if (!profile) return "";
  if (profile.is_admin) return `<span class="badge-tag badge-admin" title="Admin">ADMIN</span>`;
  if (profile.is_mod) return `<span class="badge-tag badge-mod" title="Moderator">MOD</span>`;
  if (profile.is_verified) return `<span class="badge-tag badge-verified" title="Verified">✓</span>`;
  return "";
}

export function avatarHtml(profile, size = 28) {
  const username = profile?.username ?? "?";
  const initial = username.charAt(0).toUpperCase();
  if (profile?.avatar_url) {
    return `<img class="avatar-img" src="${profile.avatar_url}" alt="" style="width:${size}px;height:${size}px" />`;
  }
  return `<span class="avatar-fallback" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${initial}</span>`;
}

// Combined "avatar + @username + badge" row, used in feed cards and comments.
export function ownerRowHtml(profile, prefix = "") {
  return `
    <span class="owner-row">
      ${avatarHtml(profile, 24)}
      <span>${prefix}@${profile?.username ?? "unknown"}</span>
      ${badgeHtml(profile)}
    </span>
  `;
}
