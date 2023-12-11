"use strict";

(async () => {
  
  const DEBUG = true;
  let debug = {
    log: DEBUG ? console.log.bind(console) : () => {} // log or NO_OP
  }

  let manifest = chrome.runtime.getManifest();
  console.log(manifest.name + " v" + manifest.version);

  const HIGHLIGHT_RED = "rgba(250, 70, 60, 0.5)";
  const HIGHLIGHT_GREEN = "rgba(17, 193, 12, 0.5)";
  const HIGHLIGHT_ORANGE = "rgba(255, 175, 12, 0.5)";
  const HIGHLIGHT_BLUE = "rgba(20, 80, 250, 0.5)";
  const HIGHLIGHT_BG_COLOR = HIGHLIGHT_BLUE;

  const OUTLINE_RED = "rgba(250, 70, 60, 0.75)";
  const OUTLINE_GREEN = "rgba(17, 193, 12, 0.90)";
  const OUTLINE_ORANGE = "rgba(255, 175, 0, 0.9)";
  const OUTLINE_BLUE = "rgba(20, 140, 200, 0.9)";
  const OUTLINE_COLOR = OUTLINE_BLUE;

  const CURSORS = ["crosshair", "copy"];

  let lastTriggeredElement = null;

  let pipWindow = null;

  /* if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // dark mode
    HIGHLIGHT_BG_COLOR = HIGHLIGHT_DARK;
    OUTLINE_COLOR = OUTLINE_DARK;
  } */

  let options = {
    container: null,
    iFrameId: 'PIP Element Picker Frame',
    enabled: false,
    selectors: "*",
    background: HIGHLIGHT_BG_COLOR,
    borderWidth: 0,
    outlineWidth: 1,
    outlineColor: OUTLINE_COLOR,
    transition: "",
    ignoreElements: [],
    action: {},
    hoverBoxInfoId: 'pip_picker_info',
  }

  function copyStyleSheetsToPipWindow(win) {
    if (!win) return;
    
    // copy style sheets over from the initial document
    // so that the elements look the same
    [...document.styleSheets].forEach((styleSheet) => {
      try {
        const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
        const style = document.createElement('style');

        style.textContent = cssRules;
        win.document.head.appendChild(style);
      } catch (e) {
        const link = document.createElement('link');

        link.rel = 'stylesheet';
        link.type = styleSheet.type;
        link.media = styleSheet.media;
        link.href = styleSheet.href;
        win.document.head.appendChild(link);
      }
    });
  }

  // create "disabled" elementPicker on page load
  let elementPicker = new ElementPicker(options);

  // elementPicker.hoverBox.style.cursor = CURSORS[0];
  elementPicker.action = {
    trigger: "mouseup",
    
    callback: ((event, target) => {
      debug.log("[PIPElement:CTX] event:", event);
      let continuePicking = event.shiftKey;
      event.triggered = event.triggered ?? event.button == 0; // only proceed if left mouse button was pressed or "event.triggered" was set
      if (event.triggered) {
        debug.log("[PIPElement:CTX] target:", target);
        debug.log("[PIPElement:CTX] info:", elementPicker.hoverInfo);
        lastTriggeredElement = elementPicker.hoverInfo.element;
        
        const newPipElement = {element: lastTriggeredElement, container: lastTriggeredElement.parentElement, nextSibling: lastTriggeredElement.nextSibling};
        
        // add element to pip window, restore element on "pagehide" event
        function addToPipWindow(win, newPipElement) {
          win.document.body.append(newPipElement.element);
          copyStyleSheetsToPipWindow(win);
          
          // move the pip-ed element back when the Picture-in-Picture window closes
          win.addEventListener("pagehide", (event) => {
            const {element, container, nextSibling} = newPipElement;
            debug.log("[PIPElement:CTX] pagehide event:", event, "pipElement:", newPipElement);
            (container || document).insertBefore(element, nextSibling);
            
            pipWindow = null;
          });
        }
        
        // request pip window        
        if (pipWindow && continuePicking) {
          debug.log("[PIPElement:CTX] ADD to existing pipWindow");
          addToPipWindow(pipWindow, newPipElement);
        } else {
          const width = 0; // elementPicker.hoverInfo.width + 22;
          const height = 0; // elementPicker.hoverInfo.height + 22;
          documentPictureInPicture.requestWindow({width: width, height: height}).then((win) => {
            // close old pipWindow if exists
            if (pipWindow) {
              debug.log("[PIPElement:CTX] CLOSE existing pipWindow");
              pipWindow.close();
            }

            pipWindow = win;
            debug.log(`[PIPElement:CTX] ADD to NEW pipWindow (w:${width}, h:${height})`);

            addToPipWindow(pipWindow, newPipElement);
          });
        }
      }
      
      elementPicker.enabled = continuePicking;
    })
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    debug.log("[PIPElement:CTX]", msg);
    const { event, data } = msg;

    if (event === "enablePicker") {
      elementPicker.enabled = data?.enable ?? true;
      elementPicker.hoverBox.style.cursor = CURSORS[0];
    } else if (event === "takenScreenshot") {
      let dataURL = data.dataURL;
      let hoverInfo = data.hoverInfo;
      let continuePicking = data?.continuePicking;
      
      if (continuePicking) {
        elementPicker.enabled = true;
        elementPicker.highlight(lastTriggeredElement);
      }
    }
  });

  const keyEventContainer = window; // elementPicker.iframe ? elementPicker.iframe : window;

  // close picker when pressing ESC
  keyEventContainer.addEventListener('keyup', function(e) {
    if (e.code === 'Escape' && elementPicker.enabled) {
      elementPicker.enabled = false;
      debug.log("[PIPElement:CTX] user aborted");
    }
  }, true);

  keyEventContainer.addEventListener('keydown', function(e) {
    let target = null;
    let newTarget = null;
    if (e.code === 'Space' && elementPicker.enabled) {
      target = elementPicker.hoverInfo.element;
      debug.log("[PIPElement:CTX] space-clicked target:", target);
      e.preventDefault();
      e.triggered = true; // checked inside action callback
      elementPicker.trigger(e);
    } else if (elementPicker.enabled && (e.code === 'KeyQ' || e.code === 'KeyA')) {
      target = elementPicker.hoverInfo.element;

      let innermostTargetAtPoint = null; // first non-picker-iframe element
      for (let el of document.elementsFromPoint(elementPicker._lastClientX, elementPicker._lastClientY)) {
        if (el != elementPicker.iframe) {
          innermostTargetAtPoint = el;
          break;
        }
      }
      // build ancestors array
      let ancestorsAndSelf = [];
      for (let el=innermostTargetAtPoint; el != null; el = el.parentElement) {
        ancestorsAndSelf.push(el);
      }
      
      const ancestorsAndSelfLength = ancestorsAndSelf.length;
      const targetIdx = ancestorsAndSelf.indexOf(target);
      const targetHasNext = targetIdx <= (ancestorsAndSelfLength - 2);
      const targetHasPrev = targetIdx > 0;
      if (e.code === 'KeyQ' && targetHasNext) { // drill up
        newTarget = ancestorsAndSelf[targetIdx + 1];
        if (newTarget.contains(elementPicker.iframe)) {
          newTarget = target;
        }
        debug.log("[PIPElement:CTX] Q-pressed new ↑ target:", newTarget);
      } else if (e.code === 'KeyA' && targetHasPrev) { // drill down
        newTarget = ancestorsAndSelf[targetIdx - 1];
        if (newTarget.contains(elementPicker.iframe)) {
          newTarget = target;
        }
        debug.log("[PIPElement:CTX] A-pressed new ↓ target:", newTarget);
      }
      debug.log(`${targetIdx}/${ancestorsAndSelfLength}`, 'newTarget', targetHasPrev, targetHasNext, newTarget);
      if (newTarget && newTarget != target) {
        elementPicker.highlight(newTarget);
      }
      e.preventDefault();
    }
  }, true);

  // change picker cursor when holding SHIFT
  function updateCursor(eventInfo) {
    let {keyUp, event} = eventInfo;
    if (elementPicker.enabled) {
      let cursorIdx = +event.shiftKey;
      if (elementPicker.hoverBox.style.cursor != CURSORS[cursorIdx]) {
        debug.log('[PIPElement:CTX] change cursor to ' + CURSORS[cursorIdx]);
        elementPicker.hoverBox.style.cursor = CURSORS[cursorIdx];
      }
    }
  }
  
  keyEventContainer.addEventListener('keyup', (e) => updateCursor({keyUp: true, event: e}), true);
  keyEventContainer.addEventListener('keydown', (e) => updateCursor({keyUp: false, event: e}), true);

})();
