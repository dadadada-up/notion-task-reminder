import requests
from datetime import datetime, timezone
import pytz
import os

# 修改配置信息部分
NOTION_TOKEN = os.environ.get('NOTION_TOKEN', "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")
DATABASE_ID = os.environ.get('DATABASE_ID', "192ed4b7aaea81859bbbf3ad4ea54b56")
PUSHPLUS_TOKEN = os.environ.get('PUSHPLUS_TOKEN', "3cfcadc8fcf744769292f0170e724ddb")

# 四象限优先级
PRIORITY_ORDER = {
    "P0 重要紧急": 0,
    "P1 重要不紧急": 1,
    "P2 紧急不重要": 2,
    "P3 不重要不紧急": 3
}

def get_notion_tasks(is_evening=False):
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    if is_evening:
        # 晚上查询当天已完成的任务
        body = {
            "filter": {
                "and": [
                    {
                        "property": "状态",
                        "status": {
                            "equals": "已完成"
                        }
                    }
                ]
            },
            "sorts": [
                {
                    "timestamp": "last_edited_time",
                    "direction": "descending"
                }
            ]
        }
    else:
        # 早上的待办任务查询保持不变
        body = {
            "filter": {  # 添加 filter 包装
                "and": [
                    {
                        "or": [
                            {
                                "property": "状态",
                                "status": {
                                    "equals": "还未开始"
                                }
                            },
                            {
                                "property": "状态",
                                "status": {
                                    "equals": "进行中"
                                }
                            }
                        ]
                    },
                    {
                        "property": "开始日期",
                        "date": {
                            "on_or_before": today
                        }
                    }
                ]
            },
            "sorts": [
                {
                    "property": "四象限",
                    "direction": "ascending"
                }
            ]
        }
    
    try:
        print("正在发送请求到Notion API...")
        print(f"查询条件: {body}")  # 添加这行来打印查询条件
        response = requests.post(
            f"https://api.notion.com/v1/databases/{DATABASE_ID}/query",
            headers=headers,
            json=body
        )
        print(f"Notion API响应状态码: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Notion API错误: {response.text}")
            return {"results": []}
            
        return response.json()
    except Exception as e:
        print(f"获取Notion任务时出错: {str(e)}")
        return {"results": []}

def format_message(tasks_data):
    messages = []
    tasks_by_assignee = {}
    
    # 初始化数据结构
    for result in tasks_data.get('results', []):
        properties = result.get('properties', {})
        
        # 获取任务信息 - 使用正确的属性名称
        name = properties.get('任务名称', {}).get('title', [{}])[0].get('plain_text', '未命名任务')
        assignee = properties.get('负责人', {}).get('people', [{}])[0].get('name', '未分配') if properties.get('负责人', {}).get('people') else '未分配'
        priority = properties.get('四象限', {}).get('select', {}).get('name', 'P3 不重要不紧急')
        task_type = properties.get('任务类型', {}).get('select', {}).get('name', '未分类')
        due_date = properties.get('截止日期', {}).get('date', {}).get('start', '未设置')
        
        # 计算逾期天数
        days_diff = None
        if due_date and due_date != '未设置':
            try:
                due_datetime = datetime.strptime(due_date, '%Y-%m-%d').date()
                today = datetime.now().date()
                days_diff = (due_datetime - today).days
            except:
                days_diff = None
        
        # 初始化该负责人的任务字典
        if assignee not in tasks_by_assignee:
            tasks_by_assignee[assignee] = {
                'P0': [],
                'P1': [],
                'P2': [],
                'P3': []
            }
        
        # 确定优先级类别
        priority_key = 'P' + str(PRIORITY_ORDER.get(priority, 3))
        
        # 添加任务
        tasks_by_assignee[assignee][priority_key].append({
            'name': name,
            'type': task_type,
            'due_date': due_date,
            'days_diff': days_diff
        })
    
    for assignee, priorities in tasks_by_assignee.items():
        total_tasks = sum(len(tasks) for tasks in priorities.values())
        overdue_tasks = sum(1 for p in priorities.values() 
                           for t in p if t['days_diff'] is not None and t['days_diff'] < 0)
        
        message = [
            "📋 今日待处理任务提醒",
            f"👤 {assignee}的任务清单 (共{total_tasks}条)"  # 删除了分隔线
        ]
        
        priority_emojis = {
            'P0': '🔴 重要紧急',
            'P1': '🔵 重要不紧急',
            'P2': '🟡 紧急不重要',
            'P3': '⚪ 不重要不紧急'
        }
        
        task_counter = 1
        for priority in ['P0', 'P1', 'P2', 'P3']:
            tasks = priorities[priority]
            if not tasks:
                continue
                
            message.append(f"{priority_emojis[priority]}")  # 删除了额外的换行
            for task in tasks:
                message.append(f"{task_counter}. {task['name']}")
                message.append(f"📌 类型：{task['type']}")  # 减少缩进
                message.append(f"⏰ 截止：{task['due_date']}")
                if task['days_diff'] is not None and task['days_diff'] < 0:
                    message.append(f"⚠️ 已逾期 {abs(task['days_diff'])} 天")
                message.append("")  # 只保留一个空行
                task_counter += 1
        
        # 统计信息更紧凑
        if overdue_tasks > 0:
            message.extend([
                "🔍 任务统计:",  # 删除了分隔线
                f"• 重要紧急: {len(priorities['P0'])}条 • 重要不紧急: {len(priorities['P1'])}条",
                f"• 紧急不重要: {len(priorities['P2'])}条 • 不重要不紧急: {len(priorities['P3'])}条",
                f"• 已逾期: {overdue_tasks}条"
            ])
        else:
            message.extend([
                "🔍 任务统计:",
                f"• 重要紧急: {len(priorities['P0'])}条 • 重要不紧急: {len(priorities['P1'])}条",
                f"• 紧急不重要: {len(priorities['P2'])}条 • 不重要不紧急: {len(priorities['P3'])}条"
            ])
            
        messages.append("\n".join(message))
    
    return "\n\n".join(messages)

def format_evening_message(tasks_data):
    message = ["📋 今日完成任务统计"]
    
    # 过滤今天完成的任务
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_tasks = [
        result for result in tasks_data.get('results', [])
        if result.get('last_edited_time', '').startswith(today)
    ]
    
    total_tasks = len(today_tasks)
    
    if total_tasks == 0:
        message.append("今天还没有完成任何任务哦！加油！")
        return "\n".join(message)
    
    message.append(f"🎉 今天完成了 {total_tasks} 个任务")
    message.append("")  # 空行
    
    for idx, result in enumerate(today_tasks, 1):
        properties = result.get('properties', {})
        name = properties.get('任务名称', {}).get('title', [{}])[0].get('plain_text', '未命名任务')
        task_type = properties.get('任务类型', {}).get('select', {}).get('name', '未分类')
        priority = properties.get('四象限', {}).get('select', {}).get('name', 'P3 不重要不紧急')
        
        message.extend([
            f"{idx}. {name}",
            f"📌 类型：{task_type}",
            f"🏷️ 优先级：{priority}",
            ""
        ])
    
    return "\n".join(message)

def send_to_wechat(message):
    url = "http://www.pushplus.plus/send"
    data = {
        "token": PUSHPLUS_TOKEN,
        "title": "任务提醒",  # 简化标题
        "content": message,
        "template": "txt",
        "channel": "wechat"  # 明确指定渠道
    }
    
    try:
        print(f"正在发送消息到PushPlus...")
        print(f"请求URL: {url}")
        print(f"请求数据: {data}")
        
        response = requests.post(url, json=data, timeout=10)
        print(f"响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 200:
                print("消息发送成功")
                return True
            else:
                print(f"PushPlus返回错误: {result}")
                return False
        else:
            print(f"HTTP请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"发送消息时出错: {str(e)}")
        return False

def main():
    try:
        # 检查环境变量
        print("检查环境变量...")
        print(f"PUSHPLUS_TOKEN: {PUSHPLUS_TOKEN[:8]}*** (长度: {len(PUSHPLUS_TOKEN)})")
        print(f"REMINDER_TYPE: {os.environ.get('REMINDER_TYPE', '未设置')}")
        print(f"NOTION_TOKEN: {'已设置' if NOTION_TOKEN else '未设置'}")
        print(f"DATABASE_ID: {'已设置' if DATABASE_ID else '未设置'}")
        
        # 判断是早上还是晚上的提醒
        is_evening = os.environ.get('REMINDER_TYPE') == 'evening'
        
        print(f"开始获取{'已完成' if is_evening else '待处理'}任务...")
        tasks = get_notion_tasks(is_evening)
        
        if not tasks.get('results'):
            print("没有获取到任何任务")
            return
            
        print(f"获取到 {len(tasks.get('results', []))} 个任务")
        
        print("格式化消息...")
        message = format_evening_message(tasks) if is_evening else format_message(tasks)
        
        if not message.strip():
            print("没有需要提醒的任务")
            return
            
        print("消息内容:")
        print(message)
        
        print("发送消息...")
        if send_to_wechat(message):
            print("消息发送成功!")
        else:
            print("消息发送失败!")
    except Exception as e:
        print(f"运行出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
