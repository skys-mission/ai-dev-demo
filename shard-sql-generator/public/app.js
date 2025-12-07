

// 应用状态管理
const appState = {
  currentAlgorithm: 'mod',
  theme: localStorage.getItem('theme') || 'light'
};

// 初始化应用
async function initApp() {
  // 初始化工具函数
  Utils.init();
  
  // 初始化主题
  Utils.initTheme();
  
  // 初始化分片算法模块
  await ShardAlgorithm.init();
  
  // 初始化脚本列表
  await ScriptManager.loadScripts();
  
  // 初始化历史记录
  await HistoryManager.loadHistory();
  
  // 绑定事件
  bindEvents();
}

// 事件绑定
function bindEvents() {
  // 生成SQL按钮
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    console.log('找到生成SQL按钮，添加点击事件监听器');
    generateBtn.addEventListener('click', async () => {
      console.log('生成SQL按钮被点击，调用SQLHandler.generateShardSQL()');
      try {
        await SQLHandler.generateShardSQL();
        console.log('SQLHandler.generateShardSQL()调用完成');
      } catch (error) {
        console.error('SQLHandler.generateShardSQL()调用出错:', error);
      }
    });
  } else {
    console.error('未找到生成SQL按钮');
  }
  
  // 分片算法选择事件已在ShardAlgorithm.init()中绑定
  
  // 复制全部按钮
  document.getElementById('copy-all').addEventListener('click', () => {
    SQLHandler.copyAllSQL();
  });
  
  // 导出结果按钮
  document.getElementById('export-results').addEventListener('click', () => {
    SQLHandler.exportResults();
  });
  
  // 格式化SQL按钮
  document.getElementById('format-sql').addEventListener('click', () => {
    SQLHandler.formatSQL();
  });
  
  // 清空按钮
  document.getElementById('clear-btn').addEventListener('click', () => {
    clearAll();
  });
  
  // 主题切换
  document.getElementById('theme-toggle').addEventListener('click', () => {
    Utils.toggleTheme();
  });
  
  // 帮助按钮
  document.getElementById('help-btn').addEventListener('click', () => {
    showHelp();
  });
  
  // 添加脚本按钮
  document.getElementById('add-script').addEventListener('click', () => {
    ScriptManager.addScript();
  });
  
  // 管理脚本按钮事件已在ShardAlgorithm.init()中绑定
  
  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });
}

// 显示帮助
function showHelp() {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const helpContent = document.getElementById('help-content');
  
  modalTitle.textContent = '帮助信息';
  modalBody.innerHTML = helpContent.innerHTML;
  modal.classList.add('active');
}

// 切换标签页
function switchTab(tabName) {
  // 隐藏所有内容区域
  const contentAreas = document.querySelectorAll('.tab-content');
  contentAreas.forEach(area => {
    area.classList.remove('active');
  });
  
  // 移除所有按钮的激活状态
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 显示选中的内容区域
  document.getElementById(tabName + '-tab').classList.add('active');
  
  // 设置选中按钮的激活状态
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// 清空所有输入
function clearAll() {
  document.getElementById('sql-input').value = '';
  document.getElementById('shard-key').value = '';
  document.getElementById('shard-values').value = '';
  document.getElementById('shard-algorithm').value = 'mod';
  document.getElementById('mod-value').value = '4';
  document.getElementById('range-rules').value = `{
  "rules": [
    { "min": 0, "max": 100000, "shard": 0 },
    { "min": 100001, "max": 200000, "shard": 1 },
    { "min": 200001, "max": 300000, "shard": 2 },
    { "min": 300001, "max": 400000, "shard": 3 }
  ]
}`;
  document.getElementById('hash-algorithm').value = 'md5';
  document.getElementById('hash-shards').value = '4';
  document.getElementById('consistent-nodes').value = '4';
  document.getElementById('consistent-virtual').value = '100';
  document.getElementById('date-format').value = 'YYYY';
  document.getElementById('custom-script').value = '';
  
  // 清空输出
  const sqlOutput = document.getElementById('sql-output');
  sqlOutput.innerHTML = '<div class="empty-state"><span class="icon">📝</span><p>输入SQL并配置分片规则，点击生成按钮查看结果</p></div>';
  
  // 重置算法参数显示
  appState.currentAlgorithm = 'mod';
  ShardAlgorithm.updateAlgorithmFields();
  
  Utils.showMessage('提示', '已清空所有输入', 'info');
}

// 初始化应用
window.addEventListener('DOMContentLoaded', initApp);

// 导出函数供外部使用
window.appState = appState;