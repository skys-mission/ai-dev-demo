// 分片SQL生成器 - HTTP服务器
// 纯Node.js原生实现，无第三方依赖

const http = require('http');
const fs = require('fs');
const path = require('path');

// 导入核心模块
const sqlGenerator = require('./core/sql-generator');
const scriptManager = require('./core/script-manager');

// 服务器配置
const config = {
  port: process.env.PORT || 3000,
  host: 'localhost',
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

// 处理API请求
function handleApiRequest(req, res) {
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

      // 设置响应头
      res.setHeader('Content-Type', 'application/json');

      // API路由处理
      switch (resource) {
        // 生成分片SQL
        case 'generate-sql':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const result = sqlGenerator.generateShardSQL(
              params.sql,
              params.shardKey,
              params.shardValue,
              params.shardId
            );
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, result }));
          } else {
            res.writeHead(405);
            res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          }
          break;

        // 批量生成分片SQL
        case 'batch-generate':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const result = sqlGenerator.generateBatchSQL(params);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, results: result }));
          } else {
            res.writeHead(405);
            res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          }
          break;

        // 计算分片ID
        case 'calculate-shard':
          if (req.method === 'POST') {
            const params = JSON.parse(body);
            const shardId = sqlGenerator.calculateShardId(
              params.value,
              params.algorithm,
              params.config
            );
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, shardId }));
          } else {
            res.writeHead(405);
            res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          }
          break;

        // 脚本管理
        case 'scripts':
          if (req.method === 'GET') {
            const scripts = await scriptManager.getAllScripts();
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, scripts }));
          } else if (req.method === 'POST') {
            const script = JSON.parse(body);
            const savedScript = await scriptManager.saveCustomScript(script);
            res.writeHead(201);
            res.end(JSON.stringify({ success: true, script: savedScript }));
          } else {
            res.writeHead(405);
            res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          }
          break;

        // 单个脚本管理
        case 'script':
          if (req.method === 'GET' && id) {
            const script = await scriptManager.getScriptById(id);
            if (script) {
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, script }));
            } else {
              res.writeHead(404);
              res.end(JSON.stringify({ success: false, error: 'Script not found' }));
            }
          } else if (req.method === 'PUT' && id) {
            const script = JSON.parse(body);
            script.id = id;
            const updatedScript = await scriptManager.saveCustomScript(script);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, script: updatedScript }));
          } else if (req.method === 'DELETE' && id) {
            const success = await scriptManager.deleteCustomScript(id);
            if (success) {
              res.writeHead(200);
              res.end(JSON.stringify({ success: true }));
            } else {
              res.writeHead(404);
              res.end(JSON.stringify({ success: false, error: 'Script not found' }));
            }
          } else {
            res.writeHead(405);
            res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
          }
          break;

        // 默认情况
        default:
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: 'API endpoint not found' }));
      }
    } catch (error) {
      console.error('API请求处理错误:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
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


