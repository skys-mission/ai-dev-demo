// 测试增强的SQL语法解析功能
const sqlGenerator = require('./core/sql-generator');

// 测试用例
const testCases = [
  {
    name: '基本SELECT语句',
    sql: 'SELECT * FROM users WHERE age > 18',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: 'INSERT语句',
    sql: 'INSERT INTO users (user_id, name, age) VALUES (?, ?, ?)',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: 'UPDATE语句',
    sql: 'UPDATE users SET name = "John" WHERE user_id = ?',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: 'DELETE语句',
    sql: 'DELETE FROM users WHERE user_id = ?',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含子查询的SELECT语句',
    sql: 'SELECT * FROM orders WHERE user_id IN (SELECT user_id FROM users WHERE age > 18)',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含INNER JOIN的语句',
    sql: 'SELECT u.name, o.order_id FROM users u INNER JOIN orders o ON u.user_id = o.user_id WHERE u.age > 18',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含LEFT JOIN和RIGHT JOIN的语句',
    sql: 'SELECT u.name, o.order_id, p.product_name FROM users u LEFT JOIN orders o ON u.user_id = o.user_id RIGHT JOIN products p ON o.product_id = p.product_id',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含UNION的语句',
    sql: 'SELECT user_id FROM users WHERE age > 18 UNION SELECT user_id FROM premium_users WHERE age > 18',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含UNION ALL的语句',
    sql: 'SELECT user_id FROM users WHERE age > 18 UNION ALL SELECT user_id FROM premium_users WHERE age > 18',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含复杂WHERE条件的语句',
    sql: 'SELECT * FROM users WHERE (age > 18 AND city = "Beijing") OR (age < 18 AND parent_id = ?)',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含GROUP BY和ORDER BY的语句',
    sql: 'SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id ORDER BY order_count DESC LIMIT 10',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  },
  {
    name: '包含注释的语句',
    sql: '-- 这是一条注释\nSELECT * FROM users /* 另一条注释 */ WHERE age > 18 // 行内注释',
    shardKey: 'user_id',
    shardValue: 12345,
    shardId: 1
  }
];

// 运行测试
console.log('开始测试增强的SQL语法解析功能...\n');

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  console.log('原始SQL:', testCase.sql);
  
  try {
    const result = sqlGenerator.generateShardSQL(
      testCase.sql,
      testCase.shardKey,
      testCase.shardValue,
      testCase.shardId
    );
    
    console.log('生成的SQL:', result);
    console.log('测试通过: ✅');
  } catch (error) {
    console.log('测试失败: ❌');
    console.log('错误信息:', error.message);
  }
  
  console.log('----------------------------------------');
});

console.log('所有测试完成！');