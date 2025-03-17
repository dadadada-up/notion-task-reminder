# Notion 任务数据库完整文档

本文档整合了 Notion 任务数据库的所有结构说明，包括各字段的定义、用途和代码使用示例。

## 目录

- [数据库基本信息](#数据库基本信息)
- [概述](#概述)
- [数据库结构图](#数据库结构图)
- [字段详细说明](#字段详细说明)
  - [文本字段](#文本字段)
  - [状态字段](#状态字段)
  - [四象限字段](#四象限字段)
  - [任务类型字段](#任务类型字段)
  - [负责人字段](#负责人字段)
  - [日期字段](#日期字段)
  - [数字和计算字段](#数字和计算字段)
  - [关系字段](#关系字段)
- [数据库视图](#数据库视图)
- [代码集成](#代码集成)

## 数据库基本信息

- **数据库名称**: 任务
- **数据库ID**: 7c4e8b9a5f6d2c1e3b7a9c8e5f2d1b3a
- **创建时间**: 2023-01-01
- **最后编辑时间**: 2023-12-31

## 概述

这是一个用于任务管理的 Notion 数据库，采用 GTD (Getting Things Done) 和四象限时间管理方法的原则设计。数据库支持任务的创建、分类、优先级排序、状态跟踪和时间管理，并通过关系字段建立任务之间的层级和依赖关系。

## 数据库结构图

```
任务数据库
├── 基本信息
│   ├── 任务名称 (title)
│   ├── 备注 (rich_text)
│   └── URL (url)
├── 分类与状态
│   ├── 状态 (select: inbox, pedding, doing, done)
│   ├── 四象限 (select: P0-P3)
│   └── 任务类型 (select: 家庭生活, 社交, 个人成长, 工作, 健康, 理财投资, 保险副业)
├── 时间管理
│   ├── 截止日期 (date)
│   ├── 创建日期 (created_time)
│   ├── 完成日期 (date)
│   ├── 预计时间 (number)
│   └── 实际时间 (number)
├── 任务关系
│   ├── 上级项目 (relation)
│   ├── 子级项目 (relation)
│   ├── 正在阻止 (relation)
│   └── 被阻止 (relation)
└── 其他
    ├── 负责人 (select: pp, dada)
    └── 进度 (formula)
```

## 字段详细说明

### 文本字段

#### 任务名称

- **字段名称**: 任务名称
- **字段类型**: title
- **字段ID**: title

##### 描述

任务名称是数据库的主标题字段，用于简明扼要地描述任务内容。每个任务必须有一个名称。

##### 在代码中的使用

```python
def get_task_name(task):
    """从任务对象中提取任务名称"""
    if not task or not task.get('properties'):
        return "未知任务"
    
    properties = task.get('properties', {})
    title_property = properties.get('任务名称', {})
    title = title_property.get('title', [])
    
    if title and len(title) > 0:
        return title[0].get('plain_text', '未知任务')
    return "未知任务"

# 在消息中显示任务名称
task_name = get_task_name(task)
message.append(f"📌 {task_name}")

# 根据任务名称排序
sorted_tasks = sorted(tasks, key=lambda x: get_task_name(x))
```

#### 备注

- **字段名称**: 备注
- **字段类型**: rich_text
- **字段ID**: %3Bj%3Bm

##### 描述

备注字段用于记录任务的详细说明、上下文信息或其他相关注释。可以包含格式化文本、链接等富文本内容。

##### 在代码中的使用

```python
# 获取任务备注
notes = []
if properties.get('备注') and properties['备注'].get('rich_text'):
    for text_item in properties['备注']['rich_text']:
        if text_item.get('plain_text'):
            notes.append(text_item.get('plain_text'))

# 在消息中显示备注
if notes:
    notes_text = ' '.join(notes)
    # 如果备注太长，截断显示
    if len(notes_text) > 100:
        notes_text = notes_text[:97] + '...'
    message.append(f"   📝 备注: {notes_text}")
```

#### URL

- **字段名称**: URL
- **字段类型**: url
- **字段ID**: %3Bj%3Bm

##### 描述

URL字段用于存储与任务相关的链接，可以是参考资料、相关文档或任务相关的网页链接。

##### 在代码中的使用

```python
# 获取任务URL
task_url = None
if properties.get('URL') and properties['URL'].get('url'):
    task_url = properties['URL']['url']

# 在消息中显示URL
if task_url:
    # 如果URL太长，使用短链接表示
    display_url = task_url
    if len(task_url) > 50:
        display_url = task_url[:47] + '...'
    message.append(f"   🔗 链接: {display_url}")
```

### 状态字段

- **字段名称**: 状态
- **字段类型**: status
- **字段ID**: ~W\`

#### 描述

状态字段用于跟踪任务的当前进度状态，从初始收集到最终完成。

#### 选项值

| 状态名称 | 状态ID | 颜色 | 描述 |
|---------|-------|------|------|
| inbox | QxVE | default | 新收集的任务，尚未开始处理 |
| pedding | sI@[ | default | 等待开始的任务 |
| doing | gjoD | blue | 正在进行中的任务 |
| done | b81e1b11-7200-43bc-940d-9c361936a670 | green | 已完成的任务 |

#### 状态分组

状态被分为三个主要分组：

| 分组名称 | 分组ID | 颜色 | 包含的状态 |
|---------|-------|------|-----------|
| To-do | 72331709-9ef5-4913-9efd-8acdea25036e | gray | inbox, pedding |
| In progress | b7cd0252-5a51-4a04-811b-dfb8a1680013 | blue | doing |
| Complete | 23d8eb0d-fa9b-4f2d-8244-5d1a77f59a4e | green | done |

#### 在代码中的使用

```python
status_obj = properties.get('状态', {})
status = status_obj.get('status', {}).get('name', 'unknown') if status_obj else 'unknown'
```

过滤条件示例：

```python
# 查询未完成的任务
filter_conditions = {
    "and": [
        {
            "property": "状态",
            "status": {
                "does_not_equal": "done"
            }
        }
    ]
}

# 查询已完成的任务
filter_conditions = {
    "and": [
        {
            "property": "状态",
            "status": {
                "equals": "done"
            }
        }
    ]
}
```

排序顺序：

```python
status_order = {'inbox': 0, 'pedding': 1, 'doing': 2, 'done': 3}
```

### 四象限字段

- **字段名称**: 四象限
- **字段类型**: select
- **字段ID**: tn@V

#### 描述

四象限字段基于时间管理矩阵理论，用于对任务进行优先级分类，帮助用户确定任务的重要性和紧急性。

#### 选项值

| 选项名称 | 选项ID | 颜色 | 描述 |
|---------|-------|------|------|
| P0 重要紧急 | JmX= | red | 既重要又紧急的任务，需要立即处理 |
| P1 重要不紧急 | h=\\Z | blue | 重要但不紧急的任务，需要规划和安排 |
| P2 紧急不重要 | <\`Sy | brown | 紧急但不重要的任务，可考虑委派 |
| P3 不重要不紧急 | LiDV | gray | 既不重要也不紧急的任务，可考虑删除或延后 |

#### 在代码中的使用

```python
priority_obj = properties.get('四象限', {})
priority = priority_obj.get('select', {}).get('name', 'P3') if priority_obj else 'P3'
```

处理优先级键值：

```python
priority_key = priority.split()[0] if ' ' in priority else priority  # 处理优先级格式，提取P0-P3部分
```

优先级排序：

```python
priority_order = {
    "P0 重要紧急": 0,
    "P1 重要不紧急": 1,
    "P2 紧急不重要": 2,
    "P3 不重要不紧急": 3
}

# 在排序中使用
tasks.sort(key=lambda x: (
    priority_order.get(x.get('priority', 'P3'), 999),
    status_order.get(x.get('status', 'unknown'), 999)
))
```

统计重要和紧急任务：

```python
# 统计重要和紧急任务
if priority_key in ['P0', 'P1']:
    important_count += 1
if priority_key == 'P0' or priority_key == 'P2':
    urgent_count += 1
```

### 任务类型字段

- **字段名称**: 任务类型
- **字段类型**: select
- **字段ID**: vZVW

#### 描述

任务类型字段用于对任务进行分类，帮助用户按照不同的生活和工作领域组织任务。

#### 选项值

| 选项名称 | 选项ID | 颜色 | 描述 |
|---------|-------|------|------|
| 家庭生活 | 7f18fac4-5c65-4dca-b8d0-92984463e12b | purple | 与家庭和日常生活相关的任务 |
| 社交 | cfbc9b69-e23e-4cd1-94fe-d4fe26818d1d | blue | 与社交活动和人际关系相关的任务 |
| 个人成长 | 4eb1fd95-1211-4aab-be55-052c73cb9501 | red | 与个人学习和成长相关的任务 |
| 工作 | a514dcce-1605-4b89-8b91-3d4c8530953f | yellow | 与职业和工作相关的任务 |
| 健康 | 39c03b69-c17d-4e02-a88d-f0287db9efc6 | brown | 与健康和健身相关的任务 |
| 理财投资 | 20e36ea5-d0b5-41b9-9441-992acdd73218 | pink | 与财务管理和投资相关的任务 |
| 保险副业 | cde65157-9290-46e1-a5f3-c426badafc35 | default | 与保险和副业相关的任务 |

#### 在代码中的使用

```python
task_type_obj = properties.get('任务类型', {})
task_type = task_type_obj.get('select', {}).get('name', '未分类') if task_type_obj else '未分类'
```

在消息格式化中使用：

```python
# 如果有优先级和任务类型，添加到任务信息中
if task_priority != 'P3' or task_type != '未分类':
    extra_info = []
    if task_priority != 'P3':
        extra_info.append(task_priority[:2])
    if task_type != '未分类':
        extra_info.append(task_type)
    if extra_info:
        task_line.append(f" ({' | '.join(extra_info)})")
```

统计任务类型：

```python
# 按任务类型统计
task_types = {}  # 按任务类型统计
task_types[task_type] = task_types.get(task_type, 0) + 1

# 生成任务类型统计
type_stats = "- 任务类型:\n"
for task_type, count in sorted(task_types.items(), key=lambda x: x[1], reverse=True):
    type_stats += f"  • {task_type}: {count}\n"
```

### 负责人字段

- **字段名称**: 负责人
- **字段类型**: select
- **字段ID**: mAG@

#### 描述

负责人字段用于指定任务的执行者，帮助在多人协作环境中明确任务的责任归属。

#### 选项值

| 选项名称 | 选项ID | 颜色 | 描述 |
|---------|-------|------|------|
| pp | []yc | green | 团队成员 pp |
| dada | Kbst | orange | 团队成员 dada |

#### 在代码中的使用

```python
assignee_obj = properties.get('负责人', {})
assignee = assignee_obj.get('select', {}).get('name', '未分配') if assignee_obj else '未分配'
```

按负责人分组任务：

```python
# 按负责人分组
tasks_by_assignee = {}

# 添加任务到对应负责人的列表中
if assignee not in tasks_by_assignee:
    tasks_by_assignee[assignee] = []
tasks_by_assignee[assignee].append(task_info)

# 生成每个负责人的任务消息
for assignee, tasks in tasks_by_assignee.items():
    # 计算任务总数
    total_tasks = len(tasks)
    message = [f"📋 待办任务 | {assignee} (共{total_tasks}条)\n"]
    # ...处理该负责人的任务...
```

### 日期字段

#### 截止日期

- **字段名称**: 截止日期
- **字段类型**: date
- **字段ID**: Ij%3Bj

##### 描述

截止日期字段用于指定任务需要完成的最后期限。可以设置具体日期，也可以包含时间。

##### 在代码中的使用

```python
# 获取截止日期
due_date = None
if properties.get('截止日期') and properties['截止日期'].get('date'):
    due_date_str = properties['截止日期']['date'].get('start')
    if due_date_str:
        # 转换为北京时间
        due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00')).astimezone(
            timezone(timedelta(hours=8)))

# 在消息中显示截止日期
if due_date:
    due_date_str = due_date.strftime('%Y-%m-%d %H:%M')
    message.append(f"   ⏰ 截止日期: {due_date_str}")
    
    # 检查是否即将到期
    now = datetime.now(timezone(timedelta(hours=8)))
    days_left = (due_date.date() - now.date()).days
    
    if days_left < 0:
        message.append(f"   ⚠️ 已逾期 {abs(days_left)} 天")
    elif days_left == 0:
        message.append(f"   ⚠️ 今日到期")
    elif days_left <= 3:
        message.append(f"   ⚠️ 还剩 {days_left} 天到期")
```

#### 创建日期

- **字段名称**: 创建日期
- **字段类型**: created_time
- **字段ID**: %3Bqkl

##### 描述

创建日期字段自动记录任务创建的时间，不可手动修改。

##### 在代码中的使用

```python
# 获取创建日期
created_time = None
if properties.get('创建日期') and properties['创建日期'].get('created_time'):
    created_time_str = properties['创建日期']['created_time']
    if created_time_str:
        created_time = datetime.fromisoformat(created_time_str.replace('Z', '+00:00')).astimezone(
            timezone(timedelta(hours=8)))

# 计算任务存在的天数
if created_time:
    now = datetime.now(timezone(timedelta(hours=8)))
    days_existed = (now.date() - created_time.date()).days
    if days_existed > 30:
        message.append(f"   ⏳ 已创建 {days_existed} 天")
```

#### 完成日期

- **字段名称**: 完成日期
- **字段类型**: date
- **字段ID**: %5Dj%3Bm

##### 描述

完成日期字段用于记录任务完成的日期。通常在任务状态变为"done"时手动或自动填写。

##### 在代码中的使用

```python
# 获取完成日期
completed_date = None
if properties.get('完成日期') and properties['完成日期'].get('date'):
    completed_date_str = properties['完成日期']['date'].get('start')
    if completed_date_str:
        completed_date = datetime.fromisoformat(completed_date_str.replace('Z', '+00:00')).astimezone(
            timezone(timedelta(hours=8)))

# 检查今日完成的任务
now = datetime.now(timezone(timedelta(hours=8)))
if completed_date and completed_date.date() == now.date():
    today_completed_tasks.append(task)
    
# 在晚间消息中显示今日完成的任务
if today_completed_tasks:
    evening_message.append("\n🎉 今日已完成的任务:")
    for task in today_completed_tasks:
        task_name = get_task_name(task)
        evening_message.append(f"✅ {task_name}")
```

### 数字和计算字段

#### 预计时间

- **字段名称**: 预计时间
- **字段类型**: number
- **字段ID**: %3Bj%3Bm
- **格式**: 小时（数字）

##### 描述

预计时间字段用于记录完成任务预计需要的时间，以小时为单位。这有助于任务规划和时间管理。

##### 在代码中的使用

```python
# 获取预计时间
estimated_time = None
if properties.get('预计时间') and properties['预计时间'].get('number') is not None:
    estimated_time = properties['预计时间']['number']

# 在消息中显示预计时间
if estimated_time:
    message.append(f"   ⏱️ 预计耗时: {estimated_time}小时")
    
# 计算总预计时间
total_estimated_time = sum(
    task.get('properties', {}).get('预计时间', {}).get('number', 0) or 0 
    for task in pending_tasks if task.get('properties')
)
if total_estimated_time > 0:
    message.append(f"\n总预计耗时: {total_estimated_time}小时")
```

#### 实际时间

- **字段名称**: 实际时间
- **字段类型**: number
- **字段ID**: %3Bj%3Bm
- **格式**: 小时（数字）

##### 描述

实际时间字段用于记录完成任务实际花费的时间，以小时为单位。这有助于与预计时间比较，改进未来的时间估计。

##### 在代码中的使用

```python
# 获取实际时间
actual_time = None
if properties.get('实际时间') and properties['实际时间'].get('number') is not None:
    actual_time = properties['实际时间']['number']

# 在消息中显示实际时间（针对已完成任务）
if task_status == "done" and actual_time:
    message.append(f"   ⏱️ 实际耗时: {actual_time}小时")
    
    # 比较预计时间和实际时间
    if estimated_time and actual_time > estimated_time * 1.2:
        message.append(f"   ⚠️ 耗时超出预期 {((actual_time/estimated_time)-1)*100:.0f}%")
    
# 计算今日完成任务的总实际时间
total_actual_time = sum(
    task.get('properties', {}).get('实际时间', {}).get('number', 0) or 0 
    for task in today_completed_tasks if task.get('properties')
)
if total_actual_time > 0:
    evening_message.append(f"\n今日总耗时: {total_actual_time}小时")
```

#### 进度

- **字段名称**: 进度
- **字段类型**: formula
- **字段ID**: %3Bj%3Bm
- **公式**: 基于任务状态计算的百分比

##### 描述

进度字段是一个计算字段，根据任务状态自动计算完成百分比。通常使用公式将不同状态映射到百分比值：
- inbox: 0%
- pedding: 25%
- doing: 50%
- done: 100%

##### 在代码中的使用

```python
# 获取进度
progress = None
if properties.get('进度') and properties['进度'].get('formula') and properties['进度']['formula'].get('number') is not None:
    progress = properties['进度']['formula']['number']

# 在消息中显示进度
if progress is not None and progress < 100:
    progress_bar = generate_progress_bar(progress)
    message.append(f"   {progress_bar} {progress}%")
    
# 生成进度条函数
def generate_progress_bar(percentage, length=10):
    """生成文本进度条"""
    if percentage < 0:
        percentage = 0
    if percentage > 100:
        percentage = 100
        
    filled_length = int(length * percentage / 100)
    bar = '█' * filled_length + '░' * (length - filled_length)
    return bar
```

### 关系字段

#### 上级项目

- **字段名称**: 上级 项目
- **字段类型**: relation
- **字段ID**: GWIU
- **关联数据库**: 同一数据库（自引用）
- **双向关系**: 与"子级 项目"字段互为双向关系

##### 描述

上级项目字段用于指定当前任务的父任务，建立任务的层级结构。一个任务可以有多个父任务。

##### 在代码中的使用

```python
parent_relations = properties.get('上级 项目', {}).get('relation', []) if properties.get('上级 项目') else []
parent_ids = [p.get('id') for p in parent_relations if p and p.get('id')]
```

#### 子级项目

- **字段名称**: 子级 项目
- **字段类型**: relation
- **字段ID**: nMNi
- **关联数据库**: 同一数据库（自引用）
- **双向关系**: 与"上级 项目"字段互为双向关系

##### 描述

子级项目字段用于指定当前任务的子任务，建立任务的层级结构。一个任务可以有多个子任务。

##### 在代码中的使用

```python
child_relations = properties.get('子级 项目', {}).get('relation', []) if properties.get('子级 项目') else []
child_ids = [c.get('id') for c in child_relations if c and c.get('id')]
```

#### 正在阻止

- **字段名称**: 正在阻止
- **字段类型**: relation
- **字段ID**: ]TqZ
- **关联数据库**: 同一数据库（自引用）
- **双向关系**: 与"被阻止"字段互为双向关系

##### 描述

正在阻止字段用于指定当前任务阻止的其他任务，建立任务的依赖关系。一个任务可以阻止多个其他任务。

##### 在代码中的使用

```python
blocking_relations = properties.get('正在阻止', {}).get('relation', []) if properties.get('正在阻止') else []
blocking_ids = [b.get('id') for b in blocking_relations if b and b.get('id')]
```

#### 被阻止

- **字段名称**: 被阻止
- **字段类型**: relation
- **字段ID**: vGyZ
- **关联数据库**: 同一数据库（自引用）
- **双向关系**: 与"正在阻止"字段互为双向关系

##### 描述

被阻止字段用于指定阻止当前任务的其他任务，建立任务的依赖关系。一个任务可以被多个其他任务阻止。

##### 在代码中的使用

```python
blocked_by = properties.get('被阻止', {}).get('relation', []) if properties.get('被阻止') else []

# 在消息格式化中显示阻止关系
if blocked_by:
    blocked_names = []
    for b in blocked_by:
        if b:
            title_array = b.get('title', [{}])
            if title_array and len(title_array) > 0:
                blocked_name = title_array[0].get('plain_text', '未知任务')
                blocked_names.append(blocked_name)
    if blocked_names:
        message.append(f"   ⛔️ 被阻止: {', '.join(blocked_names)}")
```

## 数据库视图

数据库配置了多个视图以满足不同的任务管理需求：

1. **看板视图** - 按状态分组的任务看板
2. **日历视图** - 按截止日期显示的任务日历
3. **表格视图** - 所有任务的详细信息表格
4. **甘特图** - 任务的时间线视图
5. **按优先级分组** - 按四象限优先级分组的任务列表
6. **按负责人分组** - 按任务执行者分组的任务列表

## 代码集成

本文档中的各个字段说明包含了在 Python 代码中访问和处理这些字段的示例。这些代码示例主要用于：

1. 从 Notion API 获取任务数据
2. 处理和格式化任务信息
3. 生成任务提醒消息
4. 按不同条件筛选和排序任务
5. 计算任务统计信息 