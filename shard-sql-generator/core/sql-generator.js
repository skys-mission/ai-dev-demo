// 分片SQL生成器核心模块
// 纯Node.js原生实现，无第三方依赖

// 分片算法集合
const shardAlgorithms = {
  // 取模算法
  mod: (value, config) => {
    const num = parseInt(value);
    const mod = parseInt(config.mod);
    return isNaN(num) ? 0 : num % mod;
  },

  // 范围分片
  range: (value, config) => {
    const num = parseInt(value);
    if (isNaN(num)) return 0;
    
    const rules = config.rules || [];
    for (const rule of rules) {
      if (num >= rule.min && num <= rule.max) {
        return rule.shard;
      }
    }
    return 0;
  },

  // 哈希分片
  hash: (value, config) => {
    const hash = simpleHash(value, config.hashAlgorithm);
    return hash % config.numShards;
  },

  // 一致性哈希
  'consistent-hash': (value, config) => {
    const { numNodes, virtualNodes = 100 } = config;
    const hash = simpleHash(value);
    
    // 简化的一致性哈希实现
    // 实际项目中应使用更完善的一致性哈希算法
    const points = [];
    for (let i = 0; i < numNodes; i++) {
      for (let j = 0; j < virtualNodes; j++) {
        const nodeHash = simpleHash(`node-${i}-vnode-${j}`);
        points.push({ hash: nodeHash, node: i });
      }
    }
    
    // 排序节点哈希点
    points.sort((a, b) => a.hash - b.hash);
    
    // 查找第一个大于等于目标哈希的节点
    for (const point of points) {
      if (point.hash >= hash) {
        return point.node;
      }
    }
    
    // 如果没有找到，返回第一个节点
    return points.length > 0 ? points[0].node : 0;
  },

  // 日期分片
  date: (value, config) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 0;
    
    let shardValue = '';
    const format = config.dateFormat;
    
    switch (format) {
      case 'YYYY':
        shardValue = date.getFullYear().toString();
        break;
      case 'YYYYMM':
        shardValue = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'YYYYMMDD':
        shardValue = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'YYYYMMDDHH':
        shardValue = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}`;
        break;
      default:
        shardValue = date.getFullYear().toString();
    }
    
    return simpleHash(shardValue) % 10; // 默认返回0-9的分片ID
  },

  // 自定义脚本
  custom: (value, config) => {
    try {
      // 创建一个安全的执行环境
      const vm = require('vm');
      const context = vm.createContext({
        value: value,
        Math: Math,
        Date: Date,
        parseInt: parseInt,
        parseFloat: parseFloat,
        String: String,
        Number: Number
      });
      
      // 执行自定义脚本
      const result = vm.runInContext(config.script, context);
      return parseInt(result) || 0;
    } catch (error) {
      console.error('自定义脚本执行错误:', error);
      return 0;
    }
  }
};

// 简单哈希函数
function simpleHash(value, algorithm = 'md5') {
  // 简化的哈希实现，实际项目中应使用更安全的哈希算法
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash);
}

// 生成分片SQL
function generateShardSQL(originalSQL, shardKey, shardValue, shardId) {
  if (!originalSQL || !shardKey) return originalSQL;
  
  let shardSQL = originalSQL;
  
  // 替换表名，添加分片后缀
  // 匹配 SELECT ... FROM table_name
  shardSQL = shardSQL.replace(/(SELECT\s+.+?\s+FROM\s+)([a-zA-Z0-9_]+)/gi, (match, prefix, table) => {
    return `${prefix}${table}_${shardId}`;
  });
  
  // 匹配 UPDATE table_name
  shardSQL = shardSQL.replace(/(UPDATE\s+)([a-zA-Z0-9_]+)/gi, (match, prefix, table) => {
    return `${prefix}${table}_${shardId}`;
  });
  
  // 匹配 DELETE FROM table_name
  shardSQL = shardSQL.replace(/(DELETE\s+FROM\s+)([a-zA-Z0-9_]+)/gi, (match, prefix, table) => {
    return `${prefix}${table}_${shardId}`;
  });
  
  // 匹配 INSERT INTO table_name
  shardSQL = shardSQL.replace(/(INSERT\s+INTO\s+)([a-zA-Z0-9_]+)/gi, (match, prefix, table) => {
    return `${prefix}${table}_${shardId}`;
  });
  
  // 处理分片键占位符
  if (shardSQL.includes('?')) {
    const parts = shardSQL.split('?');
    let result = parts[0];
    let placeholderIndex = 0;
    
    for (let i = 1; i < parts.length; i++) {
      if (placeholderIndex === 0) {
        // 第一个占位符替换为分片键值
        result += typeof shardValue === 'number' ? shardValue : `'${shardValue}'`;
      } else {
        // 其他占位符保持不变
        result += '?';
      }
      result += parts[i];
      placeholderIndex++;
    }
    
    shardSQL = result;
  } else {
    // 如果没有占位符，确保WHERE子句包含分片键条件
    const lowerSQL = shardSQL.toLowerCase();
    const whereIndex = lowerSQL.indexOf(' where ');
    const groupIndex = lowerSQL.indexOf(' group by ');
    const orderIndex = lowerSQL.indexOf(' order by ');
    const limitIndex = lowerSQL.indexOf(' limit ');
    
    // 找到SQL语句的结构位置
    let insertIndex = shardSQL.length;
    if (whereIndex !== -1) {
      // 已有WHERE子句，在其后添加分片键条件
      insertIndex = whereIndex + 7; // 7是' where '的长度
      shardSQL = shardSQL.slice(0, insertIndex) + 
                ` ${shardKey} = ${typeof shardValue === 'number' ? shardValue : `'${shardValue}'`} AND ` + 
                shardSQL.slice(insertIndex);
    } else {
      // 没有WHERE子句，添加WHERE子句
      // 找到合适的位置插入WHERE子句
      const positions = [groupIndex, orderIndex, limitIndex].filter(idx => idx !== -1);
      if (positions.length > 0) {
        insertIndex = Math.min(...positions);
      }
      
      shardSQL = shardSQL.slice(0, insertIndex) + 
                ` WHERE ${shardKey} = ${typeof shardValue === 'number' ? shardValue : `'${shardValue}'`}` + 
                shardSQL.slice(insertIndex);
    }
  }
  
  return shardSQL;
}

// 批量生成SQL
function generateBatchSQL(params) {
  const { sql, shardKey, shardValues, algorithm, algorithmConfig } = params;
  
  if (!sql || !shardKey || !shardValues || !algorithm) {
    throw new Error('缺少必要参数');
  }
  
  const results = [];
  const values = Array.isArray(shardValues) ? shardValues : shardValues.split('\n').map(v => v.trim()).filter(v => v);
  
  for (const value of values) {
    const shardId = calculateShardId(value, algorithm, algorithmConfig);
    const shardSQL = generateShardSQL(sql, shardKey, value, shardId);
    
    results.push({
      value: value,
      shardId: shardId,
      sql: shardSQL
    });
  }
  
  return results;
}

// 生成聚合SQL
function generateAggregateSQL(shardSQLs, originalSQL) {
  if (!shardSQLs || shardSQLs.length === 0) return '';
  
  const lowerSQL = originalSQL.toLowerCase();
  
  // 只对SELECT语句生成聚合SQL
  if (!lowerSQL.startsWith('select')) {
    return '';
  }
  
  // 使用UNION ALL连接所有分片SQL
  const aggregateSQL = shardSQLs.map(sql => sql.trim())
    .join('\nUNION ALL\n');
  
  return aggregateSQL;
}

// 计算分片ID
function calculateShardId(value, algorithm, config) {
  if (!shardAlgorithms[algorithm]) {
    throw new Error(`不支持的分片算法: ${algorithm}`);
  }
  
  try {
    return shardAlgorithms[algorithm](value, config);
  } catch (error) {
    console.error('分片计算错误:', error);
    return 0;
  }
}

// SQL格式化
function formatSQL(sql) {
  if (!sql) return '';
  
  // 简单的SQL格式化实现
  let formatted = sql;
  
  // 替换多个空格为单个空格
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // 关键字换行
  formatted = formatted.replace(/(SELECT|FROM|WHERE|AND|OR|JOIN|ON|GROUP BY|ORDER BY|LIMIT|OFFSET|INSERT INTO|UPDATE|SET|DELETE)/gi, '\n$1');
  
  // 适当缩进
  formatted = formatted.split('\n').map((line, index) => {
    if (index === 0) return line;
    if (/^(AND|OR|ON|SET)/i.test(line)) {
      return '  ' + line;
    }
    return line;
  }).join('\n');
  
  return formatted.trim();
}

// 导出模块
exports.shardAlgorithms = shardAlgorithms;
exports.generateShardSQL = generateShardSQL;
exports.generateBatchSQL = generateBatchSQL;
exports.generateAggregateSQL = generateAggregateSQL;
exports.calculateShardId = calculateShardId;
exports.formatSQL = formatSQL;
