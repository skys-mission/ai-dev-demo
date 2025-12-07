// 分片SQL生成器 - HTTP服务器
// 纯Node.js原生实现，无第三方依赖

const http = require('http');
const fs = require('fs');
const path = require('path');

// 导入核心模块
const sqlGenerator = require('./core/sql-generator');

// 服务器配置
const config = {
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
  staticDir: './public',
  dataDir: './data'
};

// 确保数据目录存在
if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

// 确保公共目录存在
if (!fs.existsSync(config.staticDir)) {
  fs.mkdirSync(config.staticDir, { recursive: true });
}

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 读取静态文件
function serveStaticFile(filePath, res) {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// 统一响应处理函数
function sendResponse(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(statusCode);
  res.end(JSON.stringify(data));
}

// 统一错误处理函数
function sendError(res, statusCode, message, details = null) {
  const errorResponse = { 
    success: false, 
    error: message 
  };
  if (details) {
    errorResponse.details = details;
  }
  sendResponse(res, statusCode, errorResponse);
}

// 参数验证函数
function validateParams(params, requiredFields) {
  for (const field of requiredFields) {
    if (!params.hasOwnProperty(field) || params[field] === undefined || params[field] === null) {
      return { valid: false, missingField: field };
    }
  }
  return { valid: true };
}

// 处理API请求
async function handleApiRequest(req, res) {
  // 解析请求体
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    try {
      // 解析请求路径
      const path = req.url.replace('/api/', '');
      const [resource, id] = path.split('/');

      // API路由处理
      switch (resource) {
        // 生成分片SQL
        case 'generate-sql':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const validation = validateParams(params, ['sql', 'shardKey', 'shardValue']);
            if (!validation.valid) {
              return sendError(res, 400, `缺少必填参数: ${validation.missingField}`);
            }
            try {
              const result = sqlGenerator.generateShardSQL(
                params.sql,
                params.shardKey,
                params.shardValue,
                params.shardId
              );
              sendResponse(res, 200, { success: true, result });
            } catch (err) {
              return sendError(res, 400, 'SQL生成失败', err.message);
            }
          } else {
            sendError(res, 405, 'Method not allowed');
          }
          break;

        // 批量生成分片SQL
        case 'batch-generate':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const validation = validateParams(params, ['sql', 'shardKey', 'shardValues', 'shardAlgorithm']);
            if (!validation.valid) {
              return sendError(res, 400, `缺少必填参数: ${validation.missingField}`);
            }
            try {
              const result = sqlGenerator.generateBatchSQL(params);
              sendResponse(res, 200, { success: true, results: result });
            } catch (err) {
              return sendError(res, 400, '批量SQL生成失败', err.message);
            }
          } else {
            sendError(res, 405, 'Method not allowed');
          }
          break;
          
        // 新的生成分片SQL端点（匹配前端调用）
        case 'generate':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const validation = validateParams(params, ['sql', 'shardKey', 'shardKeyValues', 'shardAlgorithm']);
            if (!validation.valid) {
              return sendError(res, 400, `缺少必填参数: ${validation.missingField}`);
            }
            try {
              // 将前端参数映射到后端期望的格式
              const batchParams = {
                sql: params.sql,
                shardKey: params.shardKey,
                shardValues: params.shardKeyValues,
                algorithm: params.shardAlgorithm,
                algorithmConfig: {}
              };
              
              // 对于自定义算法，从customScript字段获取脚本字符串
              if (params.shardAlgorithm === 'custom') {
                batchParams.algorithmConfig.script = params.customScript;
              } else {
                batchParams.algorithmConfig = params.algorithmParams || {};
              }
              
              const results = sqlGenerator.generateBatchSQL(batchParams);
              const aggregateSQL = sqlGenerator.generateAggregateSQL(results.map(r => r.sql), params.sql);
              
              sendResponse(res, 200, { 
                success: true, 
                shardSQL: results.map(r => r.sql), 
                aggregateSQL: aggregateSQL 
              });
            } catch (err) {
              return sendError(res, 400, 'SQL生成失败', err.message);
            }
          } else {
            sendError(res, 405, 'Method not allowed');
          }
          break;

        // 计算分片ID
        case 'calculate-shard':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const validation = validateParams(params, ['value', 'algorithm']);
            if (!validation.valid) {
              return sendError(res, 400, `缺少必填参数: ${validation.missingField}`);
            }
            try {
              const shardId = sqlGenerator.calculateShardId(
                params.value,
                params.algorithm,
                params.config || {}
              );
              sendResponse(res, 200, { success: true, shardId });
            } catch (err) {
              return sendError(res, 400, '分片ID计算失败', err.message);
            }
          } else {
            sendError(res, 405, 'Method not allowed');
          }
          break;



        // 默认情况
        default:
          sendError(res, 404, 'API endpoint not found');
      }
    } catch (error) {
      console.error('API请求处理错误:', error);
      sendError(res, 500, 'Internal server error', error.message);
    }
  });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // CORS配置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 处理API请求
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }

  // 处理静态文件请求
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(config.staticDir, filePath);

  // 确保文件路径在静态目录内（防止路径遍历攻击）
  const resolvedPath = path.resolve(filePath);
  const resolvedStaticDir = path.resolve(config.staticDir);
  
  if (resolvedPath.startsWith(resolvedStaticDir)) {
    serveStaticFile(resolvedPath, res);
  } else {
    res.writeHead(403, { 'Content-Type': 'text/html' });
    res.end('<h1>403 Forbidden</h1>', 'utf-8');
  }
});

// 启动服务器
server.listen(config.port, config.host, () => {
  console.log(`\n分片SQL生成器服务器已启动`);
  console.log(`访问地址: http://${config.host}:${config.port}`);
  console.log(`按 Ctrl+C 停止服务器\n`);
});

// 处理服务器关闭
process.on('SIGINT', () => {
  console.log('\n服务器正在关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});


