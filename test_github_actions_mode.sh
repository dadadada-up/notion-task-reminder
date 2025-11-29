#!/bin/bash

echo "=========================================="
echo "  测试 GitHub Actions 模式"
echo "=========================================="
echo ""

# 模拟 GitHub Actions 环境变量
export REMINDER_TYPE="daily_todo"
export ACTION_TYPE="combined"
export SEND_TIME="08:00"
export FORCE_SEND="true"

echo "设置环境变量（模拟 GitHub Actions）:"
echo "  REMINDER_TYPE=$REMINDER_TYPE"
echo "  ACTION_TYPE=$ACTION_TYPE"
echo "  SEND_TIME=$SEND_TIME"
echo "  FORCE_SEND=$FORCE_SEND"
echo ""

echo "执行 main.py..."
echo "----------------------------------------"

cd /Users/dada/github项目/notion-task-reminder

# 激活虚拟环境
source venv/bin/activate

# 运行脚本（只显示前几行输出）
python src/main.py 2>&1 | head -n 50

echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo "请检查上面的输出，应该看到："
echo "  ✅ 使用环境变量配置: REMINDER_TYPE=daily_todo"
echo ""
