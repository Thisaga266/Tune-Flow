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
    
    // Track this tab as a music tab
    if (sender.tab) {
      musicTabs.add(sender.tab.id);
    }
    
    // Broadcast to all tabs
    broadcastSongInfo(currentSongInfo);
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
    
    // If the active music tab was closed, clear song info
    if (tabId === activeMusicTabId) {
      activeMusicTabId = null;
      currentSongInfo = { title: "", artist: "", currentTime: 0, duration: 0 };
      
      // Make sure to broadcast empty song info to all tabs
      broadcastSongInfo(currentSongInfo);
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If tab navigates away from music site
  if (changeInfo.status === "complete") {
    // Check if this is a music tab navigating away
    if (musicTabs.has(tabId)) {
      const isMusicSite = musicHosts.some(host => tab.url?.includes(host));
      
      // If not a music site anymore, remove from tracking
      if (!isMusicSite) {
        musicTabs.delete(tabId);
        
        // If this was the active music tab, clear song info
        if (tabId === activeMusicTabId) {
          activeMusicTabId = null;
          currentSongInfo = { title: "", artist: "", currentTime: 0, duration: 0 };
          
          // Make sure to broadcast empty song info to all tabs
          broadcastSongInfo(currentSongInfo);
        }
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