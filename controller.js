//controller.js
setInterval(() => {
  let title = "", artist = "";
  let currentTime = 0, duration = 0;

  if (location.host.includes("youtube")) {
    const titleEl = document.querySelector(".title.ytmusic-player-bar");
    const artistEl = document.querySelector(".byline.ytmusic-player-bar");
    const video = document.querySelector("video");
    if (titleEl && artistEl) {
      title = titleEl.textContent;
      artist = artistEl.textContent;
    }
    if (video) {
      currentTime = video.currentTime;
      duration = video.duration;
    }
  } else if (location.host.includes("spotify")) {
    const titleEl = document.querySelector('[data-testid="nowplaying-track-link"]');
    const artistEl = document.querySelector('[data-testid="nowplaying-artist"]');
    const audio = document.querySelector("audio");
    if (titleEl && artistEl) {
      title = titleEl.textContent;
      artist = artistEl.textContent;
    }
    if (audio) {
      currentTime = audio.currentTime;
      duration = audio.duration;
    }
  }

  chrome.runtime.sendMessage({
    type: "songInfo",
    data: { title, artist, currentTime, duration} 
  });
}, 1000);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "control") {
    const command = message.command;
    if (location.host.includes("youtube")) {
      const buttons = {
        play: ".play-pause-button",
        next: ".next-button",
        prev: ".previous-button"
      };
      const btn = document.querySelector(`.ytmusic-player-bar ${buttons[command]}`);
      if (btn) btn.click();
    } else if (location.host.includes("spotify")) {
      const buttons = {
        play: '[data-testid="control-button-playpause"]',
        next: '[data-testid="control-button-skip-forward"]',
        prev: '[data-testid="control-button-skip-back"]'
      };
      const btn = document.querySelector(buttons[command]);
      if (btn) btn.click();
    }
  }
});