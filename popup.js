let engines = {};

function loadEngines() {
  chrome.runtime.sendMessage({action: "getSearchEngines"}, function(response) {
    if (chrome.runtime.lastError) {
      console.error("Error getting search engines:", chrome.runtime.lastError);
    } else if (response && response.engines) {
      engines = response.engines;
      console.log("Loaded engines:", engines);
      updateEngineList();
    } else {
      console.log("Failed to get search engines from background script");
    }
  });
}

function updateEngineList() {
  const engineList = document.getElementById('engineList');
  engineList.innerHTML = '';
  for (const [name, url] of Object.entries(engines)) {
    engineList.appendChild(createEngineElement(name, url));
  }
}

function createEngineElement(name, url, isNew = false) {
  const li = document.createElement('li');
  li.className = 'engine-item';
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'engine-name';
  nameSpan.textContent = name;
  
  const editButton = document.createElement('button');
  editButton.textContent = '修改';
  editButton.className = 'edit-button';
  
  const editForm = document.createElement('div');
  editForm.className = 'edit-form' + (isNew ? '' : ' hidden');
  editForm.innerHTML = `
    <input type="text" class="name-input" value="${name}" placeholder="搜索引擎名称">
    <input type="text" class="url-input" value="${url}" placeholder="搜索URL (使用 %s 表示查询)">
    <button class="save-button">保存</button>
    <button class="cancel-button">取消</button>
  `;
  
  li.appendChild(nameSpan);
  li.appendChild(editButton);
  li.appendChild(editForm);
  
  if (isNew) {
    nameSpan.classList.add('hidden');
    editButton.classList.add('hidden');
  }
  
  editButton.addEventListener('click', () => {
    nameSpan.classList.add('hidden');
    editForm.classList.remove('hidden');
    editButton.classList.add('hidden');
  });
  
  editForm.querySelector('.save-button').addEventListener('click', () => {
    const newName = editForm.querySelector('.name-input').value.trim();
    const newUrl = editForm.querySelector('.url-input').value.trim();
    if (newName && newUrl) {
      if (name !== newName) {
        delete engines[name];
      }
      engines[newName] = newUrl;
      saveEngines();
      updateEngineList();
    }
  });
  
  editForm.querySelector('.cancel-button').addEventListener('click', () => {
    if (isNew) {
      li.remove();
    } else {
      nameSpan.classList.remove('hidden');
      editForm.classList.add('hidden');
      editButton.classList.remove('hidden');
      editForm.querySelector('.name-input').value = name;
      editForm.querySelector('.url-input').value = url;
    }
  });
  
  return li;
}

function saveEngines() {
  chrome.runtime.sendMessage({action: "updateSearchEngines", engines: engines}, function(response) {
    if (response && response.success) {
      console.log('Engines saved and updated');
    } else {
      console.error('Failed to save engines');
    }
  });
}

document.getElementById('addEngine').addEventListener('click', () => {
  const engineList = document.getElementById('engineList');
  engineList.appendChild(createEngineElement('', '', true));
});

document.addEventListener('DOMContentLoaded', loadEngines);

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.engines) {
    loadEngines();
  }
});