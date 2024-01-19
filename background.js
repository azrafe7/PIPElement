"use strict";

let manifest = chrome.runtime.getManifest();
console.log(manifest.name + " v" + manifest.version);

// add/remove contextMenu entry
const contexts = ["page", "frame", "selection", "link", "editable", "image", "video", "audio"]; // all but "action" context
// const contexts = ["action"]; // only "action" context
const PIPPageContextId = "PIPElement_onPIPPageContextMenu";
function createContextMenu(options={}) {
  const defaults = { enable:true };
  options = { ...defaults, ...options };
  chrome.contextMenus.removeAll(function() {
    // console.log("remove");
    if (chrome.runtime.lastError) {
      console.warn('Whoops...', chrome.runtime.lastError.message);
    } else if (options.enable) {
      chrome.contextMenus.create({
        id: PIPPageContextId,
        title: "View current page Picture-In-Picture...",
        contexts: contexts,
      }, () => {
        // console.log("create");
        if (chrome.runtime.lastError) {
          console.warn('Whoops...', chrome.runtime.lastError.message);
        }      
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  // createContextMenu({enable:true});
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
    const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
    console.log("[PIPElement:BG] opening page Picture-In-Picture...");
    if (tab.id <= 0) {
      console.log("[PIPElement:BG] tabId <= 0:", tab.id, activeTab);
      tab.id = activeTab?.id;
    }
    if (tab.id >= 0) {
      chrome.tabs.sendMessage(
        tab.id,
        {
          event: "PIPPage",
          data: { enable: false },
        }
      );
    } else {
      console.warn(`[PIPElement:BG] Whoops... No valid tab.id found.`);
    }
  }
});


async function checkState(tabId=null) {
  if (tabId == null) {
    const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
    tabId = activeTab?.id;
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
  
  let actionTitle = `${manifest.action.default_title} v${manifest.version}`;
  chrome.action.setTitle({tabId: tabId, title: actionTitle});
  
  if (!allowed) {
    actionTitle = actionTitle + ' (DISABLED for this site)';
    chrome.action.setTitle({tabId: tabId, title: actionTitle});
    chrome.action.disable(tabId);
    /*chrome.contextMenus.update(PIPPageContextId, { enabled:allowed }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Whoops...', chrome.runtime.lastError.message);
      }
      console.log("contextMenu disabled")
    });*/
    createContextMenu({enable:allowed});
  } else {
    chrome.action.setTitle({tabId: tabId, title: actionTitle});
    chrome.action.enable(tabId);
    /* chrome.contextMenus.update(PIPPageContextId, { enabled:allowed }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Whoops...', chrome.runtime.lastError.message);
      }
      console.log("contextMenu enabled")
    }); */
    createContextMenu({enable:allowed});
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
  checkState(activeInfo.tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  let [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
  console.log("onFocusChanged", windowId, activeTab);
});

setState(false);
checkState();
