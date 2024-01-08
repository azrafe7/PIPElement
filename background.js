"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// add contextMenu entry to action button
const contexts = ["page", "frame", "selection", "link", "editable", "image", "video", "audio"]; // all but "action" context
const PIPPageContextId = "PIPElement_onPIPPageContextMenu";
function createContextMenu() {
  chrome.contextMenus.removeAll(function() {
    chrome.contextMenus.create({
      id: PIPPageContextId,
      title: "View current page Picture-In-Picture...",
      contexts: contexts,
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// enable picker when clicking the browser action
chrome.action.onClicked.addListener(async (tab) => {
  console.log("[PIPElement:BG] onClicked");
  chrome.tabs.sendMessage(
    tab.id,
    {
      event: "togglePicker",
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

  if (info.menuItemId === PIPPageContextId) {
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


async function checkState(tabId=null) {
  if (tabId == null) {
    const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
    tabId = activeTab.id;
  }
  console.log('checkState for', 'tabId', tabId);
  
  chrome.tabs.sendMessage(
    tabId,
    {
      event: "checkState",
      data: null
    },
    (msg) => {
      if (chrome.runtime.lastError) {
        console.warn('Whoops...', chrome.runtime.lastError.message);
      } else {
        const { event, data } = msg;
        setState(data.allowed, tabId);
      }
    }
  );
}

async function setState(allowed, tabId=null) {
  if (tabId == null) {
    const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
    tabId = activeTab?.id;
    if (!tabId) return;
  }
  console.log('setState', allowed, 'tabId', tabId);
  
  // tabId = null;
  
  let actionTitle = `${manifest.action.default_title}`;
  chrome.action.setTitle({tabId: tabId, title: actionTitle});
  
  if (!allowed) {
    actionTitle = `${manifest.action.default_title} (DISABLED for this site)`;
    chrome.action.setTitle({tabId: tabId, title: actionTitle});
    chrome.action.disable(tabId);
    chrome.contextMenus.update(PIPPageContextId, { enabled:allowed }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Whoops...', chrome.runtime.lastError.message);
      }
      console.log("contextMenu disabled")
    });
  } else {
    chrome.action.setTitle({tabId: tabId, title: actionTitle});
    chrome.action.enable(tabId);
    chrome.contextMenus.update(PIPPageContextId, { enabled:allowed }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Whoops...', chrome.runtime.lastError.message);
      }
      console.log("contextMenu enabled")
    });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log("onUpdated tab", tab);

  setState(false);
  checkState(tabId);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  let [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
  console.log("onActivated activeInfo", activeInfo);

  setState(false);
  checkState(activeTab.id);
});

setState(false);
checkState();
