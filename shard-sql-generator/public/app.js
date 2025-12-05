// 分片SQL生成器 - 前端交互逻辑
// 纯JavaScript原生实现，无第三方依赖

// 应用状态管理
const appState = {
  currentAlgorithm: 'mod',
  theme: sessionStorage.getItem('theme') || 'light',
  history: JSON.parse(sessionStorage.getItem('sqlHistory') || '[]'),
  scripts: JSON.parse(sessionStorage.getItem('customScripts') || '[]')
};

// 初始化应用
function initApp() {
  // 设置主题
  document.documentElement.setAttribute('data-theme', appState.theme);
  
  // 绑定事件
  bindEvents();
  
  // 初始化算法参数显示
  updateAlgorithmParams();
  
  // 初始化脚本列表
  updateScriptList();
  
  // 初始化历史记录
  updateHistoryList();
  
  // 欢迎消息
  console.log('分片SQL生成器已加载');
}

// 绑定事件
function bindEvents() {
  // 主题切换
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // 帮助按钮
  document.getElementById('help-btn').addEventListener('click', showHelp);
  
  // 分片算法选择
  document.getElementById('shard-algorithm').addEventListener('change', (e) => {
    appState.currentAlgorithm = e.target.value;
    updateAlgorithmParams();
  });
  
  // 生成SQL按钮
  document.getElementById('generate-btn').addEventListener('click', generateSQL);
  
  // 清空按钮
  document.getElementById('clear-btn').addEventListener('click', clearAll);
  
  // SQL格式化按钮
  document.getElementById('format-sql').addEventListener('click', formatSQL);
  
  // 复制全部按钮
  document.getElementById('copy-all').addEventListener('click', copyAllSQL);
  
  // 导出结果按钮
  document.getElementById('export-results').addEventListener('click', exportResults);
  
  // 管理脚本按钮
  document.getElementById('manage-scripts').addEventListener('click', manageScripts);
  
  // 添加脚本按钮
  document.getElementById('add-script').addEventListener('click', addScript);
  
  // 清空历史按钮
  document.getElementById('clear-history').addEventListener('click', clearHistory);
  
  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });
  
  // 模态框关闭
  document.getElementById('modal-close').addEventListener('click', closeModal);
  
  // 点击模态框外部关闭
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
      closeModal();
    }
  });
  
  // 按ESC键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// 主题切换
function toggleTheme() {
  appState.theme = appState.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', appState.theme);
  sessionStorage.setItem('theme', appState.theme);
  
  // 更新主题切换按钮图标
  const icon = document.querySelector('#theme-toggle .icon');
  icon.textContent = appState.theme === 'light' ? '🌙' : '☀️';
}

// 显示帮助
function showHelp() {
  const helpContent = document.getElementById('help-content').innerHTML;
  showModal('帮助信息', helpContent);
}

// 显示模态框
function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('modal').classList.add('active');
}

// 关闭模态框
function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

// 更新算法参数显示
function updateAlgorithmParams() {
  const paramsGroups = document.querySelectorAll('.params-group');
  paramsGroups.forEach(group => {
    group.style.display = group.dataset.algorithm === appState.currentAlgorithm ? 'block' : 'none';
  });
}

// 标签页切换
function switchTab(tabName) {
  // 更新标签按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // 更新标签内容
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

// 生成SQL
function generateSQL() {
  const sqlInput = document.getElementById('sql-input').value.trim();
  const shardKey = document.getElementById('shard-key').value.trim();
  const shardValues = document.getElementById('shard-values').value.trim();
  
  // 验证输入
  if (!sqlInput) {
    alert('请输入SQL语句');
    return;
  }
  
  if (!shardKey) {
    alert('请输入分片键');
    return;
  }
  
  if (!shardValues) {
    alert('请输入分片键值');
    return;
  }
  
  // 解析分片键值
  const values = shardValues.split('\n').map(v => v.trim()).filter(v => v);
  
  // 获取算法配置
  const algorithmConfig = getAlgorithmConfig();
  
  // 生成SQL结果
  const results = [];
  values.forEach(value => {
    const shardId = calculateShardId(value, algorithmConfig);
    const shardSQL = generateShardSQL(sqlInput, shardKey, value, shardId);
    results.push({
      value: value,
      shardId: shardId,
      sql: shardSQL
    });
  });
  
  // 生成聚合SQL
  const aggregateSQL = generateAggregateSQL(results, sqlInput);
  
  // 显示结果
  displayResults(results, aggregateSQL);
  
  // 保存到历史记录
  saveToHistory(sqlInput, algorithmConfig, results, aggregateSQL);
  
  console.log('SQL生成完成', results);
}

// 获取算法配置
function getAlgorithmConfig() {
  const algorithm = appState.currentAlgorithm;
  const config = { algorithm };
  
  switch (algorithm) {
    case 'mod':
      config.mod = parseInt(document.getElementById('mod-value').value);
      break;
      
    case 'range':
      try {
        config.rules = JSON.parse(document.getElementById('range-rules').value).rules;
      } catch (e) {
        alert('范围规则JSON格式错误');
        throw e;
      }
      break;
      
    case 'hash':
      config.hashAlgorithm = document.getElementById('hash-algorithm').value;
      config.numShards = parseInt(document.getElementById('hash-shards').value);
      break;
      
    case 'consistent-hash':
      config.numNodes = parseInt(document.getElementById('consistent-nodes').value);
      config.virtualNodes = parseInt(document.getElementById('consistent-virtual').value);
      break;
      
    case 'date':
      config.dateFormat = document.getElementById('date-format').value;
      break;
      
    case 'custom':
      config.scriptId = document.getElementById('custom-script').value;
      break;
  }
  
  return config;
}

// 计算分片ID
function calculateShardId(value, config) {
  switch (config.algorithm) {
    case 'mod':
      return parseInt(value) % config.mod;
      
    case 'range':
      const numValue = parseInt(value);
      for (const rule of config.rules) {
        if (numValue >= rule.min && numValue <= rule.max) {
          return rule.shard;
        }
      }
      return 0;
      
    case 'hash':
      const hash = simpleHash(value, config.hashAlgorithm);
      return hash % config.numShards;
      
    case 'consistent-hash':
      return consistentHash(value, config.numNodes, config.virtualNodes);
      
    case 'date':
      return dateShard(value, config.dateFormat);
      
    case 'custom':
      return customScriptShard(value, config.scriptId);
      
    default:
      return 0;
  }
}

// 简单哈希函数
function simpleHash(value, algorithm = 'md5') {
  // 简化的哈希实现，实际项目中应使用更安全的哈希算法
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// 一致性哈希
function consistentHash(value, numNodes, virtualNodes) {
  const hash = simpleHash(value);
  return hash % numNodes;
}

// 日期分片
function dateShard(value, format) {
  const date = new Date(value);
  let shardValue = '';
  
  switch (format) {
    case 'YYYY':
      shardValue = date.getFullYear().toString();
      break;
    case 'YYYYMM':
      shardValue = date.getFullYear().toString() + 
                  String(date.getMonth() + 1).padStart(2, '0');
      break;
    case 'YYYYMMDD':
      shardValue = date.getFullYear().toString() + 
                  String(date.getMonth() + 1).padStart(2, '0') + 
                  String(date.getDate()).padStart(2, '0');
      break;
    case 'YYYYMMDDHH':
      shardValue = date.getFullYear().toString() + 
                  String(date.getMonth() + 1).padStart(2, '0') + 
                  String(date.getDate()).padStart(2, '0') + 
                  String(date.getHours()).padStart(2, '0');
      break;
  }
  
  return simpleHash(shardValue) % 10; // 示例：返回0-9的分片ID
}

// 自定义脚本分片
function customScriptShard(value, scriptId) {
  const script = appState.scripts.find(s => s.id === scriptId);
  if (!script) {
    return 0;
  }
  
  try {
    // 创建一个安全的执行环境
    const func = new Function('value', script.code);
    return func(value);
  } catch (e) {
    console.error('自定义脚本执行错误:', e);
    alert('自定义脚本执行错误: ' + e.message);
    return 0;
  }
}

// 生成分片SQL
function generateShardSQL(originalSQL, shardKey, shardValue, shardId) {
  // 简单的SQL替换逻辑，实际项目中应使用更完善的SQL解析
  let shardSQL = originalSQL;
  
  // 替换表名，添加分片后缀
  shardSQL = shardSQL.replace(/FROM\s+([a-zA-Z0-9_]+)/gi, (match, table) => {
    return `FROM ${table}_${shardId}`;
  });
  
  shardSQL = shardSQL.replace(/UPDATE\s+([a-zA-Z0-9_]+)/gi, (match, table) => {
    return `UPDATE ${table}_${shardId}`;
  });
  
  shardSQL = shardSQL.replace(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)/gi, (match, table) => {
    return `DELETE FROM ${table}_${shardId}`;
  });
  
  shardSQL = shardSQL.replace(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/gi, (match, table) => {
    return `INSERT INTO ${table}_${shardId}`;
  });
  
  // 替换分片键占位符
  if (shardSQL.includes('?')) {
    const parts = shardSQL.split('?');
    let result = parts[0];
    let placeholderIndex = 0;
    
    for (let i = 1; i < parts.length; i++) {
      if (placeholderIndex === 0) {
        // 第一个占位符替换为分片键值
        result += typeof shardValue === 'number' ? shardValue : `'${shardValue}'`;
      } else {
        // 其他占位符保持不变
        result += '?';
      }
      result += parts[i];
      placeholderIndex++;
    }
    
    shardSQL = result;
  } else {
    // 如果没有占位符，尝试在WHERE子句中添加分片键条件
    if (shardSQL.includes('WHERE')) {
      shardSQL = shardSQL.replace(/WHERE\s+/i, (match) => {
        return `${match} ${shardKey} = ${typeof shardValue === 'number' ? shardValue : `'${shardValue}'`} AND `;
      });
    } else {
      // 如果没有WHERE子句，添加WHERE子句
      const insertIndex = shardSQL.includes(';') ? shardSQL.lastIndexOf(';') : shardSQL.length;
      shardSQL = shardSQL.slice(0, insertIndex) + 
                ` WHERE ${shardKey} = ${typeof shardValue === 'number' ? shardValue : `'${shardValue}'`}` + 
                shardSQL.slice(insertIndex);
    }
  }
  
  return shardSQL;
}

// 生成聚合SQL
function generateAggregateSQL(results, originalSQL) {
  if (!results || results.length === 0) return '';
  
  const lowerSQL = originalSQL.toLowerCase();
  
  // 只对SELECT语句生成聚合SQL
  if (!lowerSQL.startsWith('select')) {
    return '';
  }
  
  // 使用UNION ALL连接所有分片SQL
  const shardSQLs = results.map(result => result.sql);
  const aggregateSQL = shardSQLs.map(sql => sql.trim())
    .join('\nUNION ALL\n');
  
  return aggregateSQL;
}

// 显示结果
function displayResults(results, aggregateSQL) {
  const outputContainer = document.getElementById('sql-output');
  
  if (results.length === 0) {
    outputContainer.innerHTML = `
      <div class="empty-state">
        <span class="icon">📝</span>
        <p>输入SQL并配置分片规则，点击生成按钮查看结果</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  // 添加聚合SQL显示
  if (aggregateSQL) {
    html += `
      <div class="sql-result-item aggregate-item">
        <div class="result-header">
          <div class="result-shard">聚合查询 (UNION ALL)</div>
          <div class="result-actions">
            <button class="btn btn-sm btn-primary copy-btn" data-sql="${escapeHtml(aggregateSQL)}">复制</button>
          </div>
        </div>
        <div class="result-sql">${escapeHtml(aggregateSQL)}</div>
      </div>
    `;
  }
  
  // 添加分片SQL显示
  results.forEach((result, index) => {
    html += `
      <div class="sql-result-item">
        <div class="result-header">
          <div class="result-shard">分片 ${result.shardId} (键值: ${result.value})</div>
          <div class="result-actions">
            <button class="btn btn-sm btn-primary copy-btn" data-index="${index}">复制</button>
          </div>
        </div>
        <div class="result-sql">${escapeHtml(result.sql)}</div>
      </div>
    `;
  });
  
  outputContainer.innerHTML = html;
  
  // 绑定复制按钮事件
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.dataset.sql) {
        copySQL(e.target.dataset.sql);
      } else {
        const index = parseInt(e.target.dataset.index);
        copySQL(results[index].sql);
      }
    });
  });
}

// 转义HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 复制SQL
function copySQL(sql) {
  navigator.clipboard.writeText(sql).then(() => {
    alert('SQL已复制到剪贴板');
  }).catch(err => {
    console.error('复制失败:', err);
    alert('复制失败，请手动复制');
  });
}

// 复制全部SQL
function copyAllSQL() {
  const results = document.querySelectorAll('.result-sql');
  if (results.length === 0) {
    alert('没有可复制的SQL');
    return;
  }
  
  const allSQL = Array.from(results).map(el => el.textContent).join('\n\n---\n\n');
  navigator.clipboard.writeText(allSQL).then(() => {
    alert('所有SQL已复制到剪贴板');
  }).catch(err => {
    console.error('复制失败:', err);
    alert('复制失败，请手动复制');
  });
}

// 导出结果
function exportResults() {
  const results = document.querySelectorAll('.result-sql');
  if (results.length === 0) {
    alert('没有可导出的结果');
    return;
  }
  
  const allSQL = Array.from(results).map(el => el.textContent).join('\n\n---\n\n');
  const blob = new Blob([allSQL], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shard-sql-${new Date().toISOString().slice(0, 10)}.sql`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 保存到历史记录
function saveToHistory(sql, config, results, aggregateSQL) {
  const historyItem = {
    id: Date.now(),
    sql: sql,
    config: config,
    results: results,
    aggregateSQL: aggregateSQL,
    timestamp: new Date().toISOString()
  };
  
  appState.history.unshift(historyItem);
  // 保留最近50条记录
  if (appState.history.length > 50) {
    appState.history = appState.history.slice(0, 50);
  }
  
  sessionStorage.setItem('sqlHistory', JSON.stringify(appState.history));
  updateHistoryList();
}

// 更新历史记录列表
function updateHistoryList() {
  const historyList = document.getElementById('history-list');
  
  if (appState.history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <span class="icon">⏰</span>
        <p>暂无历史记录</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  appState.history.forEach(item => {
    const date = new Date(item.timestamp).toLocaleString();
    const preview = item.sql.length > 100 ? item.sql.slice(0, 100) + '...' : item.sql;
    html += `
      <div class="history-item" data-id="${item.id}">
        <h4>${date}</h4>
        <p>${escapeHtml(preview)}</p>
      </div>
    `;
  });
  
  historyList.innerHTML = html;
  
  // 绑定历史记录点击事件
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id);
      loadHistoryItem(id);
    });
  });
}

// 加载历史记录
function loadHistoryItem(id) {
  const item = appState.history.find(h => h.id === id);
  if (!item) return;
  
  document.getElementById('sql-input').value = item.sql;
  document.getElementById('shard-key').value = item.config.shardKey || '';
  
  // 恢复算法配置
  document.getElementById('shard-algorithm').value = item.config.algorithm;
  appState.currentAlgorithm = item.config.algorithm;
  updateAlgorithmParams();
  
  // 恢复算法参数
  // 这里需要根据具体算法参数进行恢复
  
  // 显示结果
  displayResults(item.results, item.aggregateSQL || '');
}

// 清空历史记录
function clearHistory() {
  if (confirm('确定要清空所有历史记录吗？')) {
    appState.history = [];
    sessionStorage.removeItem('sqlHistory');
    updateHistoryList();
  }
}

// 格式化SQL
function formatSQL() {
  const sqlInput = document.getElementById('sql-input');
  let sql = sqlInput.value;
  
  // 简单的SQL格式化，实际项目中应使用更完善的格式化库
  sql = sql.replace(/\s+/g, ' ');
  sql = sql.replace(/SELECT\s+/i, 'SELECT ');
  sql = sql.replace(/FROM\s+/i, '\nFROM ');
  sql = sql.replace(/WHERE\s+/i, '\nWHERE ');
  sql = sql.replace(/AND\s+/gi, '\nAND ');
  sql = sql.replace(/OR\s+/gi, '\nOR ');
  sql = sql.replace(/JOIN\s+/i, '\nJOIN ');
  sql = sql.replace(/GROUP\s+BY\s+/i, '\nGROUP BY ');
  sql = sql.replace(/ORDER\s+BY\s+/i, '\nORDER BY ');
  sql = sql.replace(/LIMIT\s+/i, '\nLIMIT ');
  
  sqlInput.value = sql;
}

// 清空所有
function clearAll() {
  document.getElementById('sql-input').value = '';
  document.getElementById('shard-key').value = '';
  document.getElementById('shard-values').value = '';
  document.getElementById('sql-output').innerHTML = `
    <div class="empty-state">
      <span class="icon">📝</span>
      <p>输入SQL并配置分片规则，点击生成按钮查看结果</p>
    </div>
  `;
}

// 管理脚本
function manageScripts() {
  const scriptsHtml = appState.scripts.map(script => `
    <div class="script-item" data-id="${script.id}">
      <h4>${escapeHtml(script.name)}</h4>
      <p>${escapeHtml(script.description || '无描述')}</p>
      <div style="margin-top: 0.5rem;">
        <button class="btn btn-sm btn-primary edit-script" data-id="${script.id}">编辑</button>
        <button class="btn btn-sm btn-secondary delete-script" data-id="${script.id}">删除</button>
      </div>
    </div>
  `).join('');
  
  const modalContent = `
    <h4>脚本管理</h4>
    <div style="margin-bottom: 1rem;">
      <button id="add-script-btn" class="btn btn-primary">添加新脚本</button>
    </div>
    <div id="scripts-list">
      ${scriptsHtml || '<div class="empty-state"><span class="icon">📁</span><p>暂无自定义脚本</p></div>'}
    </div>
  `;
  
  showModal('脚本管理', modalContent);
  
  // 绑定新增脚本按钮事件
  document.getElementById('add-script-btn').addEventListener('click', addScript);
  
  // 绑定编辑脚本按钮事件
  document.querySelectorAll('.edit-script').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      editScript(id);
    });
  });
  
  // 绑定删除脚本按钮事件
  document.querySelectorAll('.delete-script').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      deleteScript(id);
    });
  });
}

// 添加脚本
function addScript() {
  const modalContent = `
    <h4>添加自定义脚本</h4>
    <div class="form-group">
      <label for="script-name">脚本名称</label>
      <input type="text" id="script-name" class="form-control" placeholder="如：自定义哈希算法">
    </div>
    <div class="form-group">
      <label for="script-description">脚本描述</label>
      <input type="text" id="script-description" class="form-control" placeholder="脚本功能描述">
    </div>
    <div class="form-group">
      <label for="script-code">脚本代码</label>
      <textarea id="script-code" class="form-control" rows="8" placeholder="// 输入JavaScript代码，必须返回分片ID\n// 示例：\nfunction shard(value) {\n  return parseInt(value) % 8;\n}\nreturn shard(value);"></textarea>
    </div>
    <div class="form-actions">
      <button id="save-script" class="btn btn-primary">保存</button>
    </div>
  `;
  
  showModal('添加脚本', modalContent);
  
  // 绑定保存按钮事件
  document.getElementById('save-script').addEventListener('click', () => {
    const name = document.getElementById('script-name').value.trim();
    const description = document.getElementById('script-description').value.trim();
    const code = document.getElementById('script-code').value.trim();
    
    if (!name) {
      alert('请输入脚本名称');
      return;
    }
    
    if (!code) {
      alert('请输入脚本代码');
      return;
    }
    
    // 验证脚本语法
    try {
      new Function('value', code);
    } catch (e) {
      alert('脚本语法错误: ' + e.message);
      return;
    }
    
    // 保存脚本
    const script = {
      id: Date.now().toString(),
      name: name,
      description: description,
      code: code,
      createdAt: new Date().toISOString()
    };
    
    appState.scripts.push(script);
    sessionStorage.setItem('customScripts', JSON.stringify(appState.scripts));
    
    closeModal();
    updateScriptList();
    alert('脚本保存成功');
  });
}

// 编辑脚本
function editScript(id) {
  const script = appState.scripts.find(s => s.id === id);
  if (!script) return;
  
  const modalContent = `
    <h4>编辑脚本</h4>
    <div class="form-group">
      <label for="script-name">脚本名称</label>
      <input type="text" id="script-name" class="form-control" value="${escapeHtml(script.name)}">
    </div>
    <div class="form-group">
      <label for="script-description">脚本描述</label>
      <input type="text" id="script-description" class="form-control" value="${escapeHtml(script.description || '')}">
    </div>
    <div class="form-group">
      <label for="script-code">脚本代码</label>
      <textarea id="script-code" class="form-control" rows="8">${escapeHtml(script.code)}</textarea>
    </div>
    <div class="form-actions">
      <button id="update-script" class="btn btn-primary">更新</button>
    </div>
  `;
  
  showModal('编辑脚本', modalContent);
  
  // 绑定更新按钮事件
  document.getElementById('update-script').addEventListener('click', () => {
    const name = document.getElementById('script-name').value.trim();
    const description = document.getElementById('script-description').value.trim();
    const code = document.getElementById('script-code').value.trim();
    
    if (!name) {
      alert('请输入脚本名称');
      return;
    }
    
    if (!code) {
      alert('请输入脚本代码');
      return;
    }
    
    // 验证脚本语法
    try {
      new Function('value', code);
    } catch (e) {
      alert('脚本语法错误: ' + e.message);
      return;
    }
    
    // 更新脚本
    Object.assign(script, {
      name: name,
      description: description,
      code: code,
      updatedAt: new Date().toISOString()
    });
    
    sessionStorage.setItem('customScripts', JSON.stringify(appState.scripts));
    
    closeModal();
    updateScriptList();
    alert('脚本更新成功');
  });
}

// 删除脚本
function deleteScript(id) {
  if (confirm('确定要删除这个脚本吗？')) {
    appState.scripts = appState.scripts.filter(s => s.id !== id);
    sessionStorage.setItem('customScripts', JSON.stringify(appState.scripts));
    updateScriptList();
    manageScripts(); // 刷新脚本管理界面
    alert('脚本删除成功');
  }
}

// 更新脚本列表
function updateScriptList() {
  const customScriptSelect = document.getElementById('custom-script');
  
  // 清空现有选项
  customScriptSelect.innerHTML = '<option value="">请选择脚本</option>';
  
  // 添加脚本选项
  appState.scripts.forEach(script => {
    const option = document.createElement('option');
    option.value = script.id;
    option.textContent = script.name;
    customScriptSelect.appendChild(option);
  });
}

// 初始化应用
window.addEventListener('DOMContentLoaded', initApp);
