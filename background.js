let eventBuffer = [];
let eventCount = 0;

// 接收实验数据
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'logEvent') {
    eventCount++;
    chrome.storage.local.set({ eventCount });
    
    eventBuffer.push({
      ...message.data,
      sessionId: chrome.runtime.id,
      userConfig: (await chrome.storage.local.get('experimentConfig')).experimentConfig
    });

    if (eventBuffer.length >= 50) {
      flushBuffer();
    }
  }
});

// 定时刷新缓冲区
setInterval(flushBuffer, 10000); // 每10秒发送

function flushBuffer() {
  if (eventBuffer.length === 0) return;
  
  chrome.storage.local.get(['userId'], (result) => {
    const payload = {
      userId: result.userId || 'anonymous',
      events: eventBuffer
    };
    
    // 发送到服务器
    // fetch('https://your-analytics-endpoint.com/log', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // }).then(() => {
    //   eventBuffer = [];
    // });
    console.log('Sending events:', payload);
    eventBuffer = [];
  });
}

// 生成用户ID
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['userId'], (result) => {
    if (!result.userId) {
      chrome.storage.local.set({ 
        userId: 'user_' + Math.random().toString(36).substr(2, 9)
      });
    }
  });
});
