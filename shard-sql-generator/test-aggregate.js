// 测试聚合SQL功能
const sqlGenerator = require('./core/sql-generator');

console.log('=== 测试聚合SQL功能 ===\n');

// 测试1: SELECT语句聚合SQL
console.log('1. 测试SELECT语句聚合SQL:');
const selectSQL = 'SELECT * FROM users WHERE user_id = ? AND status = 1';
const selectShardSQLs = [
  'SELECT * FROM users_1 WHERE user_id = \'1001\' AND status = 1',
  'SELECT * FROM users_2 WHERE user_id = \'1001\' AND status = 1',
  'SELECT * FROM users_3 WHERE user_id = \'1001\' AND status = 1'
];
const selectAggregateSQL = sqlGenerator.generateAggregateSQL(selectShardSQLs, selectSQL);
console.log('原始SQL:', selectSQL);
console.log('分片SQL数量:', selectShardSQLs.length);
console.log('聚合SQL:', selectAggregateSQL);
console.log();

// 测试2: INSERT语句不应生成聚合SQL
console.log('2. 测试INSERT语句（不应生成聚合SQL）:');
const insertSQL = 'INSERT INTO users (user_id, name) VALUES (?, ?)';
const insertShardSQLs = [
  'INSERT INTO users_1 (user_id, name) VALUES (\'1001\', \'Alice\')',
  'INSERT INTO users_2 (user_id, name) VALUES (\'2002\', \'Bob\')'
];
const insertAggregateSQL = sqlGenerator.generateAggregateSQL(insertShardSQLs, insertSQL);
console.log('原始SQL:', insertSQL);
console.log('分片SQL数量:', insertShardSQLs.length);
console.log('聚合SQL:', insertAggregateSQL);
console.log();

// 测试3: UPDATE语句不应生成聚合SQL
console.log('3. 测试UPDATE语句（不应生成聚合SQL）:');
const updateSQL = 'UPDATE users SET status = 0 WHERE user_id = ?';
const updateShardSQLs = [
  'UPDATE users_1 SET status = 0 WHERE user_id = \'1001\'',
  'UPDATE users_2 SET status = 0 WHERE user_id = \'2002\''
];
const updateAggregateSQL = sqlGenerator.generateAggregateSQL(updateShardSQLs, updateSQL);
console.log('原始SQL:', updateSQL);
console.log('分片SQL数量:', updateShardSQLs.length);
console.log('聚合SQL:', updateAggregateSQL);
console.log();

// 测试4: DELETE语句不应生成聚合SQL
console.log('4. 测试DELETE语句（不应生成聚合SQL）:');
const deleteSQL = 'DELETE FROM users WHERE user_id = ?';
const deleteShardSQLs = [
  'DELETE FROM users_1 WHERE user_id = \'1001\'',
  'DELETE FROM users_2 WHERE user_id = \'2002\''
];
const deleteAggregateSQL = sqlGenerator.generateAggregateSQL(deleteShardSQLs, deleteSQL);
console.log('原始SQL:', deleteSQL);
console.log('分片SQL数量:', deleteShardSQLs.length);
console.log('聚合SQL:', deleteAggregateSQL);
console.log();

// 测试5: 带ORDER BY和LIMIT的SELECT语句
console.log('5. 测试带ORDER BY和LIMIT的SELECT语句:');
const complexSQL = 'SELECT * FROM users WHERE status = 1 ORDER BY created_at DESC LIMIT 10';
const complexShardSQLs = [
  'SELECT * FROM users_1 WHERE status = 1 ORDER BY created_at DESC LIMIT 10',
  'SELECT * FROM users_2 WHERE status = 1 ORDER BY created_at DESC LIMIT 10',
  'SELECT * FROM users_3 WHERE status = 1 ORDER BY created_at DESC LIMIT 10'
];
const complexAggregateSQL = sqlGenerator.generateAggregateSQL(complexShardSQLs, complexSQL);
console.log('原始SQL:', complexSQL);
console.log('分片SQL数量:', complexShardSQLs.length);
console.log('聚合SQL:', complexAggregateSQL);
console.log();

console.log('=== 聚合SQL功能测试完成 ===');