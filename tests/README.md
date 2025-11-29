# 🧪 测试套件

本目录包含 Notion Task Manager 项目的测试脚本和工具。

## 📁 目录结构

```
tests/
├── integration/           # 集成测试
│   ├── test_notification.py    # 通知 API 测试
│   └── test_schedule_api.py    # 定时任务 API 测试
├── scripts/              # 测试辅助脚本
│   ├── test_github_actions_mode.sh  # GitHub Actions 模式测试
│   ├── test_new_features.sh         # 新功能测试
│   └── test_notify_fix.sh           # 通知修复测试
├── outputs/              # 测试输出文件
│   └── test_output_email.html       # 邮件测试输出
├── quick_test.py         # PushPlus 快速测试
├── run_tests.sh          # 统一测试入口 ⭐
└── README.md             # 本文件
```

## 🚀 快速开始

### 运行所有测试

```bash
cd tests
./run_tests.sh
```

### 运行特定测试

```bash
# 1. PushPlus 快速测试
python quick_test.py

# 2. 通知 API 测试
python integration/test_notification.py

# 3. 定时任务 API 测试
python integration/test_schedule_api.py
```

### 运行测试脚本

```bash
# GitHub Actions 模式测试
./scripts/test_github_actions_mode.sh

# 新功能测试
./scripts/test_new_features.sh

# 通知修复测试
./scripts/test_notify_fix.sh
```

## 📋 测试说明

### 集成测试

#### test_notification.py
测试通知发送功能，包括：
- PushPlus 推送
- 邮件发送
- 多渠道推送

**使用方法**:
```bash
# 确保后端服务正在运行
cd ..
python backend/app.py

# 在另一个终端运行测试
cd tests
python integration/test_notification.py
```

#### test_schedule_api.py
测试定时任务 API，包括：
- 获取定时任务配置
- 保存定时任务配置
- 时间转换功能

**使用方法**:
```bash
python integration/test_schedule_api.py
```

### 快速测试

#### quick_test.py
快速验证 PushPlus 配置，包括：
- Token 验证
- API 连接测试
- 消息发送测试

**使用方法**:
```bash
# 设置环境变量
export PUSHPLUS_TOKEN="your_token_here"

# 运行测试
python quick_test.py
```

### 测试脚本

#### test_github_actions_mode.sh
测试 GitHub Actions 模式下的功能

#### test_new_features.sh
测试新功能的 API 接口

#### test_notify_fix.sh
测试通知发送修复后的功能

## ⚙️ 环境配置

### 环境变量

测试需要以下环境变量：

```bash
# Notion 配置
NOTION_TOKEN="your_notion_token"
DATABASE_ID="your_database_id"

# 推送配置
PUSHPLUS_TOKEN="your_pushplus_token"

# 邮件配置（可选）
EMAIL_ENABLED="true"
EMAIL_SMTP_SERVER="smtp.163.com"
EMAIL_SMTP_PORT="465"
EMAIL_SENDER="your_email@163.com"
EMAIL_PASSWORD="your_password"
EMAIL_RECEIVER="your_email@163.com"
```

### 使用 .env 文件

```bash
# 复制示例配置
cp ../.env.example ../.env

# 编辑配置
vim ../.env

# 加载环境变量
export $(cat ../.env | grep -v '^#' | xargs)
```

## ⚠️ 注意事项

1. **环境配置**: 确保环境变量已正确配置
2. **虚拟环境**: 运行前需激活虚拟环境
3. **API 限制**: 注意 Notion API 和 PushPlus 的调用频率限制
4. **测试数据**: 某些测试可能会修改 Notion 数据库，请谨慎使用
5. **服务依赖**: 集成测试需要后端服务正在运行

## 📝 添加新测试

### 创建集成测试

1. 在 `integration/` 目录创建测试文件
2. 文件命名: `test_*.py`
3. 添加适当的错误处理
4. 更新本 README

示例:
```python
#!/usr/bin/env python3
"""
测试描述
"""
import requests
import json

def test_feature():
    """测试功能"""
    url = "http://localhost:5000/api/endpoint"
    response = requests.get(url)
    
    if response.status_code == 200:
        print("✅ 测试通过")
    else:
        print("❌ 测试失败")

if __name__ == "__main__":
    test_feature()
```

### 创建测试脚本

1. 在 `scripts/` 目录创建脚本文件
2. 文件命名: `test_*.sh`
3. 添加执行权限: `chmod +x scripts/test_*.sh`
4. 更新本 README

## 🔗 相关链接

- [项目主页](../README.md)
- [API 文档](../docs/API_REFERENCE.md)
- [开发指南](../docs/DEVELOPMENT.md)

---

**提示**: 使用 `./run_tests.sh` 可以交互式运行所有测试
