# ========================
# 阶段一：构建环境 (用 Node.js 把 Vue 编译成 HTML)
# ========================
FROM node:22-alpine as build-stage

WORKDIR /app

# 1. 复制依赖清单
COPY package*.json ./

# 2. 安装依赖 (使用淘宝源加速)
RUN npm install --registry=https://registry.npmmirror.com

# 3. 复制所有源代码
COPY . .

# 4. 开始编译 (这会生成一个 dist 文件夹)
RUN npm run build


# ========================
# 阶段二：生产环境 (用 Nginx 运行网页)
# ========================
FROM nginx:stable-alpine as production-stage

# 1. 把刚才阶段一编译好的 dist 文件夹，复制到 Nginx 的肚子里
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 2. 复制我们自定义的 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]