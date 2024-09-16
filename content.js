let searchEngines = {};
let isInitialized = false;

function updateSearchEngines() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({action: "getSearchEngines"}, function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error getting search engines:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else if (response && response.engines) {
        searchEngines = response.engines;
        console.log("Search engines updated in content script:", searchEngines);
        resolve(searchEngines);
      } else {
        console.log("Failed to get search engines from background script");
        reject(new Error("Failed to get search engines"));
      }
    });
  });
}

function initialize() {
  if (isInitialized) return Promise.resolve();
  
  return updateSearchEngines()
    .then(() => {
      console.log("Search engines initialized");
      isInitialized = true;
      document.addEventListener('mouseup', handleSelection);
      window.addEventListener('scroll', updateBubblePosition);
      window.addEventListener('pagehide', cleanup);
    })
    .catch(console.error);
}

const colors = {
  primary: '#4285f4',
  secondary: '#fbbc05',
  background: '#ffffff',
  text: '#202124',
  border: '#dadce0'
};

let currentBubble = null;
let currentExpandedBubble = null;
let lastSelection = null;
let lastSelectionRect = null;

function createBubble(text, position) {
  if (!isInitialized) {
    initialize().then(() => createBubble(text, position));
    return;
  }

  console.log("Creating bubble for text:", text, "at position:", position);
  if (currentBubble) {
    document.body.removeChild(currentBubble);
  }

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    position: fixed;
    top: ${position.top + 20}px;
    left: ${position.left + 20}px;
    background: rgba(255, 255, 255, 0.8);
    padding: 8px;
    border-radius: 50%;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 9999;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.3s ease;
  `;

  bubble.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  `;

  document.body.appendChild(bubble);
  currentBubble = bubble;

  bubble.addEventListener('mouseenter', () => {
    createExpandedBubble(text, position);
    document.body.removeChild(bubble);
    currentBubble = null;
  });

  // 添加滚动事件监听器
  window.addEventListener('scroll', updateBubblePosition);
}

function updateBubblePosition() {
  if (lastSelectionRect) {
    const viewportPosition = lastSelectionRect.getBoundingClientRect();
    const position = {
      top: viewportPosition.bottom,
      left: viewportPosition.right
    };

    if (currentBubble) {
      currentBubble.style.top = `${position.top + 20}px`;
      currentBubble.style.left = `${position.left + 20}px`;
    }

    if (currentExpandedBubble) {
      currentExpandedBubble.style.top = `${position.top + 20}px`;
      currentExpandedBubble.style.left = `${position.left + 20}px`;
    }
  }
}

function createExpandedBubble(text, position) {
  if (!isInitialized) {
    initialize().then(() => createExpandedBubble(text, position));
    return;
  }

  updateSearchEngines(); // 确保使用最新的搜索引擎列表
  if (currentExpandedBubble) {
    document.body.removeChild(currentExpandedBubble);
  }

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    position: fixed;
    top: ${position.top}px;
    left: ${position.left}px;
    background: ${colors.background};
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 9999;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 5px;
  `;

  for (const [engine, url] of Object.entries(searchEngines)) {
    const button = document.createElement('button');
    button.textContent = engine;
    button.style.cssText = `
      padding: 8px 12px;
      font-size: 14px;
      background: ${colors.background};
      color: ${colors.text};
      border: 1px solid ${colors.border};
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    button.addEventListener('mouseover', () => {
      button.style.background = colors.secondary;
      button.style.color = colors.text;
    });
    button.addEventListener('mouseout', () => {
      button.style.background = colors.background;
      button.style.color = colors.text;
    });
    button.addEventListener('click', () => {
      const trimmedText = text.replace(/\s+/g, ' ').trim();
      console.log(`Sending search request for engine: ${engine}, query: ${trimmedText}`);
      chrome.runtime.sendMessage({
        action: "performSearch",
        engine: engine,
        query: trimmedText
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
        } else {
          console.log("Search request sent successfully");
        }
      });
      removeExpandedBubble();
    });
    bubble.appendChild(button);
  }

  document.body.appendChild(bubble);
  currentExpandedBubble = bubble;

  // 添加点击事件监听器来关闭拓展气泡
  document.addEventListener('click', closeExpandedBubble);
}

function closeExpandedBubble(event) {
  if (currentExpandedBubble && !currentExpandedBubble.contains(event.target)) {
    removeExpandedBubble();
    document.removeEventListener('click', closeExpandedBubble);
  }
}

function removeExpandedBubble() {
  if (currentExpandedBubble) {
    document.body.removeChild(currentExpandedBubble);
    currentExpandedBubble = null;
  }
}

function handleSelection() {
  if (!isInitialized) {
    initialize().then(handleSelection);
    return;
  }

  setTimeout(() => {
    const selectedText = window.getSelection().toString().trim().replace(/\s+/g, ' ');
    console.log("Selected text:", selectedText);
    if (selectedText.length > 0) {
      console.log("Creating bubble");
      lastSelection = window.getSelection();
      const range = lastSelection.getRangeAt(lastSelection.rangeCount - 1);
      lastSelectionRect = range.getBoundingClientRect();
      const position = {
        top: lastSelectionRect.bottom,
        left: lastSelectionRect.right
      };
      createBubble(selectedText, position);
    } else {
      if (currentBubble) {
        document.body.removeChild(currentBubble);
        currentBubble = null;
      }
      if (currentExpandedBubble) {
        removeExpandedBubble();
      }
      lastSelection = null;
      lastSelectionRect = null;
      window.removeEventListener('scroll', updateBubblePosition);
    }
  }, 0);
}

// 只在mouseup事件上监听选择
document.addEventListener('mouseup', handleSelection);

// 清理函数
function cleanup() {
  if (currentBubble) {
    document.body.removeChild(currentBubble);
    currentBubble = null;
  }
  if (currentExpandedBubble) {
    document.body.removeChild(currentExpandedBubble);
    currentExpandedBubble = null;
  }
  lastSelection = null;
  lastSelectionRect = null;
  window.removeEventListener('scroll', updateBubblePosition);
  document.removeEventListener('click', closeExpandedBubble);
}

// 替换 unload 事件监听器
window.addEventListener('pagehide', cleanup);

// 确保在 DOMContentLoaded 事件之后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "showBubble") {
    createBubble(request.text, request.position);
  } else if (request.action === "showSearchBox") {
    createSearchBox(request.position);
  } else if (request.action === "checkSelection") {
    const selection = window.getSelection();
    const hasSelection = selection.toString().trim().length > 0;
    sendResponse({hasSelection: hasSelection});
  } else if (request.action === "updateEngines") {
    searchEngines = request.engines;
    console.log("Search engines updated from background:", searchEngines);
  }
});

// 添加一个监听器来更新搜索引擎列表
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.engines) {
    updateSearchEngines();
  }
});

console.log("Content script loaded and running");