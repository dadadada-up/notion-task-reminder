#!/bin/bash

echo "=========================================="
echo "  测试通知发送修复"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000/api"

# 测试发送今日完成任务通知（PushPlus）
echo "📱 测试 1: 发送今日完成任务通知 (PushPlus)"
echo "----------------------------------------"
curl -X POST "$BASE_URL/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_done",
    "channels": ["pushplus"]
  }' | jq '.'

echo ""
echo ""

# 测试发送今日完成任务通知（邮箱）
echo "📧 测试 2: 发送今日完成任务通知 (邮箱)"
echo "----------------------------------------"
curl -X POST "$BASE_URL/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_done",
    "channels": ["email"]
  }' | jq '.'

echo ""
echo ""

# 测试发送今日完成任务通知（两个渠道）
echo "📱📧 测试 3: 发送今日完成任务通知 (PushPlus + 邮箱)"
echo "----------------------------------------"
curl -X POST "$BASE_URL/notify" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_done",
    "channels": ["pushplus", "email"]
  }' | jq '.'

echo ""
echo ""
echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo "请检查："
echo "  1. 后端日志中的详细输出"
echo "  2. PushPlus 是否收到消息"
echo "  3. 邮箱是否收到消息"
echo "  4. 返回的任务数据是否正确（只包含今天完成的任务）"
echo ""
