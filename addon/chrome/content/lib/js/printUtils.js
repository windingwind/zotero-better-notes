/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

 var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
 var { XPCOMUtils } = ChromeUtils.import(
   "resource://gre/modules/XPCOMUtils.jsm"
 );
 
 XPCOMUtils.defineLazyModuleGetters(this, {
   SubDialogManager: "resource://gre/modules/SubDialog.jsm",
 });
 
 // Load PrintUtils lazily and modify it to suit.
 XPCOMUtils.defineLazyGetter(this, "PrintUtils", () => {
   let scope = {};
   Services.scriptloader.loadSubScript(
     "chrome://global/content/printUtils.js",
     scope
   );
   scope.PrintUtils.getTabDialogBox = function(browser) {
     if (!browser.tabDialogBox) {
       browser.tabDialogBox = new TabDialogBox(browser);
     }
     return browser.tabDialogBox;
   };
   scope.PrintUtils.createBrowser = function({
     remoteType,
     initialBrowsingContextGroupId,
     userContextId,
     skipLoad,
     initiallyActive,
   } = {}) {
     let b = document.createXULElement("browser");
     // Use the JSM global to create the permanentKey, so that if the
     // permanentKey is held by something after this window closes, it
     // doesn't keep the window alive.
     b.permanentKey = new (Cu.getGlobalForObject(Services).Object)();
 
     const defaultBrowserAttributes = {
       maychangeremoteness: "true",
       messagemanagergroup: "browsers",
       type: "content",
     };
     for (let attribute in defaultBrowserAttributes) {
       b.setAttribute(attribute, defaultBrowserAttributes[attribute]);
     }
 
     if (userContextId) {
       b.setAttribute("usercontextid", userContextId);
     }
 
     if (remoteType) {
       b.setAttribute("remoteType", remoteType);
       b.setAttribute("remote", "true");
     }
 
     // Ensure that the browser will be created in a specific initial
     // BrowsingContextGroup. This may change the process selection behaviour
     // of the newly created browser, and is often used in combination with
     // "remoteType" to ensure that the initial about:blank load occurs
     // within the same process as another window.
     if (initialBrowsingContextGroupId) {
       b.setAttribute(
         "initialBrowsingContextGroupId",
         initialBrowsingContextGroupId
       );
     }
 
     // We set large flex on both containers to allow the devtools toolbox to
     // set a flex attribute. We don't want the toolbox to actually take up free
     // space, but we do want it to collapse when the window shrinks, and with
     // flex=0 it can't. When the toolbox is on the bottom it's a sibling of
     // browserStack, and when it's on the side it's a sibling of
     // browserContainer.
     let stack = document.createXULElement("stack");
     stack.className = "browserStack";
     stack.appendChild(b);
     stack.setAttribute("flex", "10000");
 
     let browserContainer = document.createXULElement("vbox");
     browserContainer.className = "browserContainer";
     browserContainer.appendChild(stack);
     browserContainer.setAttribute("flex", "10000");
 
     let browserSidebarContainer = document.createXULElement("hbox");
     browserSidebarContainer.className = "browserSidebarContainer";
     browserSidebarContainer.appendChild(browserContainer);
 
     // Prevent the superfluous initial load of a blank document
     // if we're going to load something other than about:blank.
     if (skipLoad) {
       b.setAttribute("nodefaultsrc", "true");
     }
 
     return b;
   };
   return scope.PrintUtils;
 });
 
 /**
  * The TabDialogBox supports opening window dialogs as SubDialogs on the tab and content
  * level. Both tab and content dialogs have their own separate managers.
  * Dialogs will be queued FIFO and cover the web content.
  * Dialogs are closed when the user reloads or leaves the page.
  * While a dialog is open PopupNotifications, such as permission prompts, are
  * suppressed.
  */
 class TabDialogBox {
   constructor(browser) {
     this._weakBrowserRef = Cu.getWeakReference(browser);
 
     // Create parent element for tab dialogs
     let template = document.getElementById("dialogStackTemplate");
     this.dialogStack = template.content.cloneNode(true).firstElementChild;
     this.dialogStack.classList.add("tab-prompt-dialog");
 
     // This differs from Firefox by using a specific ancestor <stack> rather
     // than the parent of the <browser>, so that a larger area of the screen
     // is used for the preview.
     this.printPreviewStack = document.querySelector(".printPreviewStack");
     if (this.printPreviewStack && this.printPreviewStack.contains(browser)) {
       this.printPreviewStack.appendChild(this.dialogStack);
     } else {
       this.printPreviewStack = this.browser.parentNode;
       this.browser.parentNode.insertBefore(
         this.dialogStack,
         this.browser.nextElementSibling
       );
     }
 
     // Initially the stack only contains the template
     let dialogTemplate = this.dialogStack.firstElementChild;
 
     // Create dialog manager for prompts at the tab level.
     this._tabDialogManager = new SubDialogManager({
       dialogStack: this.dialogStack,
       dialogTemplate,
       orderType: SubDialogManager.ORDER_QUEUE,
       allowDuplicateDialogs: true,
       dialogOptions: {
         consumeOutsideClicks: false,
       },
     });
   }
 
   /**
    * Open a dialog on tab or content level.
    * @param {String} aURL - URL of the dialog to load in the tab box.
    * @param {Object} [aOptions]
    * @param {String} [aOptions.features] - Comma separated list of window
    *   features.
    * @param {Boolean} [aOptions.allowDuplicateDialogs] - Whether to allow
    *   showing multiple dialogs with aURL at the same time. If false calls for
    *   duplicate dialogs will be dropped.
    * @param {String} [aOptions.sizeTo] - Pass "available" to stretch dialog to
    *   roughly content size.
    * @param {Boolean} [aOptions.keepOpenSameOriginNav] - By default dialogs are
    *   aborted on any navigation.
    *   Set to true to keep the dialog open for same origin navigation.
    * @param {Number} [aOptions.modalType] - The modal type to create the dialog for.
    *   By default, we show the dialog for tab prompts.
    * @returns {Promise} - Resolves once the dialog has been closed.
    */
   open(
     aURL,
     {
       features = null,
       allowDuplicateDialogs = true,
       sizeTo,
       keepOpenSameOriginNav,
       modalType = null,
       allowFocusCheckbox = false,
     } = {},
     ...aParams
   ) {
     return new Promise(resolve => {
       // Get the dialog manager to open the prompt with.
       let dialogManager =
         modalType === Ci.nsIPrompt.MODAL_TYPE_CONTENT
           ? this.getContentDialogManager()
           : this._tabDialogManager;
       let hasDialogs =
         this._tabDialogManager.hasDialogs ||
         this._contentDialogManager?.hasDialogs;
 
       if (!hasDialogs) {
         this._onFirstDialogOpen();
       }
 
       let closingCallback = event => {
         if (!hasDialogs) {
           this._onLastDialogClose();
         }
 
         if (allowFocusCheckbox && !event.detail?.abort) {
           this.maybeSetAllowTabSwitchPermission(event.target);
         }
       };
 
       if (modalType == Ci.nsIPrompt.MODAL_TYPE_CONTENT) {
         sizeTo = "limitheight";
       }
 
       // Open dialog and resolve once it has been closed
       let dialog = dialogManager.open(
         aURL,
         {
           features,
           allowDuplicateDialogs,
           sizeTo,
           closingCallback,
           closedCallback: resolve,
         },
         ...aParams
       );
 
       // Marking the dialog externally, instead of passing it as an option.
       // The SubDialog(Manager) does not care about navigation.
       // dialog can be null here if allowDuplicateDialogs = false.
       if (dialog) {
         dialog._keepOpenSameOriginNav = keepOpenSameOriginNav;
       }
     });
   }
 
   _onFirstDialogOpen() {
     for (let element of this.printPreviewStack.children) {
       if (element != this.dialogStack) {
         element.setAttribute("tabDialogShowing", true);
       }
     }
 
     // Register listeners
     this._lastPrincipal = this.browser.contentPrincipal;
     this.browser.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_LOCATION);
   }
 
   _onLastDialogClose() {
     for (let element of this.printPreviewStack.children) {
       if (element != this.dialogStack) {
         element.removeAttribute("tabDialogShowing");
       }
     }
 
     // Clean up listeners
     this.browser.removeProgressListener(this);
     this._lastPrincipal = null;
   }
 
   _buildContentPromptDialog() {
     let template = document.getElementById("dialogStackTemplate");
     let contentDialogStack = template.content.cloneNode(true).firstElementChild;
     contentDialogStack.classList.add("content-prompt-dialog");
 
     // Create a dialog manager for content prompts.
     let tabPromptDialog = this.browser.parentNode.querySelector(
       ".tab-prompt-dialog"
     );
     this.browser.parentNode.insertBefore(contentDialogStack, tabPromptDialog);
 
     let contentDialogTemplate = contentDialogStack.firstElementChild;
     this._contentDialogManager = new SubDialogManager({
       dialogStack: contentDialogStack,
       dialogTemplate: contentDialogTemplate,
       orderType: SubDialogManager.ORDER_QUEUE,
       allowDuplicateDialogs: true,
       dialogOptions: {
         consumeOutsideClicks: false,
       },
     });
   }
 
   handleEvent(event) {
     if (event.type !== "TabClose") {
       return;
     }
     this.abortAllDialogs();
   }
 
   abortAllDialogs() {
     this._tabDialogManager.abortDialogs();
     this._contentDialogManager?.abortDialogs();
   }
 
   focus() {
     // Prioritize focusing the dialog manager for tab prompts
     if (this._tabDialogManager._dialogs.length) {
       this._tabDialogManager.focusTopDialog();
       return;
     }
     this._contentDialogManager?.focusTopDialog();
   }
 
   /**
    * If the user navigates away or refreshes the page, close all dialogs for
    * the current browser.
    */
   onLocationChange(aWebProgress, aRequest, aLocation, aFlags) {
     if (
       !aWebProgress.isTopLevel ||
       aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT
     ) {
       return;
     }
 
     // Dialogs can be exempt from closing on same origin location change.
     let filterFn;
 
     // Test for same origin location change
     if (
       this._lastPrincipal?.isSameOrigin(
         aLocation,
         this.browser.browsingContext.usePrivateBrowsing
       )
     ) {
       filterFn = dialog => !dialog._keepOpenSameOriginNav;
     }
 
     this._lastPrincipal = this.browser.contentPrincipal;
 
     this._tabDialogManager.abortDialogs(filterFn);
     this._contentDialogManager?.abortDialogs(filterFn);
   }
 
   get tab() {
     return document.getElementById("tabmail").getTabForBrowser(this.browser);
   }
 
   get browser() {
     let browser = this._weakBrowserRef.get();
     if (!browser) {
       throw new Error("Stale dialog box! The associated browser is gone.");
     }
     return browser;
   }
 
   getTabDialogManager() {
     return this._tabDialogManager;
   }
 
   getContentDialogManager() {
     if (!this._contentDialogManager) {
       this._buildContentPromptDialog();
     }
     return this._contentDialogManager;
   }
 
   onNextPromptShowAllowFocusCheckboxFor(principal) {
     this._allowTabFocusByPromptPrincipal = principal;
   }
 
   /**
    * Sets the "focus-tab-by-prompt" permission for the dialog.
    */
   maybeSetAllowTabSwitchPermission(dialog) {
     let checkbox = dialog.querySelector("checkbox");
 
     if (checkbox.checked) {
       Services.perms.addFromPrincipal(
         this._allowTabFocusByPromptPrincipal,
         "focus-tab-by-prompt",
         Services.perms.ALLOW_ACTION
       );
     }
 
     // Don't show the "allow tab switch checkbox" for subsequent prompts.
     this._allowTabFocusByPromptPrincipal = null;
   }
 }
 
 TabDialogBox.prototype.QueryInterface = ChromeUtils.generateQI([
   "nsIWebProgressListener",
   "nsISupportsWeakReference",
 ]);