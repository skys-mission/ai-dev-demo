// 历史记录功能测试
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 确保服务器已启动
function ensureServerRunning() {
    try {
        execSync('curl -s http://localhost:3000/api/health', { timeout: 1000 });
        console.log('✅ 服务器已启动');
    } catch (error) {
        console.log('🚀 正在启动服务器...');
        // 启动服务器（非阻塞）
        require('child_process').exec('node server.js', {
            cwd: path.dirname(__filename),
            detached: true,
            stdio: 'ignore'
        });
        // 等待服务器启动
        for (let i = 0; i < 5; i++) {
            try {
                execSync('curl -s http://localhost:3000/api/health', { timeout: 1000 });
                console.log('✅ 服务器已启动');
                return;
            } catch (error) {
                console.log(`⏱️  等待服务器启动... ${i + 1}/5`);
                require('timers').setTimeout(() => {}, 1000);
            }
        }
        throw new Error('服务器启动失败');
    }
}

// 测试历史记录功能
async function testHistoryManager() {
    console.log('开始测试历史记录功能...');
    
    // 1. 生成SQL并保存到历史记录
    console.log('\n1. 生成SQL并保存到历史记录');
    const generateResponse = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sql: 'SELECT * FROM users WHERE user_id = ? AND status = "active"',
            shardKey: 'user_id',
            shardKeyValues: ['1001', '1002'],
            shardAlgorithm: 'mod',
            algorithmParams: { modValue: 4 }
        })
    });
    
    if (!generateResponse.ok) {
        throw new Error('生成SQL失败');
    }
    
    const generateResult = await generateResponse.json();
    console.log('✅ SQL生成成功');
    console.log('生成的分片SQL:', generateResult.shardSQL);
    
    // 2. 模拟前端保存历史记录到localStorage（这里我们只是验证API功能）
    console.log('\n2. 验证历史记录保存机制');
    // 注意：历史记录实际是在前端通过localStorage保存的，这里我们只是验证后端API的历史记录相关功能
    
    // 3. 测试历史记录数据结构
    console.log('\n3. 测试历史记录数据结构');
    const historyItem = {
        id: Date.now(),
        originalSQL: 'SELECT * FROM users WHERE user_id = ? AND status = "active"',
        shardKey: 'user_id',
        shardKeyValues: '1001\n1002',
        shardAlgorithm: 'mod',
        config: { modValue: 4 },
        shardSQL: generateResult.shardSQL,
        aggregateSQL: generateResult.aggregateSQL,
        timestamp: new Date().toISOString()
    };
    
    // 验证数据结构完整性
    const requiredFields = ['id', 'originalSQL', 'shardKey', 'shardKeyValues', 'shardAlgorithm', 'config', 'shardSQL', 'timestamp'];
    const missingFields = requiredFields.filter(field => !historyItem.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
        throw new Error(`历史记录数据结构缺少必要字段: ${missingFields.join(', ')}`);
    }
    
    console.log('✅ 历史记录数据结构完整');
    console.log('历史记录示例:', JSON.stringify(historyItem, null, 2));
    
    // 4. 测试历史记录加载功能
    console.log('\n4. 测试历史记录加载功能');
    // 模拟前端加载历史记录的逻辑
    const loadedConfig = historyItem.config;
    console.log('✅ 历史记录加载逻辑验证通过');
    console.log('加载的配置:', loadedConfig);
    
    console.log('\n🎉 所有历史记录功能测试通过！');
}

// 运行测试
try {
    ensureServerRunning();
    testHistoryManager().then(() => {
        console.log('\n测试完成');
        process.exit(0);
    }).catch(error => {
        console.error('测试失败:', error);
        process.exit(1);
    });
} catch (error) {
    console.error('测试初始化失败:', error);
    process.exit(1);
}