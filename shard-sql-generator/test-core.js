// 测试核心功能模块

const sqlGenerator = require('./core/sql-generator');
const scriptManager = require('./core/script-manager');

console.log('=== 开始测试分片SQL生成器核心功能 ===\n');

// 测试取模算法
console.log('1. 测试取模算法:');
const modResult = sqlGenerator.shardAlgorithms.mod('123456', { mod: 10 });
console.log(`   路由值: 123456, 取模值: 10, 结果: ${modResult}`);

// 测试哈希算法
console.log('\n2. 测试哈希算法:');
const hashResult = sqlGenerator.shardAlgorithms.hash('user_123', { numShards: 8, hashAlgorithm: 'md5' });
console.log(`   路由值: user_123, 路由数量: 8, 结果: ${hashResult}`);

// 测试生成路由SQL
console.log('\n3. 测试生成路由SQL:');
const originalSQL = 'SELECT * FROM users WHERE user_id = ? AND status = 1';
const shardSQL = sqlGenerator.generateShardSQL(originalSQL, 'user_id', '123456', 5);
console.log(`   原始SQL: ${originalSQL}`);
console.log(`   路由SQL: ${shardSQL}`);

// 测试SQL格式化
console.log('\n4. 测试SQL格式化:');
const formattedSQL = sqlGenerator.formatSQL(originalSQL);
console.log(`   格式化后的SQL:`);
console.log(`   ${formattedSQL}`);

// 测试批量生成SQL
console.log('\n5. 测试批量生成SQL:');
const batchParams = {
  sql: 'SELECT * FROM users WHERE user_id = ?',
  shardKey: 'user_id',
  shardValues: ['1001', '2002', '3003'],
  algorithm: 'mod',
  algorithmConfig: { mod: 10 }
};

const batchResults = sqlGenerator.generateBatchSQL(batchParams);
batchResults.forEach((result, index) => {
  console.log(`   ${index + 1}. 值: ${result.value}, 路由ID: ${result.shardId}`);
  console.log(`      SQL: ${result.sql}`);
});

console.log('\n=== 核心功能测试完成 ===\n');

// 测试脚本管理器
console.log('=== 开始测试脚本管理器 ===\n');

// 测试获取所有脚本
async function testScriptManager() {
  console.log('1. 测试获取所有脚本:');
  const scripts = await scriptManager.getAllScripts();
  console.log(`   找到 ${scripts.length} 个脚本:`);
  scripts.forEach(script => {
    console.log(`   - ${script.name} (${script.type})`);
  });
  
  console.log('\n=== 脚本管理器测试完成 ===');
}

testScriptManager();
