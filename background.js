"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// add contextMenu entry to action button
function createContextMenu() {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      id: "PIPElement_onPIPPageContextMenu",
      title: "View Current Page Picture-In-Picture...",
      contexts: ["action"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// enable picker when clicking the browser action
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[PIPElement:BG] enablePicker");
  chrome.tabs.sendMessage(
    tab.id,
    {
      event: "enablePicker",
      data: null,
    }
  );
});

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log("[PIPElement:BG]", msg);
  const { event, data } = msg;

});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log("[PIPElement:BG] onContextMenuClicked:", [info, tab]);

  if (info.menuItemId === "PIPElement_onPIPPageContextMenu") {
    console.log("[PIPElement:BG] opening page Picture-In-Picture...");
    chrome.tabs.sendMessage(
      tab.id,
      {
        event: "PIPPage",
        data: { enable: false },
      }
    );
    let url = "";
    let focusNewTab = true;
    let [activeTab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    // chrome.tabs.create({url: dataURL, index: activeTab.index + 1, active: focusNewTab});
  }
});
