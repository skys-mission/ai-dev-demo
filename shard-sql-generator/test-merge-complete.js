// 完整测试SQL合并功能
const { generateBatchSQL } = require('./core/sql-generator');

console.log('=== 完整测试SQL合并功能 ===\n');

// 测试用例1: 基本SELECT语句
console.log('测试用例1: 基本SELECT语句');
const sql1 = 'SELECT * FROM users WHERE user_id = ?';
const shardKey1 = 'user_id';
const shardValues1 = ['1001', '2001', '3001', '1002', '2002', '1003'];
const result1 = generateBatchSQL({ 
  sql: sql1, 
  shardKey: shardKey1, 
  shardValues: shardValues1, 
  algorithm: 'mod', 
  algorithmConfig: { mod: 10 } 
});

console.log('路由ID分组:');
const groupedByShard1 = result1.reduce((acc, item) => {
  if (!acc[item.shardId]) {
    acc[item.shardId] = { values: [], sql: item.sql };
  }
  acc[item.shardId].values.push(item.value);
  return acc;
}, {});

Object.keys(groupedByShard1).forEach(shardId => {
  const group = groupedByShard1[shardId];
  console.log(`路由ID: ${shardId}`);
  console.log(`包含值: ${group.values.join(', ')}`);
  console.log(`合并SQL: ${group.sql}\n`);
});

// 测试用例2: 包含其他条件的SELECT语句
console.log('测试用例2: 包含其他条件的SELECT语句');
const sql2 = 'SELECT name, email FROM users WHERE user_id = ? AND status = 1';
const result2 = generateBatchSQL({ 
  sql: sql2, 
  shardKey: shardKey1, 
  shardValues: shardValues1, 
  algorithm: 'mod', 
  algorithmConfig: { mod: 10 } 
});

const groupedByShard2 = result2.reduce((acc, item) => {
  if (!acc[item.shardId]) {
    acc[item.shardId] = { values: [], sql: item.sql };
  }
  acc[item.shardId].values.push(item.value);
  return acc;
}, {});

Object.keys(groupedByShard2).forEach(shardId => {
  const group = groupedByShard2[shardId];
  console.log(`路由ID: ${shardId}`);
  console.log(`包含值: ${group.values.join(', ')}`);
  console.log(`合并SQL: ${group.sql}\n`);
});

// 测试用例3: UPDATE语句
console.log('测试用例3: UPDATE语句');
const sql3 = 'UPDATE users SET status = 0 WHERE user_id = ? AND last_login < DATE_SUB(NOW(), INTERVAL 30 DAY)';
const result3 = generateBatchSQL({ 
  sql: sql3, 
  shardKey: shardKey1, 
  shardValues: shardValues1, 
  algorithm: 'mod', 
  algorithmConfig: { mod: 10 } 
});

const groupedByShard3 = result3.reduce((acc, item) => {
  if (!acc[item.shardId]) {
    acc[item.shardId] = { values: [], sql: item.sql };
  }
  acc[item.shardId].values.push(item.value);
  return acc;
}, {});

Object.keys(groupedByShard3).forEach(shardId => {
  const group = groupedByShard3[shardId];
  console.log(`路由ID: ${shardId}`);
  console.log(`包含值: ${group.values.join(', ')}`);
  console.log(`合并SQL: ${group.sql}\n`);
});

// 测试用例4: DELETE语句
console.log('测试用例4: DELETE语句');
const sql4 = 'DELETE FROM users WHERE user_id = ? AND status = 0';
const result4 = generateBatchSQL({ 
  sql: sql4, 
  shardKey: shardKey1, 
  shardValues: shardValues1, 
  algorithm: 'mod', 
  algorithmConfig: { mod: 10 } 
});

const groupedByShard4 = result4.reduce((acc, item) => {
  if (!acc[item.shardId]) {
    acc[item.shardId] = { values: [], sql: item.sql };
  }
  acc[item.shardId].values.push(item.value);
  return acc;
}, {});

Object.keys(groupedByShard4).forEach(shardId => {
  const group = groupedByShard4[shardId];
  console.log(`路由ID: ${shardId}`);
  console.log(`包含值: ${group.values.join(', ')}`);
  console.log(`合并SQL: ${group.sql}\n`);
});

// 测试用例5: 包含ORDER BY和LIMIT的语句
console.log('测试用例5: 包含ORDER BY和LIMIT的语句');
const sql5 = 'SELECT * FROM users WHERE user_id = ? ORDER BY created_at DESC LIMIT 10';
const result5 = generateBatchSQL({ 
  sql: sql5, 
  shardKey: shardKey1, 
  shardValues: shardValues1, 
  algorithm: 'mod', 
  algorithmConfig: { mod: 10 } 
});

const groupedByShard5 = result5.reduce((acc, item) => {
  if (!acc[item.shardId]) {
    acc[item.shardId] = { values: [], sql: item.sql };
  }
  acc[item.shardId].values.push(item.value);
  return acc;
}, {});

Object.keys(groupedByShard5).forEach(shardId => {
  const group = groupedByShard5[shardId];
  console.log(`路由ID: ${shardId}`);
  console.log(`包含值: ${group.values.join(', ')}`);
  console.log(`合并SQL: ${group.sql}\n`);
});

console.log('=== 完整测试完成 ===');