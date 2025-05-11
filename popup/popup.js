document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const username = document.getElementById('username');
  const platform = document.getElementById('platform');
  const task = document.getElementById('task');
  const currentPlatform = document.getElementById('currentPlatform');
  const eventCount = document.getElementById('eventCount');

  // 加载保存的配置
  chrome.storage.local.get(['experimentConfig'], (result) => {
    if (result.experimentConfig) {
      username.value = result.experimentConfig.username || '';
      platform.value = result.experimentConfig.platform || 'google';
      task.value = result.experimentConfig.task || 'task1';
      currentPlatform.textContent = result.experimentConfig.platform || '未启动';
      startBtn.disabled = result.experimentConfig.isRunning;
      stopBtn.disabled = !result.experimentConfig.isRunning;
      eventCount.textContent = result.eventCount || 0;
    }
  });

  // 启动实验
  startBtn.addEventListener('click', () => {
    if (!username.value.trim()) {
      alert('请输入用户名');
      return;
    }

    const config = {
      username: username.value.trim(),
      platform: platform.value,
      task: task.value,
      isRunning: true
    };

    chrome.storage.local.set({ experimentConfig: config }, () => {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      currentPlatform.textContent = config.platform;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });

  // 停止实验
  stopBtn.addEventListener('click', () => {
    
    chrome.storage.local.set({ experimentConfig: { isRunning: false } }, () => {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      currentPlatform.textContent = '未启动';
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
    });
  });

  // 实时更新事件计数
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.eventCount) {
      eventCount.textContent = changes.eventCount.newValue;
    }
  });
});