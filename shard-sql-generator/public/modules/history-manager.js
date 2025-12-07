// 历史记录管理模块
const HistoryManager = (() => {
    let history = [];

    const loadHistory = () => {
        history = JSON.parse(localStorage.getItem('sqlHistory')) || [];
        updateHistoryList();
    };

    const addToHistory = (shardSQL, aggregateSQL, originalSQL, shardKey, shardKeyValues, shardAlgorithm, config) => {
        const historyItem = {
            id: Date.now(),
            originalSQL,
            shardKey,
            shardKeyValues,
            shardAlgorithm,
            config, // 保存完整的配置对象
            shardSQL,
            aggregateSQL,
            timestamp: new Date().toISOString()
        };

        // 限制历史记录数量
        history.unshift(historyItem);
        if (history.length > 20) {
            history = history.slice(0, 20);
        }

        localStorage.setItem('sqlHistory', JSON.stringify(history));
        updateHistoryList();
    };

    const updateHistoryList = () => {
        const list = document.getElementById('history-list');
        if (!list) return;
        
        list.innerHTML = '';

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-info">
                    <div class="history-sql">${Utils.escapeHtml(item.originalSQL.substring(0, 80))}${item.originalSQL.length > 80 ? '...' : ''}</div>
                    <div class="history-meta">
                        分片键: ${Utils.escapeHtml(item.shardKey)} | 值: ${Utils.escapeHtml(item.shardKeyValues)} | 
                        算法: ${Utils.escapeHtml(item.shardAlgorithm)} | ${new Date(item.timestamp).toLocaleString()}
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary btn-sm" onclick="HistoryManager.loadHistoryItem('${item.id}')">加载</button>
                    <button class="btn btn-danger btn-sm" onclick="HistoryManager.deleteHistoryItem('${item.id}')">删除</button>
                </div>
            `;
            list.appendChild(li);
        });
    };

    const loadHistoryItem = (id) => {
        const item = history.find(h => h.id.toString() === id);
        if (item) {
            // 加载基础配置
            document.getElementById('sql-input').value = item.originalSQL;
            document.getElementById('shard-key').value = item.shardKey;
            document.getElementById('shard-values').value = item.shardKeyValues;
            document.getElementById('shard-algorithm').value = item.shardAlgorithm;
            
            // 加载算法参数
            if (item.config) {
                // 根据算法类型设置相应的参数
                switch (item.shardAlgorithm) {
                    case 'mod':
                        if (item.config.modValue) {
                            document.getElementById('mod-value').value = item.config.modValue;
                        }
                        break;
                    case 'range':
                        if (item.config.rangeRules) {
                            document.getElementById('range-rules').value = JSON.stringify(item.config.rangeRules, null, 2);
                        }
                        break;
                    case 'hash':
                        if (item.config.hashAlgorithm) {
                            document.getElementById('hash-algorithm').value = item.config.hashAlgorithm;
                        }
                        if (item.config.hashShards) {
                            document.getElementById('hash-shards').value = item.config.hashShards;
                        }
                        break;
                    case 'consistent-hash':
                        if (item.config.nodes) {
                            document.getElementById('consistent-nodes').value = item.config.nodes;
                        }
                        if (item.config.virtualNodes) {
                            document.getElementById('consistent-virtual').value = item.config.virtualNodes;
                        }
                        break;
                    case 'date':
                        if (item.config.dateFormat) {
                            document.getElementById('date-format').value = item.config.dateFormat;
                        }
                        break;
                    case 'custom':
                        if (item.config.script) {
                            document.getElementById('custom-script').value = item.config.script;
                        }
                        break;
                }
            }
            
            // 更新算法字段显示
            ShardAlgorithm.updateAlgorithmFields();
            
            Utils.showMessage('提示', '历史记录已加载');
        }
    };

    const deleteHistoryItem = (id) => {
        history = history.filter(h => h.id.toString() !== id);
        localStorage.setItem('sqlHistory', JSON.stringify(history));
        updateHistoryList();
    };

    const clearHistory = () => {
        if (confirm('确定要清除所有历史记录吗？')) {
            history = [];
            localStorage.removeItem('sqlHistory');
            updateHistoryList();
            Utils.showMessage('提示', '历史记录已清除');
        }
    };

    return {
        loadHistory,
        addToHistory,
        loadHistoryItem,
        deleteHistoryItem,
        clearHistory,
        updateHistoryList
    };
})();
