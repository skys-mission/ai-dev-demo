// 脚本管理模块
// 负责内置和自定义分片脚本的管理
// 纯Node.js原生实现，使用JSON文件存储

const fs = require('fs');
const path = require('path');

// 脚本存储目录
const SCRIPTS_DIR = path.join(__dirname, '../data/scripts');

// 初始化脚本目录
function initScriptsDir() {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
  }
}

// 内置脚本模板
const builtinScripts = [
  {
    id: 'builtin-mod',
    name: '取模算法',
    type: 'builtin',
    algorithm: 'mod',
    description: '根据分片键的值进行取模运算确定分片ID',
    configSchema: {
      mod: {
        type: 'number',
        required: true,
        label: '取模值',
        description: '分片数量'
      }
    },
    sampleConfig: { mod: 10 }
  },
  {
    id: 'builtin-range',
    name: '范围分片',
    type: 'builtin',
    algorithm: 'range',
    description: '根据分片键的值范围确定分片ID',
    configSchema: {
      rules: {
        type: 'array',
        required: true,
        label: '范围规则',
        description: '值范围与分片ID的映射',
        items: {
          min: { type: 'number', required: true, label: '最小值' },
          max: { type: 'number', required: true, label: '最大值' },
          shard: { type: 'number', required: true, label: '分片ID' }
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
    name: '哈希分片',
    type: 'builtin',
    algorithm: 'hash',
    description: '对分片键进行哈希运算确定分片ID',
    configSchema: {
      numShards: {
        type: 'number',
        required: true,
        label: '分片数量',
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
    description: '使用一致性哈希算法确定分片ID，适用于动态增减分片的场景',
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
    name: '日期分片',
    type: 'builtin',
    algorithm: 'date',
    description: '根据日期格式确定分片ID',
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

// 获取所有脚本（内置+自定义）
async function getAllScripts() {
  initScriptsDir();
  
  // 加载内置脚本
  const scripts = [...builtinScripts];
  
  // 加载自定义脚本
  const customScripts = await loadCustomScripts();
  scripts.push(...customScripts);
  
  return scripts;
}

// 获取单个脚本
async function getScriptById(id) {
  initScriptsDir();
  
  // 检查是否为内置脚本
  const builtinScript = builtinScripts.find(script => script.id === id);
  if (builtinScript) {
    return builtinScript;
  }
  
  // 查找自定义脚本
  const customScripts = await loadCustomScripts();
  return customScripts.find(script => script.id === id);
}

// 加载所有自定义脚本
async function loadCustomScripts() {
  initScriptsDir();
  
  try {
    const files = fs.readdirSync(SCRIPTS_DIR);
    const scripts = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(SCRIPTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const script = JSON.parse(content);
        scripts.push(script);
      }
    }
    
    return scripts;
  } catch (error) {
    console.error('加载自定义脚本失败:', error);
    return [];
  }
}

// 保存自定义脚本
async function saveCustomScript(script) {
  initScriptsDir();
  
  // 验证脚本
  if (!validateCustomScript(script)) {
    throw new Error('脚本验证失败');
  }
  
  // 确保ID唯一
  if (!script.id) {
    script.id = `custom-${Date.now()}`;
  }
  
  // 设置脚本类型
  script.type = 'custom';
  script.algorithm = 'custom';
  script.createdAt = script.createdAt || new Date().toISOString();
  script.updatedAt = new Date().toISOString();
  
  // 保存到文件
  const filePath = path.join(SCRIPTS_DIR, `${script.id}.json`);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(script, null, 2), 'utf8');
    return script;
  } catch (error) {
    console.error('保存自定义脚本失败:', error);
    throw new Error('保存脚本失败');
  }
}

// 删除自定义脚本
async function deleteCustomScript(id) {
  initScriptsDir();
  
  // 不能删除内置脚本
  if (id.startsWith('builtin-')) {
    throw new Error('不能删除内置脚本');
  }
  
  const filePath = path.join(SCRIPTS_DIR, `${id}.json`);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('删除自定义脚本失败:', error);
    throw new Error('删除脚本失败');
  }
}

// 验证自定义脚本
function validateCustomScript(script) {
  // 基本验证
  if (!script.name || typeof script.name !== 'string') {
    return false;
  }
  
  if (!script.description || typeof script.description !== 'string') {
    return false;
  }
  
  if (!script.script || typeof script.script !== 'string') {
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
    vm.runInContext(script.script, context);
  } catch (error) {
    console.error('脚本语法验证失败:', error);
    return false;
  }
  
  // 验证配置Schema
  if (script.configSchema && typeof script.configSchema !== 'object') {
    return false;
  }
  
  return true;
}

// 执行自定义脚本
function executeCustomScript(scriptId, value, config) {
  const vm = require('vm');
  
  try {
    // 加载脚本
    const scriptContent = fs.readFileSync(path.join(SCRIPTS_DIR, `${scriptId}.json`), 'utf8');
    const script = JSON.parse(scriptContent);
    
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
    const result = vm.runInContext(script.script, context);
    return parseInt(result) || 0;
  } catch (error) {
    console.error('执行自定义脚本失败:', error);
    return 0;
  }
}

// 导出模块
module.exports = {
  initScriptsDir,
  getAllScripts,
  getScriptById,
  saveCustomScript,
  deleteCustomScript,
  validateCustomScript,
  executeCustomScript,
  builtinScripts
};
