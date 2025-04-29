//content.js
// Function to determine if the site is a music-related site
function isMusicSite() {
  const host = location.host;
  // Example sites: YouTube Music, Spotify, etc.
  return host.includes("music.youtube.com") || host.includes("spotify.com") || host.includes("apple.com");
}

function createFloatingPlayer() {
  if (document.getElementById("floating-player")) return;

  const player = document.createElement("div");
  player.id = "floating-player";
  player.innerHTML = `
  <div id="song-info">Loading...</div>
  <div id="progress-container">
    <div id="progress-bar">
      <div id="progress-fill"></div>
    </div>
    <div id="time-display">
      <span id="current-time">0:00</span>
      <span id="duration-time">0:00</span>
    </div>
  </div>
  <div id="controls">
    <button id="prev">⏮</button>
    <button id="play-pause">⏯</button>
    <button id="next">⏭</button>
    <button id="close-btn">✖</button>
  </div>
`;

  document.body.appendChild(player);

  // Restore position if available
  const savedPosition = localStorage.getItem("floating-player-position");
  if (savedPosition) {
    const { left, top } = JSON.parse(savedPosition);
    player.style.left = `${left}px`;
    player.style.top = `${top}px`;
    player.style.right = "auto";
    player.style.bottom = "auto";
  }

  document.getElementById("play-pause").addEventListener("click", togglePlayPause);
  document.getElementById("next").addEventListener("click", playNext);
  document.getElementById("prev").addEventListener("click", playPrevious);

  document.getElementById('close-btn').addEventListener('click', function () {
    var player = document.getElementById('floating-player');
    if (player) {
        player.style.display = 'none'; // This hides the player instead of just closing it
    }
});

  enableDrag(player);

  player.addEventListener("resize", () => {
    const { width, height } = player.getBoundingClientRect();
    localStorage.setItem("floating-player-size", JSON.stringify({ width, height }));
  });
}

function updateSongInfo() {
  const isYouTube = location.host.includes("music.youtube.com");
  const isSpotify = location.host.includes("open.spotify.com");

  const songInfo = document.getElementById("song-info");

  if (isYouTube || isSpotify) {
    let title = "", artist = "", found = false;
    let currentTime = 0, duration = 0;

    if (isYouTube) {
      const titleEl = document.querySelector(".title.ytmusic-player-bar");
      const artistEl = document.querySelector(".byline.ytmusic-player-bar");
      const video = document.querySelector("video");
      if (titleEl && artistEl) {
        title = titleEl.textContent.trim();
        artist = artistEl.textContent.trim();
        found = true;
      }
      if (video) {
        currentTime = video.currentTime;
        duration = video.duration;
      }
    } else if (isSpotify) {
      const titleEl = document.querySelector('[data-testid="nowplaying-track-link"]');
      const artistEl = document.querySelector('[data-testid="nowplaying-artist"]');
      const audio = document.querySelector("audio");
      if (titleEl && artistEl) {
        title = titleEl.textContent.trim();
        artist = artistEl.textContent.trim();
        found = true;
      }
      if (audio) {
        currentTime = audio.currentTime;
        duration = audio.duration;
      }
    }

    if (songInfo) {
      songInfo.textContent = found ? `${title} - ${artist}` : "No music playing";
    }

    // ✅ Send to background if found - now with time info
    if (found) {
      chrome.runtime.sendMessage({
        type: "songInfo",
        data: {
          title: title,
          artist: artist,
          currentTime: currentTime,
          duration: duration
        }
      });
    }

  } else {
    // Not a music site → request latest from background
    chrome.runtime.sendMessage({ type: "getSongInfo" }, (response) => {
      if (songInfo) {
        if (response && response.title) {
          songInfo.textContent = `${response.title} - ${response.artist}`;
          
          // Update timestamp displays if available
          const currentTimeDisplay = document.getElementById("current-time");
          const durationTimeDisplay = document.getElementById("duration-time");
          if (currentTimeDisplay && response.currentTime) {
            currentTimeDisplay.textContent = formatTime(response.currentTime);
          }
          if (durationTimeDisplay && response.duration) {
            durationTimeDisplay.textContent = formatTime(response.duration);
          }
        } else {
          songInfo.textContent = "No music playing";
        }
      }
    });
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds === Infinity) return "0:00";
  
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateProgressBar() {
  const progress = document.getElementById("progress-fill");
  const currentTimeDisplay = document.getElementById("current-time");
  const durationTimeDisplay = document.getElementById("duration-time");

  // If on a music site, get progress directly from the player
  if (isMusicSite() && document.visibilityState === "visible") {
    let duration, currentTime;

    if (location.host.includes("youtube")) {
      const player = document.querySelector("video");
      if (player) {
        duration = player.duration;
        currentTime = player.currentTime;
      }
    } else if (location.host.includes("spotify")) {
      const audio = document.querySelector("audio");
      if (audio) {
        duration = audio.duration;
        currentTime = audio.currentTime;
      }
    }

    if (duration && currentTime) {
      if (progress) {
        const percentage = (currentTime / duration) * 100;
        progress.style.width = `${percentage}%`;
      }
      
      // Update the timestamps
      if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(currentTime);
      if (durationTimeDisplay) durationTimeDisplay.textContent = formatTime(duration);
    }
  } else {
    // Not a music site or tab not visible - get progress from background
    chrome.runtime.sendMessage({ type: "getProgress" }, (response) => {
      if (response && response.duration && response.currentTime) {
        if (progress) {
          const percentage = (response.currentTime / response.duration) * 100;
          progress.style.width = `${percentage}%`;
        }
        
        // Update the timestamps
        if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(response.currentTime);
        if (durationTimeDisplay) durationTimeDisplay.textContent = formatTime(response.duration);
      }
    });
  }
}

function togglePlayPause() {
  if (location.host.includes("youtube")) {
    const playPauseBtn = document.querySelector('.ytmusic-player-bar .play-pause-button');
    if (playPauseBtn) {
      playPauseBtn.click();
    }
  } else if (location.host.includes("spotify")) {
    const playPauseBtn = document.querySelector('[data-testid="control-button-playpause"]');
    if (playPauseBtn) {
      playPauseBtn.click();
    }
  } else {
    // ✅ Send to background to control on music tab
    chrome.runtime.sendMessage({ type: "control", command: "play" });
  }
}

function playNext() {
  if (location.host.includes("youtube")) {
    const nextBtn = document.querySelector('.ytmusic-player-bar .next-button');
    if (nextBtn) nextBtn.click();
  } else if (location.host.includes("spotify")) {
    const nextBtn = document.querySelector('[data-testid="control-button-skip-forward"]');
    if (nextBtn) nextBtn.click();
  } else {
    chrome.runtime.sendMessage({ type: "control", command: "next" });
  }
}

function playPrevious() {
  if (location.host.includes("youtube")) {
    const prevBtn = document.querySelector('.ytmusic-player-bar .previous-button');
    if (prevBtn) prevBtn.click();
  } else if (location.host.includes("spotify")) {
    const prevBtn = document.querySelector('[data-testid="control-button-skip-back"]');
    if (prevBtn) prevBtn.click();
  } else {
    chrome.runtime.sendMessage({ type: "control", command: "prev" });
  }
}

function enableDrag(element) {
  let offsetX, offsetY, isDragging = false;

  element.addEventListener("mousedown", (e) => {
    if (
      e.target.tagName.toLowerCase() === "button" || 
      e.target.closest("#controls") || 
      getComputedStyle(element).resize !== "none" && (
        e.offsetX > element.clientWidth - 16 && 
        e.offsetY > element.clientHeight - 16
      )
    ) {
      return; // Don't drag if user clicked on controls or resize area
    }
    isDragging = true;
    offsetX = e.clientX - element.offsetLeft;
    offsetY = e.clientY - element.offsetTop;
    element.classList.add("dragging");
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const left = e.clientX - offsetX;
    const top = e.clientY - offsetY;

    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";

    // Save position
    localStorage.setItem("floating-player-position", JSON.stringify({ left, top }));
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    element.classList.remove("dragging");
  });
}

// Function to remove the floating player when no music is playing
function removeFloatingPlayer() {
  const player = document.getElementById("floating-player");
  if (player) {
    player.remove();
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "songInfo") {
    const { title, artist, currentTime, duration } = message.data || {};
  
    // Remove player if no song is playing
    if (!title && !artist) {
      removeFloatingPlayer();
      return;
    }
  
    // If player doesn't exist, create it
    if (!document.getElementById("floating-player")) createFloatingPlayer();
  
    // Update the text
    const songInfo = document.getElementById("song-info");
    if (songInfo) {
      songInfo.textContent = `${title} - ${artist}`;
    }
      
    // Update progress bar if data is available
    const progress = document.getElementById("progress-fill");
    if (progress && duration && currentTime) {
      const percent = (currentTime / duration) * 100;
      progress.style.width = `${percent}%`;
      
      // Update the timestamps
      const currentTimeDisplay = document.getElementById("current-time");
      const durationTimeDisplay = document.getElementById("duration-time");
      if (currentTimeDisplay) currentTimeDisplay.textContent = formatTime(currentTime);
      if (durationTimeDisplay) durationTimeDisplay.textContent = formatTime(duration);
    }
  }
});

// Initialize player if there's already song info available
chrome.runtime.sendMessage({ type: "getSongInfo" }, (songInfo) => {
  const { title, artist } = songInfo || {};
  
  // If no valid song info, don't show player
  if (!title && !artist) return;

  // Create player if it's not already there
  if (!document.getElementById("floating-player")) createFloatingPlayer();

  // Update the song info text
  const info = document.getElementById("song-info");
  if (info) {
    info.textContent = `${title} - ${artist}`;
  }
});

// Check song info periodically
function checkSongInfoStatus() {
  chrome.runtime.sendMessage({ type: "getSongInfo" }, (songInfo) => {
    const { title, artist } = songInfo || {};
    
    // If no song info, remove the player
    if (!title && !artist) {
      removeFloatingPlayer();
    }
  });
}

// Only create player if we're on a music site
if (isMusicSite()) {
  createFloatingPlayer();
  setInterval(updateProgressBar, 1000);
  setInterval(updateSongInfo, 1000);
} else {
  // Not a music site, initialize based on background state
  chrome.runtime.sendMessage({ type: "getSongInfo" }, (response) => {
    if (response && response.title) {
      createFloatingPlayer();
      setInterval(updateSongInfo, 1000);
      setInterval(updateProgressBar, 1000);
    }
  });
  
  // Periodically check if we should still show the player
  setInterval(checkSongInfoStatus, 2000);
}