#!/bin/bash

echo "=========================================="
echo "  测试新功能"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000/api"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -e "${YELLOW}测试: $name${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ 成功 (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}"
        echo "$body"
    fi
    echo ""
}

# 1. 测试健康检查
test_api "健康检查" "GET" "/health"

# 2. 测试获取配置（脱敏）
test_api "获取系统配置" "GET" "/config"

# 3. 测试获取定时任务配置
test_api "获取定时任务配置" "GET" "/schedule"

# 4. 测试保存定时任务配置（示例）
echo -e "${YELLOW}测试: 保存定时任务配置${NC}"
echo "注意：这将更新 GitHub Actions workflow"
echo "跳过此测试以避免意外修改..."
echo ""

# 5. 测试发送通知（示例）
echo -e "${YELLOW}测试: 发送通知 API${NC}"
echo "注意：这将实际发送通知"
echo "跳过此测试以避免发送垃圾消息..."
echo ""

echo "=========================================="
echo "  测试完成"
echo "=========================================="
echo ""
echo "请在浏览器中访问 http://localhost:5000 测试前端功能："
echo "  1. 点击「发送提醒」按钮 - 测试 NotificationModal"
echo "  2. 点击「系统配置」按钮 - 测试 ConfigSettings"
echo "  3. 点击「定时设置」按钮 - 测试 ScheduleSettings（已增强）"
echo ""
