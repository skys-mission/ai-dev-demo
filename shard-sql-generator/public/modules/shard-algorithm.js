// 分片算法处理模块
const ShardAlgorithm = (() => {
    // 刷新自定义脚本选择器
    const refreshCustomScripts = async () => {
        const scriptSelect = document.getElementById('custom-script');
        
        try {
            // 获取所有脚本
            const scripts = await ScriptManager.loadScripts();
            
            // 清空现有选项（保留默认选项）
            while (scriptSelect.options.length > 1) {
                scriptSelect.remove(1);
            }
            
            // 确保scripts是数组
            if (Array.isArray(scripts)) {
                // 添加自定义脚本选项
                scripts.forEach(script => {
                    if (script.id !== 'built-in') {
                        const option = document.createElement('option');
                        option.value = script.id;
                        option.textContent = script.name;
                        scriptSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            Utils.showMessage('错误', '加载自定义脚本失败: ' + error.message, 'error');
        }
    };
    
    const calculateShardId = async () => {
        const value = document.getElementById('shard-key-value').value.trim();
        const algorithm = document.getElementById('shard-algorithm').value;
        
        if (!value) {
            Utils.showMessage('提示', '请输入分片键值');
            return;
        }

        try {
            // 收集算法参数
            const params = {
                value,
                algorithm,
                config: getAlgorithmConfig()
            };

            const response = await fetch('/api/calculate-shard', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error('计算分片ID失败');
            }

            const result = await response.json();
            document.getElementById('shard-id-result').textContent = `分片ID: ${result.shardId}`;
        } catch (error) {
            Utils.showMessage('错误', '计算分片ID失败: ' + error.message, 'error');
        }
    };

    // 获取当前算法配置
    const getAlgorithmConfig = () => {
        const algorithm = document.getElementById('shard-algorithm').value;
        const config = {};

        // 根据不同算法收集参数
        switch (algorithm) {
            case 'mod':
                config.modValue = parseInt(document.getElementById('mod-value').value) || 4;
                break;
            case 'range':
                try {
                    config.rangeRules = JSON.parse(document.getElementById('range-rules').value.trim());
                } catch (e) {
                    config.rangeRules = {};
                }
                break;
            case 'hash':
                config.hashAlgorithm = document.getElementById('hash-algorithm').value;
                config.hashShards = parseInt(document.getElementById('hash-shards').value) || 4;
                break;
            case 'consistent-hash':
                config.nodes = parseInt(document.getElementById('consistent-nodes').value) || 4;
                config.virtualNodes = parseInt(document.getElementById('consistent-virtual').value) || 100;
                break;
            case 'date':
                config.dateFormat = document.getElementById('date-format').value;
                break;
            case 'custom':
                // 获取自定义脚本
                let customScript = document.getElementById('custom-script').value;
                // 如果是脚本ID，获取实际脚本内容
                if (customScript && !customScript.includes('function')) {
                    const script = ScriptManager.getScriptById(customScript);
                    if (script) {
                        customScript = script.script;
                    }
                }
                config.script = customScript;
                break;
        }

        return config;
    };

    // 设置算法配置
    const setAlgorithmConfig = (algorithm, config) => {
        // 设置算法选择
        document.getElementById('shard-algorithm').value = algorithm;

        // 更新算法参数显示
        updateAlgorithmFields();

        // 根据不同算法设置参数
        switch (algorithm) {
            case 'mod':
                if (config.modValue) {
                    document.getElementById('mod-value').value = config.modValue;
                }
                break;
            case 'range':
                if (config.rangeRules) {
                    document.getElementById('range-rules').value = JSON.stringify(config.rangeRules, null, 2);
                }
                break;
            case 'hash':
                if (config.hashAlgorithm) {
                    document.getElementById('hash-algorithm').value = config.hashAlgorithm;
                }
                if (config.hashShards) {
                    document.getElementById('hash-shards').value = config.hashShards;
                }
                break;
            case 'consistent-hash':
                if (config.nodes) {
                    document.getElementById('consistent-nodes').value = config.nodes;
                }
                if (config.virtualNodes) {
                    document.getElementById('consistent-virtual').value = config.virtualNodes;
                }
                break;
            case 'date':
                if (config.dateFormat) {
                    document.getElementById('date-format').value = config.dateFormat;
                }
                break;
            case 'custom':
                // 如果是自定义脚本，先确保脚本选择器已加载所有脚本
                refreshCustomScripts().then(() => {
                    if (config.script) {
                        document.getElementById('custom-script').value = config.script;
                    }
                });
                break;
        }
    };

    // 更新算法字段显示
    const updateAlgorithmFields = () => {
        const algorithm = document.getElementById('shard-algorithm').value;
        const paramsGroups = document.querySelectorAll('.params-group');
        
        // 隐藏所有参数组
        paramsGroups.forEach(group => {
            group.style.display = 'none';
        });
        
        // 显示当前算法的参数组
        const currentParamsGroup = document.querySelector(`.params-group[data-algorithm="${algorithm}"]`);
        if (currentParamsGroup) {
            currentParamsGroup.style.display = 'block';
        }
    };

    const validateRangeRules = () => {
        const rangeRules = document.getElementById('range-rules').value.trim();
        
        if (!rangeRules) return true;
        
        try {
            const rules = JSON.parse(rangeRules);
            if (!rules.rules || !Array.isArray(rules.rules)) {
                Utils.showMessage('错误', '范围规则必须是包含rules数组的JSON格式', 'error');
                return false;
            }
            
            rules.rules.forEach(rule => {
                if (!rule.min && rule.min !== 0 || !rule.max && rule.max !== 0 || !rule.shard) {
                    throw new Error('每条规则必须包含min、max和shard字段');
                }
            });
            
            return true;
        } catch (error) {
            Utils.showMessage('错误', '范围规则JSON格式错误: ' + error.message, 'error');
            return false;
        }
    };

    // 导出分片规则
    const exportRule = () => {
        try {
            // 收集完整的分片规则
            const rule = {
                algorithm: document.getElementById('shard-algorithm').value,
                config: getAlgorithmConfig(),
                shardKey: document.getElementById('shard-key').value,
                shardValues: document.getElementById('shard-values').value,
                originalSql: document.getElementById('sql-input').value,
                exportDate: new Date().toISOString()
            };

            // 创建JSON文件
            const dataStr = JSON.stringify(rule, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = `shard-rule-${new Date().getTime()}.json`;
            link.click();

            // 清理
            URL.revokeObjectURL(url);

            Utils.showMessage('成功', '分片规则已导出');
        } catch (error) {
            Utils.showMessage('错误', '导出分片规则失败: ' + error.message, 'error');
        }
    };

    // 导入分片规则
    const importRule = () => {
        document.getElementById('import-file').click();
    };

    // 处理文件导入
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rule = JSON.parse(e.target.result);

                // 验证规则格式
                if (!rule.algorithm) {
                    throw new Error('无效的分片规则格式');
                }

                // 应用规则
                setAlgorithmConfig(rule.algorithm, rule.config);
                
                // 设置其他字段
                if (rule.shardKey) {
                    document.getElementById('shard-key').value = rule.shardKey;
                }
                if (rule.shardValues) {
                    document.getElementById('shard-values').value = rule.shardValues;
                }
                if (rule.originalSql) {
                    document.getElementById('sql-input').value = rule.originalSql;
                }

                Utils.showMessage('成功', '分片规则已导入');
            } catch (error) {
                Utils.showMessage('错误', '导入分片规则失败: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);

        // 清空文件输入
        event.target.value = '';
    };

    // 绑定事件
    const bindEvents = () => {
        // 绑定算法选择事件
        document.getElementById('shard-algorithm').addEventListener('change', updateAlgorithmFields);
        
        // 绑定导入/导出事件
        document.getElementById('export-rule-btn').addEventListener('click', exportRule);
        document.getElementById('import-rule-btn').addEventListener('click', importRule);
        document.getElementById('import-file').addEventListener('change', handleFileImport);
        
        // 绑定脚本管理事件
        bindScriptManagerEvents();
    };

    // 初始化
    const init = async () => {
        updateAlgorithmFields();
        bindEvents();
        await refreshCustomScripts();
    };
    
    // 绑定脚本管理按钮事件
    const bindScriptManagerEvents = () => {
        // 管理脚本按钮
        document.getElementById('manage-scripts')?.addEventListener('click', async () => {
            // 打开脚本管理面板
            await ScriptManager.showScriptManager();
            // 刷新脚本选择器
            await refreshCustomScripts();
        });
    };

    return {
        calculateShardId,
        updateAlgorithmFields,
        validateRangeRules,
        exportRule,
        importRule,
        init,
        refreshCustomScripts
    };
})();
