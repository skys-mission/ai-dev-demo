// SQL处理模块
const SQLHandler = (() => {
    const generateShardSQL = async () => {
        console.log('SQLHandler.generateShardSQL()开始执行');
        const sqlStatement = document.getElementById('sql-input').value.trim();
        const shardKey = document.getElementById('shard-key').value.trim();
        const shardKeyValues = document.getElementById('shard-values').value.trim();
        const shardAlgorithm = document.getElementById('shard-algorithm').value;
        let customScript = document.getElementById('custom-script').value.trim();
        
        // 如果使用自定义算法，获取对应的脚本内容
        if (shardAlgorithm === 'custom' && customScript) {
            const script = ScriptManager.getScriptById(customScript);
            if (script) {
                customScript = script.script;
            }
        }
        
        const rangeRules = document.getElementById('range-rules').value.trim();
        console.log('获取表单数据:', { sqlStatement, shardKey, shardKeyValues, shardAlgorithm });
        

        if (!sqlStatement) {
            console.log('检查失败: SQL语句为空');
            Utils.showMessage('提示', '请输入SQL语句', 'info');
            return;
        }
        console.log('检查通过: SQL语句不为空');

        if (!shardKey) {
            console.log('检查失败: 分片键为空');
            Utils.showMessage('提示', '请输入分片键', 'info');
            return;
        }
        console.log('检查通过: 分片键不为空');

        if (!shardKeyValues) {
            console.log('检查失败: 分片键值为空');
            Utils.showMessage('提示', '请输入分片键值', 'info');
            return;
        }
        console.log('检查通过: 分片键值不为空');

        // 获取算法参数
        let algorithmParams = {};
        if (shardAlgorithm === 'mod') {
            algorithmParams.modValue = parseInt(document.getElementById('mod-value').value) || 4;
        } else if (shardAlgorithm === 'range') {
            try {
                algorithmParams.rangeRules = JSON.parse(rangeRules);
            } catch (error) {
                Utils.showMessage('错误', '范围规则JSON格式错误', 'error');
                return;
            }
        } else if (shardAlgorithm === 'hash') {
            algorithmParams.hashAlgorithm = document.getElementById('hash-algorithm').value;
            algorithmParams.shardTotal = parseInt(document.getElementById('hash-shards').value) || 4;
        } else if (shardAlgorithm === 'consistent-hash') {
            algorithmParams.physicalNodes = parseInt(document.getElementById('consistent-nodes').value) || 4;
            algorithmParams.virtualNodes = parseInt(document.getElementById('consistent-virtual').value) || 100;
        } else if (shardAlgorithm === 'date') {
            algorithmParams.dateFormat = document.getElementById('date-format').value;
        }

        try {
            const requestData = {
                sql: sqlStatement,
                shardKey,
                shardKeyValues: shardKeyValues.split('\n').map(v => v.trim()).filter(v => v),
                shardAlgorithm,
                customScript,
                algorithmParams
            };
            console.log('准备发送请求到/api/generate:', requestData);
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            console.log('收到响应:', response);

            if (!response.ok) {
                throw new Error(`生成SQL失败，状态码: ${response.status}`);
            }

            const result = await response.json();
            console.log('响应数据:', result);
            
            displayGeneratedSQL(result.shardSQL, result.aggregateSQL);
            
            // 保存到历史记录
            HistoryManager.addToHistory(
                result.shardSQL, 
                result.aggregateSQL, 
                sqlStatement, 
                shardKey, 
                shardKeyValues, 
                shardAlgorithm,
                algorithmParams // 作为config参数保存
            );
        } catch (error) {
            Utils.showMessage('错误', '生成SQL失败: ' + error.message, 'error');
        }
    };

    const displayGeneratedSQL = (shardSQL, aggregateSQL) => {
        const resultContainer = document.getElementById('sql-output');
        resultContainer.innerHTML = '';

        // 首先显示聚合SQL（移到上面）
        if (aggregateSQL) {
            const aggregateItem = document.createElement('div');
            aggregateItem.className = 'aggregate-item';
            aggregateItem.innerHTML = `
                <div class="result-header">
                    <span class="result-shard">聚合SQL</span>
                    <button class="copy-btn modern-copy-btn"><span class="icon">📋</span>复制</button>
                </div>
                <div class="result-sql">
                    <pre><code class="language-sql">${Utils.escapeHtml(aggregateSQL)}</code></pre>
                </div>
            `;
            resultContainer.appendChild(aggregateItem);
            
            // 添加复制事件监听器
            const copyBtn = aggregateItem.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                copyToClipboard(aggregateSQL, '聚合SQL已复制');
            });
            
            // 应用语法高亮
            hljs.highlightElement(aggregateItem.querySelector('code'));
        }

        // 然后显示分片SQL
        shardSQL.forEach((sql, index) => {
            const sqlItem = document.createElement('div');
            sqlItem.className = 'sql-result-item';
            sqlItem.innerHTML = `
                <div class="result-header">
                    <span class="result-shard">分片 ${index + 1}</span>
                    <button class="copy-btn modern-copy-btn"><span class="icon">📋</span>复制</button>
                </div>
                <div class="result-sql">
                    <pre><code class="language-sql">${Utils.escapeHtml(sql)}</code></pre>
                </div>
            `;
            resultContainer.appendChild(sqlItem);
            
            // 添加复制事件监听器
            const copyBtn = sqlItem.querySelector('.copy-btn');
            copyBtn.addEventListener('click', () => {
                copyToClipboard(sql, `分片 ${index + 1} SQL已复制`);
            });
            
            // 应用语法高亮
            hljs.highlightElement(sqlItem.querySelector('code'));
        });
    };

    const copyToClipboard = (text, successMessage) => {
        if (!text) {
            Utils.showMessage('提示', '没有可复制的内容', 'info');
            return;
        }

        navigator.clipboard.writeText(text)
            .then(() => {
                // 显示一个短暂的复制成功提示，而不是模态框
                const tempToast = document.createElement('div');
                tempToast.className = 'toast toast-success show';
                tempToast.textContent = '已复制!';
                document.body.appendChild(tempToast);
                
                // 3秒后自动移除提示
                setTimeout(() => {
                    tempToast.classList.remove('show');
                    // 等待过渡效果完成后再移除元素
                    setTimeout(() => {
                        document.body.removeChild(tempToast);
                    }, 300);
                }, 2000);
            })
            .catch(err => {
                Utils.showMessage('提示', '复制失败: ' + err.message, 'error');
            });
    };

    // 复制所有SQL
    const copyAllSQL = () => {
        const sqlItems = document.querySelectorAll('.result-sql pre code');
        if (sqlItems.length === 0) {
            Utils.showMessage('提示', '没有可复制的内容', 'info');
            return;
        }
        
        const allSQL = Array.from(sqlItems).map(item => item.textContent).join('\n\n');
        
        copyToClipboard(allSQL, '所有SQL已复制');
    };

    // 导出结果
    const exportResults = () => {
        const sqlItems = document.querySelectorAll('.result-sql pre code');
        if (sqlItems.length === 0) {
            Utils.showMessage('提示', '没有可导出的结果', 'info');
            return;
        }
        
        const allSQL = Array.from(sqlItems).map(item => item.textContent).join('\n\n');
        const blob = new Blob([allSQL], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `shard-sql-${new Date().getTime()}.sql`;
        a.click();
        
        URL.revokeObjectURL(url);
        Utils.showMessage('提示', '结果已导出', 'success');
    };

    // 格式化SQL
    const formatSQL = () => {
        // 简单的SQL格式化实现
        const sqlInput = document.getElementById('sql-input');
        let sql = sqlInput.value.trim();
        
        if (!sql) {
            Utils.showMessage('提示', '请输入SQL语句', 'info');
            return;
        }
        
        // 简单的格式化规则
        sql = sql.replace(/\b(SELECT|FROM|WHERE|AND|OR|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|LIMIT|OFFSET|INSERT|UPDATE|DELETE|SET|VALUES)\b/g, '\n$1');
        sql = sql.replace(/\,/g, ',\n  ');
        
        sqlInput.value = sql;
        Utils.showMessage('提示', 'SQL已格式化', 'success');
    };

    return {
        generateShardSQL,
        displayGeneratedSQL,
        copyToClipboard,
        copyAllSQL,
        exportResults,
        formatSQL
    };
})();
