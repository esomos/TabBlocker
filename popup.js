const saveButton = document.getElementById("save-blocklist");
const addCurrentButton = document.getElementById("add-current");
const blocklistElement = document.getElementById("block-list");
const tooltip = document.getElementById("hover")

// Load the blocklist when the popup is opened
chrome.storage.local.get(["blocklist", "silentAll"], (result) => {
    document.getElementById("silent-all").checked = result.silentAll;
    const blocklist = result.blocklist || {};
    for (const key of Object.keys(blocklist)) {
        createListItem(
            key,
            blocklist[key].blockTabs,
            blocklist[key].blockUrl,
            blocklist[key].silent
        );
    }
});

function createListItem(hostname, blockTabs = true, blockUrl = true, silent = false) {
    const listItem = document.createElement("div");
    listItem.classList.add('list-item');

    const createInput = ({ name, type, className, value, checked, onclick, tooltipText, tipLeft = false }) => {
        const input = document.createElement("input");
        input.name = name;
        input.type = type;
        if (tooltipText) {
            input.addEventListener("mouseenter", e => {
                const rect = input.getBoundingClientRect()
                tooltip.style.display = "block"
                tooltip.style.opacity = .8
                tooltip.innerHTML = tooltipText
                tooltip.style.left = rect.left + window.scrollX - (tipLeft ? tooltip.getBoundingClientRect().width : 0) + "px"
                tooltip.style.top = rect.top + window.scrollY - tooltip.offsetHeight - 20 + "px"
            })
            input.addEventListener("mouseleave", e => {
                tooltip.style.opacity = 0
            })
        }
        input.value = value;
        input.onclick = onclick;
        input.checked = checked;
        input.classList.add(className);
        listItem.appendChild(input);
    };
    createInput({
        name: "hostname",
        type: "text",
        className: "hostname-input",
        value: hostname
    });
    createInput({
        name: "block-tabs",
        type: "checkbox",
        className: "list-item-checkbox",
        checked: blockTabs,
        tooltipText: "block new tabs"
    });
    createInput({
        name: "block-url",
        type: "checkbox",
        className: "list-item-checkbox",
        checked: blockUrl,
        tooltipText: "block url changes"
    });
    createInput({
        name: "silent",
        type: "checkbox",
        className: "list-item-checkbox",
        checked: silent,
        tooltipText: "disable notifications",
        tipLeft: true
    });
    createInput({
        type: "button",
        className: "list-item-button",
        value: "X",
        onclick: () => { listItem.remove(); }
    })
    blocklistElement.appendChild(listItem);
}

// Save the blocklist when the save button is clicked
saveButton.addEventListener("click", () => {
    const newBlocklist = {};
    const forAll = {
        silentAll: document.getElementById("silent-all").checked
    };
    for (const listItem of blocklistElement.children) {
        newBlocklist[listItem.children[0].value] = {
            blockTabs: listItem.children[1].checked,
            blockUrl: listItem.children[2].checked,
            silent: listItem.children[3].checked
        }
    }
    chrome.storage.local.set({ blocklist: newBlocklist, ...forAll }, () => {
        chrome.runtime.sendMessage({ data: "blocklistSaved" });
    });
});

addCurrentButton.addEventListener("click", async () => {
    const tab = await getCurrentTab();
    if (tab) {
        createListItem(new URL(tab.url).hostname);
    } else {
        console.error("no window or tab is active");
    }
})

async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

