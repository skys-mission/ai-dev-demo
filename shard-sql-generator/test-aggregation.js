const { generateBatchSQL } = require('./core/sql-generator');

// 测试包含聚合函数的UNION ALL查询合并
const sqlTemplate = `SELECT COUNT(*) as total FROM aas WHERE bbb = ? AND d=3
UNION ALL
SELECT SUM(amount) as sum_amount FROM aas WHERE bbb = ? AND d=3
UNION ALL
SELECT AVG(score) as avg_score FROM aas WHERE bbb = ? AND d=3`;

const shardKey = 'bbb';
const shardValues = [4, 44, 444, 1, 5, 2, 222, 22, 3, 11];
const algorithm = 'mod';
const algorithmConfig = { mod: 4 };

console.log("=== 测试聚合函数的UNION ALL查询合并 ===");
console.log("原始SQL模板:");
console.log(sqlTemplate);
console.log("\n路由键:", shardKey);
console.log("路由值:", shardValues);
console.log("算法:", algorithm);
console.log("算法配置:", algorithmConfig);
console.log("\n合并结果:");
console.log("==================================================");

try {
  const result = generateBatchSQL({
    sql: sqlTemplate,
    shardKey: shardKey,
    shardValues: shardValues,
    algorithm: algorithm,
    algorithmConfig: algorithmConfig
  });
  
  // 遍历结果（按路由ID分组显示）
  const groupedResult = {};
  result.forEach((item, index) => {
    if (!groupedResult[item.shardId]) {
      groupedResult[item.shardId] = {
        shardId: item.shardId,
        values: [],
        sql: item.sql
      };
    }
    if (!groupedResult[item.shardId].values.includes(item.value)) {
      groupedResult[item.shardId].values.push(item.value);
    }
  });
  
  // 显示分组结果
  Object.values(groupedResult).forEach((group, index) => {
    console.log(`\n路由ID: ${group.shardId}`);
    console.log(`包含值: ${group.values}`);
    console.log(`SQL: ${group.sql}`);
  });
  
  console.log("\n==================================================");
  console.log("聚合函数测试完成");
} catch (error) {
  console.error("测试失败:", error);
}