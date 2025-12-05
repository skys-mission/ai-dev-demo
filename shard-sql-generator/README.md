# 分片SQL生成器

一个用于生成DB分片SQL的平台，支持各种分片算法和自定义脚本管理。

## 功能特性

- ✨ **SQL生成**：快速生成针对DB分片的临时SQL
- 📊 **多种分片算法**：支持取模、范围、哈希、一致性哈希、日期等多种分片算法
- 📝 **脚本管理**：内置分片规则脚本，支持用户自定义脚本管理
- 🎨 **高级UI界面**：简洁、易用的现代化界面，支持深色/浅色主题切换
- 🚀 **纯Node.js实现**：仅使用原生库，无需第三方依赖
- 📦 **双重部署方案**：支持裸机部署和Docker部署

## 技术栈

- **后端**：Node.js 原生 (无第三方依赖)
- **前端**：HTML5 + CSS3 + JavaScript (原生)
- **存储**：JSON文件存储
- **部署**：裸机部署 / Docker容器

## 裸机部署

### 环境要求

- Node.js 14.0.0 或更高版本
- Git (可选)

### 安装步骤

1. **克隆或下载项目**

   ```bash
   # 克隆项目 (或直接下载ZIP包)
   git clone https://github.com/yourusername/shard-sql-generator.git
   cd shard-sql-generator
   ```

2. **安装依赖**

   ```bash
   # 本项目无第三方依赖，直接跳过此步骤
   ```

3. **启动应用**

   ```bash
   # 方式一：直接运行
   node server.js
   
   # 方式二：使用npm脚本
   npm start
   
   # 方式三：使用环境变量指定端口
   PORT=8080 node server.js
   ```

4. **访问应用**

   在浏览器中访问：`http://localhost:3000`

### 目录结构

```
shard-sql-generator/
├── core/                 # 核心功能模块
│   ├── sql-generator.js  # 分片SQL生成器
│   └── script-manager.js # 脚本管理器
├── data/                 # 数据存储目录
│   └── scripts/          # 自定义脚本存储
├── public/               # 静态文件目录
│   ├── index.html        # 主页面
│   ├── styles.css        # 样式文件
│   └── app.js            # 前端逻辑
├── server.js             # 服务器入口
├── package.json          # 项目配置
├── README.md             # 项目说明
├── 需求文档.md           # 详细需求文档
└── 开发博客.md           # 开发过程记录
```

## Docker部署

### 环境要求

- Docker 19.03 或更高版本

### 部署步骤

1. **构建Docker镜像**

   ```bash
   docker build -t shard-sql-generator .
   ```

2. **运行Docker容器**

   ```bash
   docker run -d -p 3000:3000 --name shard-sql-generator shard-sql-generator
   ```

3. **访问应用**

   在浏览器中访问：`http://localhost:3000`

### Docker Compose (可选)

```yaml
version: '3'
services:
  shard-sql-generator:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    restart: always
```

使用Docker Compose启动：

```bash
docker-compose up -d
```

## 使用指南

### 基本操作

1. **选择分片算法**：在左侧面板选择适合的分片算法
2. **配置参数**：根据所选算法配置相应参数
3. **输入SQL**：在中间面板输入原始SQL语句
4. **输入分片键**：输入分片键的值
5. **生成分片SQL**：点击"生成分片SQL"按钮
6. **查看结果**：在右侧面板查看生成的分片SQL

### 支持的分片算法

1. **取模算法**：根据分片键的值进行取模运算
2. **范围分片**：根据分片键的值范围确定分片ID
3. **哈希分片**：对分片键进行哈希运算
4. **一致性哈希**：适用于动态增减分片的场景
5. **日期分片**：根据日期格式确定分片ID
6. **自定义脚本**：用户可以编写自定义分片规则脚本

### 脚本管理

- **内置脚本**：系统提供多种常用分片算法脚本
- **自定义脚本**：支持创建、编辑、删除自定义分片脚本
- **参数传递**：自定义脚本支持传递参数

## 安全注意事项

- **生产环境**：建议在生产环境前添加反向代理（如Nginx）并配置SSL
- **访问控制**：建议限制访问IP或添加认证机制
- **自定义脚本**：运行自定义脚本存在安全风险，请确保只允许可信任的用户使用

## 性能优化

- **JSON存储**：对于大量自定义脚本，建议考虑使用数据库存储
- **缓存机制**：可以添加缓存层以提高频繁访问脚本的性能
- **并发控制**：高并发场景下建议添加适当的并发控制

## 开发说明

本项目仅使用Node.js原生库实现，无需安装任何第三方依赖。

### 开发命令

```bash
# 启动开发服务器
npm run dev
```

### 代码结构

- `core/`：核心业务逻辑
- `public/`：前端静态资源
- `data/`：数据存储目录

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- [GitHub Issues](https://github.com/yourusername/shard-sql-generator/issues)

---

**项目地址**：[https://github.com/yourusername/shard-sql-generator](https://github.com/yourusername/shard-sql-generator)
