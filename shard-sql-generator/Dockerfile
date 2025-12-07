# 使用轻量级的Node.js基础镜像
FROM node:lts-alpine

# 设置工作目录
WORKDIR /app

# 复制项目文件到工作目录
COPY . /app

# 暴露应用端口
EXPOSE 3000

# 设置启动命令
CMD ["node", "server.js"]
