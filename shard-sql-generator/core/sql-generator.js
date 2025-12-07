// 分片SQL生成器核心模块
// 纯Node.js原生实现，无第三方依赖

// 导入脚本管理器
const { executeCustomScript } = require('./script-manager');

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
  'consistent-hash': (() => {
    // 缓存已经计算过的节点哈希环
    const cache = new Map();
    
    // 计算并缓存哈希环
    const getHashRing = (numNodes, virtualNodes) => {
      const cacheKey = `${numNodes}-${virtualNodes}`;
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }
      
      const points = [];
      for (let i = 0; i < numNodes; i++) {
        for (let j = 0; j < virtualNodes; j++) {
          const nodeHash = simpleHash(`node-${i}-vnode-${j}`);
          points.push({ hash: nodeHash, node: i });
        }
      }
      
      // 排序节点哈希点
      points.sort((a, b) => a.hash - b.hash);
      
      // 缓存结果
      cache.set(cacheKey, points);
      return points;
    };
    
    // 二分查找算法
    const binarySearch = (points, targetHash) => {
      let left = 0;
      let right = points.length - 1;
      
      // 如果目标哈希大于最大哈希值或哈希环为空，返回第一个节点
      if (points.length === 0 || targetHash > points[right].hash) {
        return points.length > 0 ? points[0].node : 0;
      }
      
      // 二分查找第一个大于等于目标哈希的节点
      while (left < right) {
        const mid = Math.floor((left + right) / 2);
        
        if (points[mid].hash >= targetHash) {
          right = mid;
        } else {
          left = mid + 1;
        }
      }
      
      return points[left].node;
    };
    
    return (value, config) => {
      const { numNodes, virtualNodes = 100 } = config;
      const hash = simpleHash(value);
      
      // 获取哈希环（从缓存或重新计算）
      const points = getHashRing(numNodes, virtualNodes);
      
      // 使用二分查找定位节点
      return binarySearch(points, hash);
    };
  })(),

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
    
    return simpleHash(shardValue) % 10; // 默认返回0-9的路由ID
  },

  // 自定义脚本
  custom: (value, config) => {
    try {
      // 检查危险操作
      const dangerousPatterns = [
        /eval\(/gi,
        /Function\(/gi,
        /new\s+Function\(/gi,
        /require\(/gi,
        /import\s+/gi,
        /globalThis/gi,
        /window/gi,
        /document/gi,
        /process/gi,
        /Buffer/gi,
        /__proto__/gi,
        /prototype/gi,
        /constructor/gi,
        /while\s*\(true\)/gi,
        /for\s*\(\s*;;/gi
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(config.script)) {
          throw new Error('脚本包含危险操作: ' + pattern.source);
        }
      }
      
      // 创建一个安全的执行环境
      const vm = require('vm');
      
      // 更严格地限制上下文环境
      const context = vm.createContext({
        value: value,
        // 只提供必要的数学函数
        Math: {
          abs: Math.abs,
          round: Math.round,
          floor: Math.floor,
          ceil: Math.ceil,
          pow: Math.pow,
          random: Math.random,
          min: Math.min,
          max: Math.max
        },
        // 日期函数
        Date: {
          parse: Date.parse,
          now: Date.now
        },
        // 类型转换函数
        parseInt: parseInt,
        parseFloat: parseFloat,
        String: (val) => String(val),
        Number: (val) => Number(val),
        Boolean: (val) => Boolean(val)
      });
      
      // 包装脚本以确保安全执行
      const wrappedScript = `
        'use strict';
        
        // 执行用户脚本并捕获结果
        let result = (() => {
          ${config.script}
        })();
        
        // 确保结果是数值类型
        if (typeof result !== 'number') {
          throw new Error('脚本必须返回数值类型的路由ID');
        }
        
        result;
      `;
      
      // 创建脚本对象
      const script = new vm.Script(wrappedScript);
      
      // 设置执行超时（1秒）
      const timeout = 1000;
      const result = script.runInContext(context, { timeout });
      
      // 验证结果类型
      const shardId = parseInt(result);
      if (isNaN(shardId)) {
        throw new Error('脚本返回无效的路由ID');
      }
      
      return shardId;
    } catch (error) {
      console.error('自定义脚本执行错误:', error);
      // 保持向后兼容，错误时返回0
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
  
  // 1. 处理注释 - 先移除注释，避免影响解析
  const commentRegex = /(--.*$)|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm;
  const sqlWithoutComments = shardSQL.replace(commentRegex, '');
  
  // 2. 替换表名，添加分片后缀
  
  // 辅助函数：处理表名并添加分片后缀
  const processTableName = (table, alias, prefix = '') => {
    // 处理 schema.table 格式
    const tableParts = table.split('.');
    const baseTable = tableParts[tableParts.length - 1];
    
    // 检查表名是否已经包含路由ID
    if (baseTable.endsWith(`_${shardId}`)) {
      return alias ? `${prefix} ${table} AS ${alias}` : `${prefix} ${table}`;
    }
    
    const schemaPrefix = tableParts.length > 1 ? tableParts.slice(0, -1).join('.') + '.' : '';
    
    const shardedTable = `${schemaPrefix}${baseTable}_${shardId}`;
    return alias ? `${prefix} ${shardedTable} AS ${alias}` : `${prefix} ${shardedTable}`;
  };
  
  // 2.1 处理 FROM 子句中的表名
  // 匹配: FROM table_name [AS alias] 或 FROM schema.table_name [AS alias]
  const fromTableRegex = /\bFROM\s+([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?\b/gi;
  shardSQL = shardSQL.replace(fromTableRegex, (match, table, alias) => {
    return processTableName(table, alias, 'FROM');
  });
  
  // 2.2 处理 UPDATE 子句中的表名
  const updateTableRegex = /\bUPDATE\s+([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?\b/gi;
  shardSQL = shardSQL.replace(updateTableRegex, (match, table, alias) => {
    return processTableName(table, alias, 'UPDATE');
  });
  
  // 2.3 处理 DELETE FROM 子句中的表名
  const deleteTableRegex = /\bDELETE\s+FROM\s+([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?\b/gi;
  shardSQL = shardSQL.replace(deleteTableRegex, (match, table, alias) => {
    return processTableName(table, alias, 'DELETE FROM');
  });
  
  // 2.4 处理 INSERT INTO 子句中的表名
  const insertTableRegex = /\bINSERT\s+(?:INTO\s+)?([a-zA-Z0-9_.]+)/gi;
  shardSQL = shardSQL.replace(insertTableRegex, (match, table) => {
    const tableParts = table.split('.');
    const baseTable = tableParts[tableParts.length - 1];
    const schemaPrefix = tableParts.length > 1 ? tableParts.slice(0, -1).join('.') + '.' : '';
    
    const shardedTable = `${schemaPrefix}${baseTable}_${shardId}`;
    return match.toLowerCase().includes('into') ? `INSERT INTO ${shardedTable}` : `INSERT ${shardedTable}`;
  });
  
  // 2.5 处理 JOIN 子句中的表名
  const joinTableRegex = /\b(JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|LEFT\s+OUTER\s+JOIN|RIGHT\s+OUTER\s+JOIN|FULL\s+OUTER\s+JOIN)\s+([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?\b/gi;
  shardSQL = shardSQL.replace(joinTableRegex, (match, joinType, table, alias) => {
    return processTableName(table, alias, joinType);
  });
  
  // 2.6 处理子查询中的表名 (简单实现)
  const subqueryRegex = /\(([^()]+)\)/g;
  let subqueryMatch;
  const subqueries = [];
  
  // 提取子查询
  while ((subqueryMatch = subqueryRegex.exec(sqlWithoutComments)) !== null) {
    const subquery = subqueryMatch[1];
    // 检查是否包含 FROM/UPDATE/DELETE/INSERT 关键字
    if (/\b(FROM|UPDATE|DELETE|INSERT|JOIN)\b/i.test(subquery)) {
      subqueries.push(subquery);
    }
  }
  
  // 处理子查询中的表名
  for (const subquery of subqueries) {
    let processedSubquery = subquery;
    
    // 处理子查询中的 FROM 子句
    processedSubquery = processedSubquery.replace(fromTableRegex, (match, table, alias) => {
      return processTableName(table, alias, 'FROM');
    });
    
    // 处理子查询中的 JOIN 子句
    processedSubquery = processedSubquery.replace(joinTableRegex, (match, joinType, table, alias) => {
      return processTableName(table, alias, joinType);
    });
    
    // 替换回原SQL
    shardSQL = shardSQL.replace(`(${subquery})`, `(${processedSubquery})`);
  }
  
  // 2.7 处理 UNION/UNION ALL 子句
  const unionRegex = /\b(UNION\s+ALL|UNION)\b/gi;
  if (unionRegex.test(shardSQL)) {
    const unionParts = shardSQL.split(unionRegex);
    
    // 处理每个 UNION 部分
    for (let i = 0; i < unionParts.length; i += 2) {
      let part = unionParts[i];
      
      // 处理 FROM 子句
      part = part.replace(fromTableRegex, (match, table, alias) => {
        return processTableName(table, alias, 'FROM');
      });
      
      // 处理 JOIN 子句
      part = part.replace(joinTableRegex, (match, joinType, table, alias) => {
        return processTableName(table, alias, joinType);
      });
      
      unionParts[i] = part;
    }
    
    shardSQL = unionParts.join('');
  }
  
  // 3. 处理路由键占位符
  // 移除SQL末尾的分号，避免添加WHERE子句时产生语法错误
  if (shardSQL.endsWith(';')) {
    shardSQL = shardSQL.slice(0, -1);
  }
  
  if (shardSQL.includes('?')) {
    const parts = shardSQL.split('?');
    let result = parts[0];
    let placeholderIndex = 0;
    
    for (let i = 1; i < parts.length; i++) {
      if (placeholderIndex === 0) {
        // 第一个占位符替换为路由键值
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
    // 如果没有占位符，确保WHERE子句包含路由键条件
    const lowerSQL = sqlWithoutComments.toLowerCase(); // 使用去除注释的SQL进行分析
    const whereIndex = lowerSQL.indexOf(' where ');
    const shardSQLLower = shardSQL.toLowerCase();
    
    // 直接在原始shardSQL中查找关键字位置
    const groupByPos = shardSQLLower.indexOf(' group by ');
    const orderByPos = shardSQLLower.indexOf(' order by ');
    const limitPos = shardSQLLower.indexOf(' limit ');
    const offsetPos = shardSQLLower.indexOf(' offset ');
    
    // 找到SQL语句的结构位置
    let insertIndex = shardSQL.length;
    
    // 查找所有关键字位置，取最小的那个
    const keywordPositions = [groupByPos, orderByPos, limitPos, offsetPos]
      .filter(pos => pos !== -1);
      
    if (keywordPositions.length > 0) {
      insertIndex = Math.min(...keywordPositions);
    }
    
    // 生成路由键条件
    const shardCondition = `${shardKey} = ${typeof shardValue === 'number' ? shardValue : `'${shardValue}'`}`;
    
    // 检查是否已有WHERE子句
    const whereIndexInShard = shardSQL.toLowerCase().indexOf(' where ');
    
    if (whereIndexInShard !== -1) {
      // 已有WHERE子句，检查是否需要添加路由键条件
      if (!shardSQL.toLowerCase().includes(`${shardKey.toLowerCase()} =`)) {
        const whereEnd = whereIndexInShard + 7; // 7是' where '的长度
        shardSQL = shardSQL.slice(0, whereEnd) + `${shardCondition} AND ` + shardSQL.slice(whereEnd);
      }
    } else {
      // 没有WHERE子句，需要添加
      const shardSQLLower = shardSQL.toLowerCase();
      
      // 查找第一个出现的SQL关键字，如GROUP BY、ORDER BY、LIMIT、OFFSET
      const keywordPositions = [
        { keyword: ' group by ', pos: shardSQLLower.indexOf(' group by ') },
        { keyword: ' order by ', pos: shardSQLLower.indexOf(' order by ') },
        { keyword: ' limit ', pos: shardSQLLower.indexOf(' limit ') },
        { keyword: ' offset ', pos: shardSQLLower.indexOf(' offset ') }
      ];
      
      // 过滤出存在的关键字位置
      const existingKeywordPositions = keywordPositions.filter(item => item.pos !== -1);
      
      if (existingKeywordPositions.length > 0) {
        // 找到最早出现的关键字位置
        const earliestKeyword = existingKeywordPositions.reduce((earliest, current) => {
          return current.pos < earliest.pos ? current : earliest;
        });
        
        // 在最早的关键字前添加WHERE子句
        shardSQL = shardSQL.slice(0, earliestKeyword.pos) + ` WHERE ${shardCondition}` + shardSQL.slice(earliestKeyword.pos);
      } else {
        // 没有这些关键字，直接在SQL末尾添加WHERE子句
        shardSQL += ` WHERE ${shardCondition}`;
      }
    }
  }
  
  return shardSQL;
}

// 合并同一分片中的SQL语句
function mergeSQLsInShard(sqlTemplate, shardKey, values, shardId) {
  if (values.length === 0) return [];
  if (values.length === 1) return [generateShardSQL(sqlTemplate, shardKey, values[0], shardId)];
  
  // 检查SQL是否包含UNION ALL（使用正则表达式匹配，考虑空格和换行符）
  const unionAllRegex = /\s*union\s+all\s*/i;
  const hasUnionAll = unionAllRegex.test(sqlTemplate);
  
  if (hasUnionAll) {
    // 处理包含UNION ALL的SQL
    // 使用正则表达式分割，保留UNION ALL前后的空格
    const subQueries = sqlTemplate.split(unionAllRegex).map(query => query.trim());
    
    // 对每个子查询应用合并逻辑
    const mergedSubQueries = subQueries.map(subQuery => {
      // 1. 提取子查询的各部分
      const subLowerSql = subQuery.toLowerCase();
      const whereIndex = subLowerSql.indexOf(' where ');
      const groupByPos = subLowerSql.indexOf(' group by ');
      const orderByPos = subLowerSql.indexOf(' order by ');
      const limitPos = subLowerSql.indexOf(' limit ');
      const offsetPos = subLowerSql.indexOf(' offset ');
      
      // 提取命令部分（SELECT/UPDATE/DELETE等）
      const commandPart = subQuery.slice(0, whereIndex !== -1 ? whereIndex : subQuery.length);
      
      // 替换表名 - 确保只替换一次
      let newCommandPart = commandPart.replace(/\b(FROM|UPDATE|DELETE FROM)\s+([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?\b/gi,
        (match, prefix, table, alias) => {
          // 检查表名是否已经包含路由ID
          if (table.endsWith(`_${shardId}`)) {
            return match; // 已经有路由ID，不替换
          }
          
          const tableParts = table.split('.');
          const baseTable = tableParts[tableParts.length - 1];
          const schemaPrefix = tableParts.length > 1 ? tableParts.slice(0, -1).join('.') + '.' : '';
          const shardedTable = `${schemaPrefix}${baseTable}_${shardId}`;
          return alias ? `${prefix} ${shardedTable} AS ${alias}` : `${prefix} ${shardedTable}`;
        });
      
      // 处理WHERE子句
      let otherConditions = '';
      
      if (whereIndex !== -1) {
        // 找到WHERE子句的结束位置
        let whereEndPos = subQuery.length;
        const keywordPositions = [groupByPos, orderByPos, limitPos, offsetPos]
          .filter(pos => pos !== -1 && pos > whereIndex);
          
        if (keywordPositions.length > 0) {
          whereEndPos = Math.min(...keywordPositions);
        }
        
        // 提取WHERE子句
        const whereClause = subQuery.slice(whereIndex + 7, whereEndPos);
        
        // 分离路由键条件和其他条件
        const conditions = whereClause.split(/\s+(?:AND|OR)\s+/i);
        const nonShardKeyConditions = conditions
          .filter(cond => !cond.trim().toLowerCase().startsWith(`${shardKey.toLowerCase()} =`))
          .filter(cond => cond.trim() !== '')
          .filter(cond => !cond.includes('?')); // 过滤掉占位符条件
        
        if (nonShardKeyConditions.length > 0) {
          otherConditions = nonShardKeyConditions.join(' AND ');
        }
      }
      
      // 构建IN条件
      const formattedValues = values.map(value => typeof value === 'number' ? value : `'${value}'`).join(', ');
      const inCondition = `${shardKey} IN (${formattedValues})`;
      
      // 构建完整的WHERE子句
      let whereClause = inCondition;
      if (otherConditions) {
        whereClause += ` AND ${otherConditions}`;
      }
      
      // 提取其他SQL部分（GROUP BY, ORDER BY等）
      let otherParts = '';
      const partsToKeep = [
        { name: 'group by', pos: groupByPos },
        { name: 'order by', pos: orderByPos },
        { name: 'limit', pos: limitPos },
        { name: 'offset', pos: offsetPos }
      ];
      
      // 找到第一个需要添加的其他部分的位置
      const firstOtherPartPos = Math.min(...partsToKeep
        .filter(part => part.pos !== -1)
        .map(part => part.pos));
      
      if (firstOtherPartPos !== Infinity) {
        otherParts = subQuery.slice(firstOtherPartPos);
      }
      
      // 构建最终子查询SQL
      let finalSubSQL = newCommandPart;
      if (whereClause) {
        finalSubSQL += ` WHERE ${whereClause}`;
      }
      if (otherParts) {
        finalSubSQL += otherParts;
      }
      
      // 移除末尾的分号
      if (finalSubSQL.endsWith(';')) {
        finalSubSQL = finalSubSQL.slice(0, -1);
      }
      
      // 移除多余的空格
      finalSubSQL = finalSubSQL.replace(/\s+/g, ' ').trim();
      
      return finalSubSQL;
    });
    
    // 将合并后的子查询用UNION ALL重新连接起来
    const finalSQL = mergedSubQueries.join(' UNION ALL ');
    return [finalSQL];
  } else {
    // 处理不包含UNION ALL的SQL（原有逻辑）
    // 1. 提取SQL模板的各部分
    const lowerSql = sqlTemplate.toLowerCase();
    const whereIndex = lowerSql.indexOf(' where ');
    const groupByPos = lowerSql.indexOf(' group by ');
    const orderByPos = lowerSql.indexOf(' order by ');
    const limitPos = lowerSql.indexOf(' limit ');
    const offsetPos = lowerSql.indexOf(' offset ');
    
    // 提取命令部分（SELECT/UPDATE/DELETE等）
    const commandPart = sqlTemplate.slice(0, whereIndex !== -1 ? whereIndex : sqlTemplate.length);
    
    // 替换表名 - 确保只替换一次
    let newCommandPart = commandPart.replace(/\b(FROM|UPDATE|DELETE FROM)\s+([a-zA-Z0-9_.]+)(?:\s+AS\s+([a-zA-Z0-9_]+))?\b/gi,
      (match, prefix, table, alias) => {
        // 检查表名是否已经包含路由ID
        if (table.endsWith(`_${shardId}`)) {
          return match; // 已经有路由ID，不替换
        }
        
        const tableParts = table.split('.');
        const baseTable = tableParts[tableParts.length - 1];
        const schemaPrefix = tableParts.length > 1 ? tableParts.slice(0, -1).join('.') + '.' : '';
        const shardedTable = `${schemaPrefix}${baseTable}_${shardId}`;
        return alias ? `${prefix} ${shardedTable} AS ${alias}` : `${prefix} ${shardedTable}`;
      });
    
    // 3. 处理WHERE子句
    let otherConditions = '';
    
    if (whereIndex !== -1) {
      // 找到WHERE子句的结束位置
      let whereEndPos = sqlTemplate.length;
      const keywordPositions = [groupByPos, orderByPos, limitPos, offsetPos]
        .filter(pos => pos !== -1 && pos > whereIndex);
        
      if (keywordPositions.length > 0) {
        whereEndPos = Math.min(...keywordPositions);
      }
      
      // 提取WHERE子句
      const whereClause = sqlTemplate.slice(whereIndex + 7, whereEndPos);
      
      // 分离路由键条件和其他条件
      const conditions = whereClause.split(/\s+(?:AND|OR)\s+/i);
      const nonShardKeyConditions = conditions
        .filter(cond => !cond.trim().toLowerCase().startsWith(`${shardKey.toLowerCase()} =`))
        .filter(cond => cond.trim() !== '')
        .filter(cond => !cond.includes('?')); // 过滤掉占位符条件
      
      if (nonShardKeyConditions.length > 0) {
        otherConditions = nonShardKeyConditions.join(' AND ');
      }
    }
    
    // 4. 构建IN条件
    const formattedValues = values.map(value => typeof value === 'number' ? value : `'${value}'`).join(', ');
    const inCondition = `${shardKey} IN (${formattedValues})`;
    
    // 5. 构建完整的WHERE子句
    let whereClause = inCondition;
    if (otherConditions) {
      whereClause += ` AND ${otherConditions}`;
    }
    
    // 6. 提取其他SQL部分（GROUP BY, ORDER BY等）
    let otherParts = '';
    const partsToKeep = [
      { name: 'group by', pos: groupByPos },
      { name: 'order by', pos: orderByPos },
      { name: 'limit', pos: limitPos },
      { name: 'offset', pos: offsetPos }
    ];
    
    // 找到第一个需要添加的其他部分的位置
    const firstOtherPartPos = Math.min(...partsToKeep
      .filter(part => part.pos !== -1)
      .map(part => part.pos));
    
    if (firstOtherPartPos !== Infinity) {
      otherParts = sqlTemplate.slice(firstOtherPartPos);
    }
    
    // 7. 构建最终SQL
    let finalSQL = newCommandPart;
    if (whereClause) {
      finalSQL += ` WHERE ${whereClause}`;
    }
    if (otherParts) {
      finalSQL += otherParts;
    }
    
    // 移除末尾的分号
    if (finalSQL.endsWith(';')) {
      finalSQL = finalSQL.slice(0, -1);
    }
    
    // 移除多余的空格
    finalSQL = finalSQL.replace(/\s+/g, ' ').trim();
    
    return [finalSQL];
  }
}

// 批量生成SQL
function generateBatchSQL(params) {
  const { sql, shardKey, shardValues, algorithm, algorithmConfig = {} } = params;
  
  if (!sql || !shardKey || !shardValues || !algorithm) {
    throw new Error('缺少必要参数');
  }
  
  const values = Array.isArray(shardValues) ? shardValues : shardValues.split('\n').map(v => v.trim()).filter(v => v);
  
  // 按路由ID分组
  const shardGroups = {};
  for (const value of values) {
    const shardId = calculateShardId(value, algorithm, algorithmConfig);
    if (!shardGroups[shardId]) {
      shardGroups[shardId] = [];
    }
    shardGroups[shardId].push(value);
  }
  
  const results = [];
  
  // 对每个分片生成合并后的SQL
  for (const shardId in shardGroups) {
    const groupValues = shardGroups[shardId];
    
    // 生成合并后的SQL
    const mergedSQLs = mergeSQLsInShard(sql, shardKey, groupValues, shardId);
    
    // 如果合并成功，使用合并后的SQL
    if (mergedSQLs.length === 1) {
      // 为了保持返回结构不变，我们为每个值创建一个条目，但它们共享相同的SQL
      for (const value of groupValues) {
        results.push({
          value: value,
          shardId: parseInt(shardId),
          sql: mergedSQLs[0]
        });
      }
    } else {
      // 合并失败，回退到原来的方式
      for (const value of groupValues) {
        const shardSQL = generateShardSQL(sql, shardKey, value, parseInt(shardId));
        results.push({
          value: value,
          shardId: parseInt(shardId),
          sql: shardSQL
        });
      }
    }
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
  
  // 对SQL进行去重处理
  // 使用Map来存储去重后的SQL，key为标准化的SQL（用于去重），value为原始SQL（用于保持格式）
  const sqlMap = new Map();
  
  shardSQLs.forEach(sql => {
    // 标准化SQL：trim并处理多余空格，用于去重比较
    const normalizedSQL = sql.trim().replace(/\s+/g, ' ');
    // 如果Map中没有这个标准化的SQL，则添加它，并保持原始SQL的格式
    if (!sqlMap.has(normalizedSQL)) {
      sqlMap.set(normalizedSQL, sql.trim());
    }
  });
  
  // 将Map中的值（原始格式的SQL）转换为数组
  const uniqueSQLs = Array.from(sqlMap.values());
  
  // 使用UNION ALL连接所有去重后的分片SQL
  const aggregateSQL = uniqueSQLs.join('\nUNION ALL\n');
  
  return aggregateSQL;
}

// 计算路由ID
function calculateShardId(value, algorithm, config) {
  try {
    // 如果是内置算法，直接使用
    if (shardAlgorithms[algorithm]) {
      // 将前端参数映射到后端期望的格式
      let mappedConfig = { ...config };
      
      switch (algorithm) {
        case 'mod':
          mappedConfig.mod = config.mod || config.modValue;
          break;
        case 'range':
          mappedConfig.rules = config.rangeRules?.rules || [];
          break;
        case 'hash':
          mappedConfig.numShards = config.hashShards;
          break;
        case 'consistent-hash':
          mappedConfig.numNodes = config.nodes;
          break;
      }
      
      return shardAlgorithms[algorithm](value, mappedConfig);
    }

    throw new Error(`不支持的分片算法: ${algorithm}`);
  } catch (error) {
    console.error('计算路由ID出错:', error);
    // 出错时返回默认路由ID
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
