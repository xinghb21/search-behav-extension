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

    const startTime = Date.now();
    chrome.storage.local.set({ startTime }, () => {
      console.log('实验开始时间已保存:', startTime);
    });

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

    fetch('http://localhost:4389/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: config.username })
    }).then(() => {
      console.log('gaze 程序已启动');
    }).catch(err => {
      console.error('gaze 程序启动失败', err);
    });

  });

  // 停止实验
  stopBtn.addEventListener('click', async () => {
    const endTime = Date.now();
    const { experimentConfig } = await chrome.storage.local.get('experimentConfig');
    const { startTime } = await chrome.storage.local.get('startTime');
    const { scrollMeta } = await chrome.storage.local.get('scrollMeta');

    const duration = startTime ? (endTime - startTime) : null;
    const maxScrollY = scrollMeta?.maxScrollY || 0;

    const payload = {
      username: experimentConfig?.username || 'anonymous',
      task: experimentConfig?.task || 'task1',
      platform: experimentConfig?.platform || 'unknown',
      duration,
      maxScrollY
    };

    const filename = `experiment/${payload.platform}/${payload.task}/${payload.username}_summary.json`;
    const ossURL = `https://search-engine-experiment.oss-cn-beijing.aliyuncs.com/${filename}`;

    await fetch(ossURL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => {
      console.log('实验汇总数据已上传:', filename);
    }).catch(err => {
      console.error('上传失败:', err);
    });

    chrome.storage.local.set({ experimentConfig: { isRunning: false } }, () => {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      currentPlatform.textContent = '未启动';
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
    });

    await fetch('http://localhost:4389/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: payload.username })
    }).then(() => {
      console.log('gaze 程序已停止，数据分析已触发');
    }).catch(err => {
      console.error('gaze 程序终止或数据分析失败', err);
    });

  });

  // 实时更新事件计数
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.eventCount) {
      eventCount.textContent = changes.eventCount.newValue;
    }
  });
});