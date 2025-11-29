#!/bin/bash

# 统一测试入口脚本
# 用于运行所有测试

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🧪 Notion Task Manager - 测试套件                   ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查虚拟环境
if [ ! -d "../venv" ]; then
    echo "❌ 虚拟环境不存在，请先运行 start.sh 创建虚拟环境"
    exit 1
fi

# 激活虚拟环境
source ../venv/bin/activate

# 检查环境变量
if [ ! -f "../.env" ]; then
    echo "⚠️  .env 文件不存在，使用 .env.example"
    if [ -f "../.env.example" ]; then
        cp ../.env.example ../.env
    fi
fi

# 加载环境变量
export $(cat ../.env | grep -v '^#' | grep -v '^$' | xargs)

echo "📋 可用测试:"
echo "  1. 快速测试 (PushPlus 配置)"
echo "  2. 通知 API 测试"
echo "  3. 定时任务 API 测试"
echo "  4. 运行所有测试"
echo ""
read -p "请选择测试 (1-4): " choice

case $choice in
    1)
        echo "🚀 运行快速测试..."
        python quick_test.py
        ;;
    2)
        echo "🚀 运行通知 API 测试..."
        python integration/test_notification.py
        ;;
    3)
        echo "🚀 运行定时任务 API 测试..."
        python integration/test_schedule_api.py
        ;;
    4)
        echo "🚀 运行所有测试..."
        echo ""
        echo "=== 1. 快速测试 ==="
        python quick_test.py || true
        echo ""
        echo "=== 2. 通知 API 测试 ==="
        python integration/test_notification.py || true
        echo ""
        echo "=== 3. 定时任务 API 测试 ==="
        python integration/test_schedule_api.py || true
        echo ""
        echo "✅ 所有测试完成"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     ✅ 测试完成                                          ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
