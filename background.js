//background.js
let controllerTabId = null;
let activeMusicTabId = null;
let currentSongInfo = { 
  title: "", 
  artist: "",
  currentTime: 0,
  duration: 0
};
const musicHosts = ["music.youtube.com", "open.spotify.com"];
const musicTabs = new Set();

// Handle song info and progress updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "songInfo") {
    // Only accept song info from a known music tab
    currentSongInfo = message.data;
    activeMusicTabId = sender.tab ? sender.tab.id : activeMusicTabId;
  }

  if (message.type === "getSongInfo") {
    sendResponse(currentSongInfo);
  }

  if (message.type === "getProgress") {
    sendResponse({
      currentTime: currentSongInfo.currentTime,
      duration: currentSongInfo.duration
    });
  }

  if (message.type === "control") {
    if (activeMusicTabId !== null) {
      chrome.tabs.sendMessage(activeMusicTabId, {
        type: "control",
        command: message.command
      });
    }
  }

  return true;
});

// Handle tab updates
// Clear song info when tab is closed or navigates away
chrome.tabs.onRemoved.addListener((tabId) => {
  if (musicTabs.has(tabId)) {
    musicTabs.delete(tabId);
    if (tabId === controllerTabId) {
      controllerTabId = null;
      currentSongInfo = { title: "", artist: "", currentTime: 0, duration: 0 };
      broadcastSongInfo(currentSongInfo); // send empty to all tabs
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && !musicHosts.some(h => tab.url?.includes(h))) {
    if (musicTabs.has(tabId)) {
      musicTabs.delete(tabId);
      if (tabId === controllerTabId) {
        controllerTabId = null;
        currentSongInfo = { title: "", artist: "", currentTime: 0, duration: 0 };
        broadcastSongInfo(currentSongInfo); // send empty to all tabs
      }
    }
  }
});

function broadcastSongInfo(songInfo) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(tab.id, { 
          type: "songInfo", 
          data: songInfo 
        });
      } catch(err) {
        // Tab might not be ready to receive messages, ignore errors
      }
    }
  });
}