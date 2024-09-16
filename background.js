console.log("Background script starting...");

let searchEngines = {};
let searchEnginesInitialized = false;

function initSearchEngines() {
  if (searchEnginesInitialized) return Promise.resolve(searchEngines);
  return new Promise((resolve) => {
    chrome.storage.sync.get('engines', function(data) {
      searchEngines = data.engines || {
        "Google": "https://www.google.com/search?q=%s",
        "YouTube": "https://www.youtube.com/results?search_query=%s",
        "秘塔AI": "https://metaso.cn/?q=%s",
        "360AI": "https://so.360.com/s?q=%s&src=msousuo_tophot"
      };
      chrome.storage.sync.set({engines: searchEngines});
      searchEnginesInitialized = true;
      console.log("Search engines initialized:", searchEngines);
      resolve(searchEngines);
    });
  });
}

initSearchEngines().then(() => {
  console.log("Search engines initialized in background script");
}).catch(error => {
  console.error("Error initializing search engines:", error);
});

function updateSearchEngines(newEngines) {
  searchEngines = newEngines;
  chrome.storage.sync.set({engines: searchEngines}, function() {
    console.log('Search engines updated:', searchEngines);
    notifyAllTabs();
  });
}

function notifyAllTabs() {
  chrome.tabs.query({}, function(tabs) {
    for (let tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {action: "updateEngines", engines: searchEngines});
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSearchEngines") {
    sendResponse({engines: searchEngines});
  } else if (request.action === "updateSearchEngines") {
    updateSearchEngines(request.engines);
    sendResponse({success: true});
  } else if (request.action === "performSearch") {
    const { engine, query } = request;
    search(engine, query);
    sendResponse({success: true});
  }
  return true;  // 保持消息通道开放
});

function search(engine, query) {
  console.log(`Searching ${engine} for:`, query);
  if (searchEngines[engine]) {
    let url = searchEngines[engine].replace('%s', encodeURIComponent(query));
    console.log("Opening URL:", url);
    chrome.tabs.create({ url: url });
  } else {
    console.error(`Search engine "${engine}" not found`);
  }
}

console.log("Background script fully loaded and initialized.");