// 测试错误处理逻辑
// 模拟前端错误处理的行为

// 模拟自定义脚本路由函数（有错误的版本）
function customScriptShardError(value) {
  // 这是一个有语法错误的脚本
  const errorScript = `function shard(value) {
    return parseInt(value) % ; // 这里缺少了除数
  }
  return shard(value);`;
  
  try {
    const func = new Function('value', errorScript);
    return func(value);
  } catch (e) {
    console.error('自定义脚本执行错误:', e);
    throw e; // 抛出错误，由调用方统一处理
  }
}

// 模拟批量处理函数
function generateBatchSQLWithErrorHandling() {
  const values = ['1001', '2002', '3003', '4004', '5005']; // 多个路由值
  const results = [];
  let scriptError = false;
  
  console.log('=== 开始测试批量处理错误处理 ===');
  console.log('处理的路由值:', values);
  
  values.forEach(value => {
    if (scriptError) {
      console.log(`跳过值 ${value}: 已发生错误`);
      return;
    }
    
    try {
      const shardId = customScriptShardError(value);
      results.push({
        value: value,
        shardId: shardId
      });
      console.log(`处理成功: ${value} -> 路由ID: ${shardId}`);
    } catch (e) {
      if (!scriptError) {
        console.error('生成SQL错误:', e);
        console.log('❌ 只报告一次错误，跳过剩余处理');
        scriptError = true;
      }
    }
  });
  
  console.log('=== 测试完成 ===');
  console.log('成功处理的结果:', results);
  console.log('是否发生错误:', scriptError);
}

// 运行测试
generateBatchSQLWithErrorHandling();