// 脚本管理模块
// 负责内置路由脚本的管理和自定义脚本的验证执行
// 纯Node.js原生实现，自定义脚本通过API参数传递

// 内置脚本模板
const builtinScripts = [
  {
    id: 'builtin-mod',
    name: '取模算法',
    type: 'builtin',
    algorithm: 'mod',
    description: '根据路由键的值进行取模运算确定路由ID',
    configSchema: {
      mod: {
        type: 'number',
        required: true,
        label: '取模值',
        description: '路由数量'
      }
    },
    sampleConfig: { mod: 10 }
  },
  {
    id: 'builtin-range',
    name: '范围路由',
    type: 'builtin',
    algorithm: 'range',
    description: '根据路由键的值范围确定路由ID',
    configSchema: {
      rules: {
        type: 'array',
        required: true,
        label: '范围规则',
        description: '值范围与路由ID的映射',
        items: {
          min: { type: 'number', required: true, label: '最小值' },
          max: { type: 'number', required: true, label: '最大值' },
          shard: { type: 'number', required: true, label: '路由ID' }
        }
      }
    },
    sampleConfig: {
      rules: [
        { min: 0, max: 10000, shard: 0 },
        { min: 10001, max: 20000, shard: 1 },
        { min: 20001, max: 30000, shard: 2 }
      ]
    }
  },
  {
    id: 'builtin-hash',
    name: '哈希路由',
    type: 'builtin',
    algorithm: 'hash',
    description: '对路由键进行哈希运算确定路由ID',
    configSchema: {
      numShards: {
        type: 'number',
        required: true,
        label: '路由数量',
        description: '哈希结果的取模值'
      },
      hashAlgorithm: {
        type: 'string',
        required: false,
        label: '哈希算法',
        description: '哈希算法类型，默认使用内置算法'
      }
    },
    sampleConfig: { numShards: 10, hashAlgorithm: 'md5' }
  },
  {
    id: 'builtin-consistent-hash',
    name: '一致性哈希',
    type: 'builtin',
    algorithm: 'consistent-hash',
    description: '使用一致性哈希算法确定路由ID，适用于动态增减路由的场景',
    configSchema: {
      numNodes: {
        type: 'number',
        required: true,
        label: '节点数量',
        description: '集群中的节点数量'
      },
      virtualNodes: {
        type: 'number',
        required: false,
        label: '虚拟节点数',
        description: '每个真实节点对应的虚拟节点数量'
      }
    },
    sampleConfig: { numNodes: 10, virtualNodes: 100 }
  },
  {
    id: 'builtin-date',
    name: '日期路由',
    type: 'builtin',
    algorithm: 'date',
    description: '根据日期格式确定路由ID',
    configSchema: {
      dateFormat: {
        type: 'string',
        required: true,
        label: '日期格式',
        description: 'YYYY/YYYYMM/YYYYMMDD/YYYYMMDDHH'
      }
    },
    sampleConfig: { dateFormat: 'YYYYMMDD' }
  }
];

// 获取所有内置脚本
function getAllScripts() {
  return [...builtinScripts];
}

// 获取单个内置脚本
function getScriptById(id) {
  return builtinScripts.find(script => script.id === id);
}

// 验证自定义脚本
function validateCustomScript(script) {
  // 基本验证
  if (!script.name || typeof script.name !== 'string') {
    console.error('脚本验证失败: 缺少有效的name字段');
    return false;
  }
  
  if (!script.description || typeof script.description !== 'string') {
    console.error('脚本验证失败: 缺少有效的description字段');
    return false;
  }
  
  if (!script.script || typeof script.script !== 'string') {
    console.error('脚本验证失败: 缺少有效的script字段');
    console.log('接收到的script对象:', script);
    return false;
  }
  
  // 验证脚本语法
  try {
    const vm = require('vm');
    const context = vm.createContext({
      value: 'test',
      Math: Math,
      Date: Date,
      parseInt: parseInt,
      parseFloat: parseFloat,
      String: String,
      Number: Number
    });
    
    // 为了安全起见，总是将脚本包装在函数中执行
    // 这样可以处理：函数声明、直接return语句、立即执行函数等各种情况
    const wrappedScript = `(function() { ${script.script} })()`;
    vm.runInContext(wrappedScript, context);
    
    console.log('脚本语法验证成功');
  } catch (error) {
    console.error('脚本语法验证失败:', error);
    console.log('脚本内容:', script.script);
    return false;
  }
  
  // 验证配置Schema
  if (script.configSchema && typeof script.configSchema !== 'object') {
    console.error('脚本验证失败: configSchema必须是对象');
    return false;
  }
  
  console.log('脚本验证成功');
  return true;
}

// 执行自定义脚本（从内容直接执行，不需要文件系统）
function executeCustomScript(scriptContent, value, config) {
  const vm = require('vm');
  
  try {
    // 创建执行环境
    const context = vm.createContext({
      value: value,
      config: config,
      Math: Math,
      Date: Date,
      parseInt: parseInt,
      parseFloat: parseFloat,
      String: String,
      Number: Number
    });
    
    // 执行脚本
    const result = vm.runInContext(scriptContent, context);
    return parseInt(result) || 0;
  } catch (error) {
    console.error('执行自定义脚本失败:', error);
    return 0;
  }
}

// 导出模块
module.exports = {
  getAllScripts,
  getScriptById,
  validateCustomScript,
  executeCustomScript,
  builtinScripts
};