/* ------------------- YOUTUBE PLAYER + VIDEO QUEUE ------------------- */

import { QUEUE_SIZE } from "./config.js";
import { fetchWithRetry } from "./api.js";
import { saveToHistory, isRecentlyPlayed } from "./history.js";
import { applyTranslations, t } from "./i18n.js";

let player = null;
let autoMode = false;
let videoQueue = [];
let playerReady = false;
let maintainingQueue = false;

// DOM references, resolved in initPlayerControls()
let rngBtn;
let videoTitle;
let videoNote;
let playerSpinner;
let autoToggleBtn;

/* ------------------- QUEUE MAINTENANCE ------------------- */

async function maintainQueue() {
  if (maintainingQueue) return;
  maintainingQueue = true;

  try {
    const needed = QUEUE_SIZE - videoQueue.length;
    const results = await Promise.all(
      Array.from({ length: Math.max(needed, 0) }, () => fetchWithRetry())
    );

    for (const video of results) {
      if (!video) continue;

      // Skip recently-played videos; don't add them even as a fallback
      // so the history block stays meaningful
      if (!isRecentlyPlayed(video.video)) {
        videoQueue.push(video);
      }
    }
  } finally {
    maintainingQueue = false;
  }

  // If queue is still empty after filling attempts, warn the user
  if (videoQueue.length === 0) {
    videoNote.textContent = "⚠ Unable to reach the server. Try again later.";
  }
}

/* ------------------- LOAD / PLAY ------------------- */

function loadVideo(data) {
  if (!player || typeof player.loadVideoById !== "function") {
    return;
  }

  videoTitle.textContent = data.title || "";
  videoNote.textContent = data.note || "";
  player.loadVideoById(data.video);
  saveToHistory(data.video, data.title);
}

function playNextVideo() {
  if (videoQueue.length === 0) {
    videoNote.textContent = "⚠ Failed to load video. Please try again.";
    rngBtn.disabled = false;
    return;
  }

  const data = videoQueue.shift();

  if (!data || !data.video) {
    videoNote.textContent = "⚠ Invalid video data received.";
    rngBtn.disabled = false;
    return;
  }

  loadVideo(data);
  maintainQueue();
}

/* ------------------- YOUTUBE PLAYER INIT ------------------- */

// Handles the race between the YT API script firing onYouTubeIframeAPIReady
// and this module finishing its setup. Both sides set a flag; whichever
// arrives second calls the actual init function, so order doesn't matter.

let ytApiReady = false;
let appScriptReady = false;

function startPlayerInit() {
  if (!ytApiReady || !appScriptReady) return;
  initPlayer();
}

// The YouTube IFrame API looks for this on window
window.onYouTubeIframeAPIReady = function () {
  ytApiReady = true;
  startPlayerInit();
};

/** Call once the app's own setup (translations, DOM wiring) is done. */
export function markAppReady() {
  appScriptReady = true;
  if (window.YT && window.YT.Player) {
    ytApiReady = true;
  }
  startPlayerInit();
}

async function initPlayer() {
  // Reset player DOM node in case this is a retry call
  const existingPlayer = document.getElementById("videoPlayer");
  if (existingPlayer) {
    existingPlayer.innerHTML = "";
  }

  // Fetch one video first so the player can start as fast as possible,
  // then fill the rest of the queue in the background once it's ready.
  const firstVideo = await fetchWithRetry();

  if (!firstVideo) {
    videoNote.textContent = "⚠ Failed to load initial video.";
    playerSpinner.style.display = "none";
    rngBtn.textContent = "Retry";
    rngBtn.disabled = false;
    rngBtn.addEventListener("click", retryInit, { once: true });
    return;
  }

  player = new window.YT.Player("videoPlayer", {
    height: "630",
    width: "1120",
    videoId: firstVideo.video,
    playerVars: { autoplay: 0, controls: 1, rel: 0 },
    events: {
      onReady: () => onPlayerReady(firstVideo),
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
}

function retryInit() {
  videoQueue = [];
  initPlayer();
}

function onPlayerReady(firstVideo) {
  playerReady = true;
  rngBtn.disabled = false;
  rngBtn.setAttribute("data-i18n", "randomButton");
  rngBtn.textContent = t("randomButton", "Get a random song");
  playerSpinner.style.display = "none";
  videoTitle.textContent = firstVideo.title || "";
  videoNote.textContent = firstVideo.note || "";
  saveToHistory(firstVideo.video, firstVideo.title);

  // Start filling the queue in the background now that the player is ready
  maintainQueue();
}

/* ------------------- PLAYER EVENTS ------------------- */

function onPlayerStateChange(event) {
  if (event.data === window.YT.PlayerState.PLAYING) {
    rngBtn.disabled = false;
  }

  if (event.data === window.YT.PlayerState.ENDED && autoMode) {
    playNextVideo();
  }
}

function onPlayerError(event) {
  console.warn("YouTube error:", event.data);
  videoNote.textContent = "⚠ Video unavailable. Loading another one.";
  playNextVideo();
}

/* ------------------- CONTROLS ------------------- */

function toggleAutoPlay() {
  autoMode = !autoMode;
  autoToggleBtn.dataset.i18n = autoMode ? "autoplayOn" : "autoplayOff";
  applyTranslations();
}

/** Grab DOM elements and wire up the buttons. Call once the DOM is ready. */
export function initPlayerControls() {
  rngBtn = document.getElementById("rngVideo");
  videoTitle = document.getElementById("videoTitle");
  videoNote = document.getElementById("videoNote");
  playerSpinner = document.getElementById("playerSpinner");
  autoToggleBtn = document.getElementById("autoToggle");

  autoToggleBtn.addEventListener("click", toggleAutoPlay);

  rngBtn.addEventListener("click", () => {
    if (!playerReady) return;
    rngBtn.disabled = true;
    playNextVideo();
  });
}
