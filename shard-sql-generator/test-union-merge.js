const { generateBatchSQL } = require('./core/sql-generator');

// 测试包含UNION ALL的SQL合并功能
function testUnionMerge() {
  console.log('=== 测试UNION ALL SQL合并功能 ===\n');
  
  // 包含UNION ALL的原始SQL
  const sql = `select * from aas WHERE bbb = ? AND d=3 
UNION ALL 
select * from aas WHERE bbb = ? AND d=3 
UNION ALL 
select * from aas WHERE bbb = ? AND d=3`;
  
  console.log('原始SQL:');
  console.log(sql);
  const unionAllRegex = /\s*union\s+all\s*/i;
  console.log('\n是否包含UNION ALL:', unionAllRegex.test(sql));
  console.log('SQL分割后:', sql.split(unionAllRegex).map(query => query.trim()));
  
  const shardKey = 'bbb';
  const shardValues = ['4', '44', '444', '1', '5', '2', '222', '22', '3', '11'];
  const algorithm = 'mod';
  const algorithmConfig = { mod: 4 };
  
  try {
    const results = generateBatchSQL({
      sql,
      shardKey,
      shardValues,
      algorithm,
      algorithmConfig
    });
    
    console.log('批量生成的SQL结果:');
    console.log('=' .repeat(50));
    
    // 按路由ID分组显示结果
    const groupedResults = {};
    results.forEach(result => {
      if (!groupedResults[result.shardId]) {
        groupedResults[result.shardId] = {
          values: [],
          sql: ''
        };
      }
      groupedResults[result.shardId].values.push(result.value);
      groupedResults[result.shardId].sql = result.sql;
    });
    
    Object.entries(groupedResults).forEach(([shardId, data]) => {
      console.log(`\n路由ID: ${shardId}`);
      console.log(`值: [${data.values.join(', ')}]`);
      console.log(`SQL: ${data.sql}`);
    });
    
    console.log('\n' + '=' .repeat(50));
    console.log('UNION ALL SQL合并测试完成');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
testUnionMerge();