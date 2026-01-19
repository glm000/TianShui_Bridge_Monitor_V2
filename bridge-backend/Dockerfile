# 1. 使用官方 Node.js 18 (轻量版)
FROM node:18-alpine

# 2. 设置容器内的工作目录
WORKDIR /app

# 3. 先复制依赖描述文件 (利用缓存加速)
COPY package*.json ./

# 4. 安装依赖 (使用淘宝/阿里云镜像源，速度快)
RUN npm install --registry=https://registry.npmmirror.com

# 5. 把代码复制进去
COPY . .

# 6. 暴露端口 (假设你的程序用 3000 端口，如果不是请修改这里！)
EXPOSE 3000

# 7. 启动命令 (假设入口文件是 app.js 或 index.js，请根据你的实际情况修改！)
CMD ["node", "app.js"]