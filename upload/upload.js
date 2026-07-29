// ============================================================================
// HALZZ WALL — upload.js
// ============================================================================

import { supabase, CREATE_UPLOAD_URL_ENDPOINT } from "../js/supabase-client.js";
import { getUser } from "../js/auth.js";

export function initUpload() {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("videoFile");
  const captionInput = document.getElementById("caption");
  const statusEl = document.getElementById("uploadStatus");
  const submitBtn = document.getElementById("uploadSubmit");
  const progressBar = document.getElementById("uploadProgressBar");
  const progressWrap = document.getElementById("uploadProgressWrap");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = getUser();
    if (!user) {
      statusEl.textContent = "Sign in first.";
      return;
    }

    const file = fileInput.files[0];
    if (!file) {
      statusEl.textContent = "Pick a video file first.";
      return;
    }
    if (!file.type.startsWith("video/")) {
      statusEl.textContent = "That's not a video file.";
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      statusEl.textContent = "Keep it under 500MB.";
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = "Requesting upload slot...";
    progressWrap.style.display = "block";
    progressBar.style.width = "0%";

    try {
      // 1. Ask our Edge Function for a one-time Cloudflare Stream upload URL.
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(CREATE_UPLOAD_URL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      const { uploadURL, uid, error } = await res.json();
      if (error) throw new Error(error);

      // 2. Upload the file straight to Cloudflare Stream.
      statusEl.textContent = "Uploading...";
      await uploadWithProgress(uploadURL, file, (pct) => {
        progressBar.style.width = pct + "%";
      });

      // 3. Record it in our database. Cloudflare takes a little time to
      //    finish encoding, so this starts as "processing" — refresh the
      //    feed in a minute or two and it'll show up once ready.
      statusEl.textContent = "Saving...";
      const { error: dbError } = await supabase.from("videos").insert({
        owner_id: user.id,
        cf_stream_uid: uid,
        caption: captionInput.value.trim() || null,
        status: "processing",
      });
      if (dbError) throw dbError;

      statusEl.textContent = "Posted. It'll show up in the feed once it finishes processing.";
      form.reset();
      progressWrap.style.display = "none";
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Upload failed: " + (err.message || "unknown error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function uploadWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload to Cloudflare failed (" + xhr.status + ")"));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(fd);
  });
}
