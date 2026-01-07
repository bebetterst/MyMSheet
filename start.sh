#!/bin/bash

# 设置端口
FRONTEND_PORT=3099
BACKEND_PORT=5099

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 正在启动 pxcharts 项目..."

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "❌ 未检测到 pnpm，请先安装 pnpm (npm install -g pnpm)"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    pnpm install
else
    echo "✅ 依赖已安装"
fi

# 启动后端
echo "🔙 正在启动后端服务 (端口: $BACKEND_PORT)..."
pnpm run dev:backend &
BACKEND_PID=$!

# 注册清理函数，确保脚本退出时关闭后端
cleanup() {
    echo "🛑 正在关闭服务..."
    kill $BACKEND_PID
    exit
}
trap cleanup EXIT INT TERM

# 等待几秒确保后端启动
sleep 2

# 启动前端
echo "🎨 正在启动前端服务 (端口: $FRONTEND_PORT)..."
pnpm run dev:frontend
