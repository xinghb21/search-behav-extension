let isExperimentActive = false;

// 节流函数优化性能
const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

const detectEngine = () => {
  const host = window.location.hostname;
  if (host.includes('google')) return 'google';
  if (host.includes('bing')) return 'bing';
  if (host.includes('perplexity')) return 'perplexity';
  if (host.includes('you.com')) return 'you';
  return 'unknown';
};

// 检查实验配置
const checkExperimentConfig = async () => {
  try {
    const result = await chrome.storage.local.get(['experimentConfig']);
    const config = result.experimentConfig || {};
    const isTargetPlatform = detectEngine() === config.platform;
    isExperimentActive = config.isRunning && isTargetPlatform;
    return isExperimentActive;
  } catch (err) {
    console.error('检查实验配置失败:', err);
    return false;
  }
};


// 增强版事件记录
const logEvent = async (type, data) => {
  if (!(await checkExperimentConfig())) return;

  // 原有记录逻辑
  const event = {
    ...data,
    type,
    engine: detectEngine(),
    timestamp: Date.now(),
    url: window.location.href
  };

  chrome.runtime.sendMessage({ type: 'logEvent', data: event }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('发送失败:', chrome.runtime.lastError);
    }
  });
};

// 初始化检查
checkExperimentConfig().then((active) => {
  if (active) {
    document.addEventListener('mousemove', throttle(mouseMoveHandler, 100));
    document.addEventListener('click', clickHandler);
  }
});

// 动态响应配置变化
chrome.storage.onChanged.addListener((changes) => {
  if (changes.experimentConfig) {
    const newConfig = changes.experimentConfig.newValue || {};
    const isTarget = detectEngine() === newConfig.platform;
    
    if (newConfig.isRunning && isTarget) {
      document.addEventListener('mousemove', throttle(mouseMoveHandler, 100));
      document.addEventListener('click', clickHandler);
    } else {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('click', clickHandler);
    }
  }
});

// 鼠标移动处理器
const mouseMoveHandler = throttle((e) => {
  logEvent('mousemove', {
    x: e.clientX,
    y: e.clientY,
    scrollY: window.scrollY
  });
}, 100); // 保持100ms采样间隔

// 点击事件处理器
const clickHandler = (e) => {
  logEvent('click', {
    x: e.clientX,
    y: e.clientY,
    innerText: e.target.innerText?.slice(0, 50) // 截取前50字符
  });
};