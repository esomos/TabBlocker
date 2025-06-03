// Load the blocklist
let blocklist = {};
let silentAll = false;

function loadSettings() {
    chrome.storage.local.get(["blocklist", "silentAll"], (result) => {
        blocklist = result.blocklist;
        silentAll = result.silentAll;
    });
}

loadSettings();


// Store the current active website
let currentUrl = "";

// Function to extract hostname from a URL
const getHostname = (url) => {
    try { return new URL(url).hostname; }
    catch { return null; }
};

// Listen for active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        currentUrl = tab.url;

    } catch (error) {
        console.error("Failed to get active tab:", error);
    }
});

// Listen for tab updates to track the current website
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!(tab.active && changeInfo.url)) return;
    const changeHostname = getHostname(changeInfo.url);
    const currentHostname = getHostname(currentUrl);
    if (changeHostname !== currentHostname) {
        if (blockUpdate(tabId, changeInfo.url, currentHostname, currentUrl)) return;
        currentUrl = changeInfo.url;
    }
});

// Listen for new tab creation
chrome.tabs.onCreated.addListener((tab) => {
    if (!tab.id || !currentUrl) return;
    const currentHostname = getHostname(currentUrl);
    if (getHostname(tab.pendingUrl) === currentHostname) return;
    blockTab(tab, currentHostname);
});

function blockUpdate(tabId, changeUrl, currentHostname, prevUrl) {
    if (!blocklist[currentHostname]) return;
    if (blocklist[currentHostname].blockUrl) {
        chrome.tabs.update(tabId, { url: prevUrl });
        if (!(blocklist[currentHostname]?.silent || silentAll)) {
            showNotification("stopped a url change!", changeUrl, currentHostname);
        }
        return true;
    }
    return false;
}

function blockTab(tab, currentHostname) {
    const blockedHostname = blocklist[currentHostname];
    if (!blockedHostname) return;
    if (blockedHostname.blockTabs) {
        // Immediately close the new tab
        chrome.tabs.remove(tab.id);
        if (!(blockedHostname?.silent || silentAll)) {
            showNotification("tab blocked!", tab.pendingUrl, currentHostname);
        }
    }
}

// Store details of recently removed tabs
const notificationMetadata = {
    // Empty
}

// Function to show a polite notification
function showNotification(message, redoUrl, hostname) {
    const notificationId = `${Date.now()}`;

    // Save the removed tab details
    notificationMetadata[notificationId] = { hostname, redoUrl };

    // Create a notification with a polite message
    chrome.notifications.create(notificationId, {
        type: "basic",
        iconUrl: "icons/icon48.png", // Replace with your icon path
        title: "Tab blocker",
        message,
        buttons: [{ title: "alow"}, {title: "silent"}], // Adds a Reopen Tab button
        priority: 1
    });
}

// Handle button click on the notification
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    const info = notificationMetadata[notificationId];
    if (buttonIndex === 0) { // "Reopen Tab" button clicked
        if (!info) return;
        blocklist[info.hostname].blockTabs = false;
        blocklist[info.hostname].blockUrl = false;
        
    }
    if (buttonIndex === 1) {
        blocklist[info.hostname].silent = true;
    }
});

// Handle notification close (cleanup)
chrome.notifications.onClosed.addListener((notificationId, _byUser) => {
    delete notificationMetadata[notificationId]; // Remove stored tab info
});

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.data === "blocklistSaved") {
        loadSettings();
    }
    return true; // Required if sendResponse is used asynchronously
});

