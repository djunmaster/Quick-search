let engines = {};

function saveEngines() {
  chrome.storage.sync.set({engines: engines}, function() {
    console.log('Engines saved');
  });
}

function createEngineElement(name, url) {
  const li = document.createElement('li');
  const nameInput = document.createElement('input');
  nameInput.value = name;
  const urlInput = document.createElement('input');
  urlInput.value = url;
  const saveButton = document.createElement('button');
  saveButton.textContent = '保存';
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '删除';

  li.appendChild(nameInput);
  li.appendChild(urlInput);
  li.appendChild(saveButton);
  li.appendChild(deleteButton);

  saveButton.addEventListener('click', () => {
    engines[nameInput.value] = urlInput.value;
    saveEngines();
  });

  deleteButton.addEventListener('click', () => {
    delete engines[name];
    li.remove();
    saveEngines();
  });

  return li;
}

function loadEngines() {
  chrome.storage.sync.get('engines', function(data) {
    engines = data.engines || {
      "Google": "https://www.google.com/search?q=%s",
      "YouTube": "https://www.youtube.com/results?search_query=%s",
      "秘塔AI": "https://metaso.cn/?q=%s",
      "360AI": "https://so.360.com/s?q=%s&src=msousuo_tophot"
    };
    const engineList = document.getElementById('engineList');
    for (const [name, url] of Object.entries(engines)) {
      engineList.appendChild(createEngineElement(name, url));
    }
  });
}

document.getElementById('addEngine').addEventListener('click', () => {
  const engineList = document.getElementById('engineList');
  engineList.appendChild(createEngineElement('', ''));
});

document.addEventListener('DOMContentLoaded', loadEngines);

document.getElementById('resetButton').addEventListener('click', function() {
  chrome.storage.sync.clear(function() {
    console.log('Storage cleared');
    chrome.runtime.sendMessage({action: "reinitializeEngines"});
  });
});