let eventBuffer = [];
let eventCount = 0;

// 接收实验数据
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'logEvent') {
    eventCount++;
    chrome.storage.local.set({ eventCount });
    
    eventBuffer.push({
      ...message.data
    });

    if (eventBuffer.length >= 50) {
      flushBuffer();
    }

    return true; 
  }
});

// 定时刷新缓冲区
setInterval(flushBuffer, 10000); // 每10秒发送

async function flushBuffer() {
  if (eventBuffer.length === 0) return;

  const config = await chrome.storage.local.get('experimentConfig');
  if (!config.experimentConfig) {
    console.warn('实验配置未找到，无法上传数据');
    return;
  }
  console.log('实验配置:', config.experimentConfig);
  const { isRunning, username, platform, task } = config.experimentConfig;
  const filename = `experiment/${platform}/${task}/${username}.json`;
  const ossURL = `https://search-engine-experiment.oss-cn-beijing.aliyuncs.com/${filename}`;

  let mergedEvents = [...eventBuffer];

  try {
    const headRes = await fetch(ossURL, { method: 'HEAD' });
    if (headRes.ok) {
      const getRes = await fetch(ossURL);
      if (getRes.ok) {
        const oldData = await getRes.json();
        if (Array.isArray(oldData.events)) {
          mergedEvents = oldData.events.concat(eventBuffer);
        }
      }
    }

    const finalData = {
      username: username,
      task: task,
      platform: platform,
      events: mergedEvents,
      timestamp: Date.now()
    };

    const putRes = await fetch(ossURL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalData)
    });

    if (putRes.ok) {
      console.log('文件已更新:', filename);
      eventBuffer = [];
    } else {
      console.warn('上传失败:', putRes.statusText);
    }

  } catch (err) {
    console.error('OSS上传出错:', err);
  }
}
