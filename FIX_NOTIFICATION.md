# 🔧 通知发送问题修复说明

## 问题描述

### 问题 1: PushPlus 无法收到"今日完成"消息
**现象**: 通过前端发送提醒时，选择 PushPlus 渠道发送"今日完成"消息，无法收到通知，但邮箱可以收到。

### 问题 2: "今日完成"消息数据不准确
**现象**: "今日完成"消息应该只显示状态=已完成且完成时间在今天的任务，但实际显示了所有已完成的任务。

---

## 修复内容

### 修复 1: 优化今日完成任务的查询逻辑

**文件**: `backend/services/notion_service.py`

**修改位置**: `get_tasks_for_notification` 方法

**修改前**:
```python
if is_done:
    # 查询今天已完成的任务
    filter_conditions = {
        "and": [{
            "property": "状态",
            "status": {"equals": "已完成"}
        }]
    }
```

**修改后**:
```python
if is_done:
    # 查询今天已完成的任务（状态=已完成 且 完成时间在今天）
    filter_conditions = {
        "and": [
            {
                "property": "状态",
                "status": {"equals": "已完成"}
            },
            {
                "property": "任务完成时间",
                "date": {"equals": today_str}
            }
        ]
    }
```

**效果**: 现在只会查询今天完成的任务，而不是所有已完成的任务。

---

### 修复 2: 添加详细的调试日志

**文件 1**: `backend/services/push_service.py`

**添加内容**:
```python
print(f"[PushService] 发送请求到 PushPlus...")
print(f"[PushService] 标题: {data['title']}")
print(f"[PushService] 内容长度: {len(data['content'])} 字符")
print(f"[PushService] HTTP 状态码: {response.status_code}")
print(f"[PushService] 响应: {result}")
```

**文件 2**: `backend/app.py`

**添加内容**:
```python
print(f"\n[API /notify] 收到请求:")
print(f"  类型: {notification_type}")
print(f"  渠道: {channels}")
print(f"[API /notify] 处理类型: {ntype} (is_done={is_done})")
print(f"[API /notify] 获取到 {len(tasks)} 个任务")
print(f"[API /notify] PushPlus 结果: {push_result}")
```

**效果**: 可以在后端日志中看到详细的执行过程，方便排查问题。

---

## 测试步骤

### 步骤 1: 准备测试数据

确保你的 Notion 数据库中有：
1. 至少一个状态=已完成，且完成时间=今天的任务
2. 至少一个状态=已完成，但完成时间不是今天的任务（用于验证筛选）

### 步骤 2: 重启服务器

```bash
# 停止当前服务器
lsof -ti:5000 | xargs kill -9

# 重启服务器
./start.sh
```

### 步骤 3: 测试前端发送

1. 访问 http://localhost:5000
2. 点击「发送提醒」按钮
3. 选择「✅ 今日完成」
4. 选择「📱 PushPlus」渠道
5. 点击「发送」
6. 查看后端日志输出

### 步骤 4: 使用测试脚本

```bash
chmod +x test_notify_fix.sh
./test_notify_fix.sh
```

---

## 预期结果

### 1. 数据筛选正确

**查看后端日志**，应该看到类似：
```
[API /notify] 收到请求:
  类型: daily_done
  渠道: ['pushplus']
  
[API /notify] 处理类型: daily_done (is_done=True)
[API /notify] 获取到 2 个任务  # 只有今天完成的任务
```

### 2. PushPlus 发送成功

**查看后端日志**，应该看到：
```
[PushService] 发送请求到 PushPlus...
[PushService] 标题: ✅ 今日完成任务 [abc1]
[PushService] 内容长度: 1234 字符
[PushService] HTTP 状态码: 200
[PushService] 响应: {'code': 200, 'msg': '请求成功', 'data': '...'}
[PushService] ✅ 发送成功
```

### 3. 收到通知

- **PushPlus**: 微信公众号收到推送
- **邮箱**: 收到邮件

### 4. 消息内容正确

通知中只包含今天完成的任务，不包含历史已完成的任务。

---

## 可能的问题和解决方案

### 问题 1: 仍然收不到 PushPlus 通知

**排查步骤**:

1. **检查日志中的 HTTP 状态码**
   ```
   [PushService] HTTP 状态码: 200  # 应该是 200
   ```

2. **检查 PushPlus API 响应**
   ```
   [PushService] 响应: {'code': 200, ...}  # code 应该是 200
   ```

3. **检查 PushPlus Token**
   - 确认 `.env` 文件中的 `PUSHPLUS_TOKEN` 正确
   - Token 长度应该大于 8 位
   - 可以在 PushPlus 官网测试 Token 是否有效

4. **检查消息内容长度**
   ```
   [PushService] 内容长度: 1234 字符  # 不应该过长
   ```
   - PushPlus 有消息长度限制
   - 如果内容过长，可能被截断或拒绝

### 问题 2: 获取到的任务数量为 0

**可能原因**:
- 今天没有完成任何任务
- Notion 数据库中的"任务完成时间"字段未填写

**解决方法**:
1. 在 Notion 中完成一个任务
2. 确保"任务完成时间"字段自动填充为今天的日期
3. 重新测试

### 问题 3: 邮箱可以收到但 PushPlus 不行

**可能原因**:
- PushPlus Token 配置错误
- PushPlus 服务暂时不可用
- 消息格式不符合 PushPlus 要求

**解决方法**:
1. 查看后端日志中的详细错误信息
2. 访问 PushPlus 官网检查服务状态
3. 尝试使用 PushPlus 官网的测试功能

---

## 验证清单

- [ ] 后端日志显示正确的任务数量（只包含今天完成的）
- [ ] 后端日志显示 PushPlus 发送成功
- [ ] PushPlus 微信公众号收到推送
- [ ] 邮箱收到邮件
- [ ] 消息内容只包含今天完成的任务
- [ ] 前端显示发送成功

---

## 技术细节

### Notion API 查询条件

**今日完成任务的查询条件**:
```json
{
  "and": [
    {
      "property": "状态",
      "status": {"equals": "已完成"}
    },
    {
      "property": "任务完成时间",
      "date": {"equals": "2025-11-29"}  // 今天的日期
    }
  ]
}
```

### PushPlus API 请求格式

```json
{
  "token": "your_pushplus_token",
  "title": "✅ 今日完成任务 [abc1]",
  "content": "<html>...</html>",
  "template": "html"
}
```

---

## 后续优化建议

1. **添加重试机制**: 如果 PushPlus 发送失败，自动重试 2-3 次
2. **消息去重**: 避免短时间内重复发送相同消息
3. **错误通知**: 如果发送失败，通过其他渠道通知用户
4. **消息队列**: 对于大量任务，使用队列异步发送

---

## 修复完成时间

- **修复日期**: 2025-11-29
- **修复版本**: v2.0.1
- **修复人**: Cascade AI

---

## 联系支持

如果问题仍然存在，请提供：
1. 后端完整日志
2. PushPlus Token（前3位和后3位）
3. 今天完成的任务数量
4. 前端错误信息（如有）

祝使用愉快！ 🎉
