const sqlGenerator = require('./core/sql-generator');

// 创建一个测试用例，多个路由值落在同一个路由上
const batchParams = {
  sql: 'SELECT * FROM users WHERE user_id = ?',
  shardKey: 'user_id',
  shardValues: ['1001', '1002', '1003', '2001', '2002', '3001'],
  algorithm: 'mod',
  algorithmConfig: { mod: 10 }
};

console.log('=== 测试同一路由SQL合并功能 ===');
console.log('原始SQL:', batchParams.sql);
console.log('路由键:', batchParams.shardKey);
console.log('路由值:', batchParams.shardValues);
console.log('算法:', batchParams.algorithm);
console.log('算法配置:', batchParams.algorithmConfig);

const batchResults = sqlGenerator.generateBatchSQL(batchParams);

// 按路由ID分组显示结果
const shardGroups = {};
batchResults.forEach(result => {
  if (!shardGroups[result.shardId]) {
    shardGroups[result.shardId] = { values: [], sql: result.sql };
  }
  shardGroups[result.shardId].values.push(result.value);
});

console.log('\n合并后的结果:');
for (const shardId in shardGroups) {
  const group = shardGroups[shardId];
  console.log('\n路由ID:', shardId);
  console.log('包含值:', group.values.join(', '));
  console.log('合并SQL:', group.sql);
}