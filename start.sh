#!/bin/bash

# Notion Task Manager - 启动脚本
# 用于快速启动 Web 服务器

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🚀 Notion Task Manager                              ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装，请先安装 Python 3.9+"
    exit 1
fi

echo "✅ Python 版本: $(python3 --version)"

# 检查并激活虚拟环境
echo ""
echo "🔧 检查虚拟环境..."
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
    echo "✅ 虚拟环境创建完成"
fi

echo "🔌 激活虚拟环境..."
source venv/bin/activate

# 检查依赖
echo ""
echo "📦 检查 Python 依赖..."
if ! python -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask 未安装，正在安装依赖..."
    pip install -r requirements.txt
else
    echo "✅ Python 依赖已安装"
fi

# 检查前端构建
echo ""
echo "🎨 检查前端构建..."
if [ ! -d "frontend/dist" ]; then
    echo "⚠️  前端未构建，需要先构建前端"
    echo ""
    echo "请运行以下命令："
    echo "  cd frontend"
    echo "  npm install"
    echo "  npm run build"
    echo "  cd .."
    echo ""
    read -p "是否现在构建前端？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd frontend
        if ! command -v npm &> /dev/null; then
            echo "❌ npm 未安装，请先安装 Node.js"
            exit 1
        fi
        echo "📦 安装前端依赖..."
        npm install
        echo "🔨 构建前端..."
        npm run build
        cd ..
        echo "✅ 前端构建完成"
    else
        echo "⚠️  跳过前端构建，Web 界面可能无法正常显示"
    fi
else
    echo "✅ 前端已构建"
fi

# 检查环境变量
echo ""
echo "🔐 检查环境变量..."
if [ -f "tests/.env.test" ]; then
    echo "✅ 使用 tests/.env.test 文件"
    ENV_FILE="tests/.env.test"
elif [ -f ".env.test" ]; then
    echo "✅ 使用 .env.test 文件"
    ENV_FILE=".env.test"
elif [ -f ".env" ]; then
    echo "✅ 使用 .env 文件"
    ENV_FILE=".env"
else
    echo "⚠️  环境配置文件不存在"
    if [ -f ".env.example" ]; then
        echo "📝 从 .env.example 创建 .env 文件..."
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请编辑并填入你的配置"
        echo ""
        read -p "按 Enter 继续..."
        ENV_FILE=".env"
    else
        echo "❌ .env.example 文件也不存在"
        exit 1
    fi
fi

# 启动服务器
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🎉 准备就绪，启动服务器...                          ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查并释放端口
PORT=$(grep "^PORT=" $ENV_FILE 2>/dev/null | cut -d'=' -f2 | tr -d '"' || echo "5000")
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 被占用，正在释放..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    sleep 1
fi

# 加载环境变量并启动（正确处理行尾注释）
export $(cat $ENV_FILE | grep -v '^#' | grep -v '^$' | sed 's/#.*//' | xargs)
python backend/app.py
