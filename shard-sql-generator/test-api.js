// 测试API端点是否正常工作
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`状态码: ${res.statusCode}`);
    console.log('响应头:', res.headers);
    console.log('响应体:', data);
  });
});

req.on('error', (e) => {
  console.error(`请求错误: ${e.message}`);
});

// 发送请求数据
const requestData = {
  sql: 'SELECT * FROM users WHERE user_id = ?',
  shardKey: 'user_id',
  shardKeyValues: ['1001'],
  shardAlgorithm: 'mod',
  algorithmParams: { modValue: 4 }
};

req.write(JSON.stringify(requestData));
req.end();
