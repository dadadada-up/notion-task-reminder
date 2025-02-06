import requests
from datetime import datetime, timezone
import pytz

# 配置信息
NOTION_TOKEN = "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"
DATABASE_ID = "192ed4b7aaea81859bbbf3ad4ea54b56"
PUSHPLUS_TOKEN = "3cfcadc8fcf744769292f0170e724ddb"

# 四象限优先级
PRIORITY_ORDER = {
    "P0 重要紧急": 0,
    "P1 重要不紧急": 1,
    "P2 紧急不重要": 2,
    "P3 不重要不紧急": 3
}

def get_notion_tasks():
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    # 构建过滤条件
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    body = {
        "filter": {
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

def format_message(tasks):
    if not tasks.get('results'):
        return "📋 今日无待处理任务"
    
    # 按负责人分组任务
    tasks_by_assignee = {}
    for task in tasks['results']:
        props = task['properties']
        
        task_name = props['任务名称']['title'][0]['text']['content'] if props['任务名称']['title'] else "无标题"
        quadrant = props['四象限']['select']['name'] if props['四象限']['select'] else "未分类"
        due_date = props['截止日期']['date']['start'] if props['截止日期']['date'] else "无截止日期"
        task_type = props['任务类型']['select']['name'] if props['任务类型']['select'] else "未分类"
        
        assignees = props['负责人']['people']
        assignee_name = assignees[0].get('name', '未知') if assignees else "未分配"
        
        if assignee_name not in tasks_by_assignee:
            tasks_by_assignee[assignee_name] = {
                'P0': [], 'P1': [], 'P2': [], 'P3': [], 'other': []
            }
        
        # 确定任务属于哪个优先级
        if '重要紧急' in quadrant:
            priority = 'P0'
        elif '重要不紧急' in quadrant:
            priority = 'P1'
        elif '紧急不重要' in quadrant:
            priority = 'P2'
        elif '不重要不紧急' in quadrant:
            priority = 'P3'
        else:
            priority = 'other'
            
        # 计算逾期天数
        if due_date != "无截止日期":
            due_datetime = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
            today = datetime.now(timezone.utc)
            days_diff = (due_datetime.date() - today.date()).days
            
            if days_diff == 0:
                due_str = "今天"
            elif days_diff == 1:
                due_str = "明天"
            elif days_diff == -1:
                due_str = "昨天"
            else:
                due_str = due_date.split('T')[0]
        else:
            due_str = "无截止日期"
            days_diff = None
            
        tasks_by_assignee[assignee_name][priority].append({
            'name': task_name,
            'type': task_type,
            'due_date': due_str,
            'days_diff': days_diff
        })
    
    # 格式化消息
    messages = []
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for assignee, priorities in tasks_by_assignee.items():
        total_tasks = sum(len(tasks) for tasks in priorities.values())
        overdue_tasks = sum(1 for p in priorities.values() 
                           for t in p if t['days_diff'] is not None and t['days_diff'] < 0)
        
        message = [
            "📋 今日待处理任务提醒",
            f"━━━━━━━━━━━━━━━━━━━━━━",
            f"👤 {assignee}的任务清单 (共{total_tasks}条)\n"
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
                
            message.append(f"\n{priority_emojis[priority]}")
            for task in tasks:
                message.append(f"{task_counter}. {task['name']}")
                message.append(f"   📌 类型：{task['type']}")
                message.append(f"   ⏰ 截止：{task['due_date']}")
                if task['days_diff'] is not None and task['days_diff'] < 0:
                    message.append(f"   ⚠️ 已逾期 {abs(task['days_diff'])} 天")
                message.append("")
                task_counter += 1
        
        # 添加统计信息
        message.extend([
            "━━━━━━━━━━━━━━━━━━━━━━",
            "🔍 任务统计：",
            f"• 重要紧急：{len(priorities['P0'])}条",
            f"• 重要不紧急：{len(priorities['P1'])}条",
            f"• 紧急不重要：{len(priorities['P2'])}条",
            f"• 不重要不紧急：{len(priorities['P3'])}条"
        ])
        
        if overdue_tasks > 0:
            message.append(f"• 已逾期：{overdue_tasks}条")
            
        messages.append("\n".join(message))
    
    return "\n\n".join(messages)

def send_to_wechat(message):
    url = "http://www.pushplus.plus/send"
    data = {
        "token": PUSHPLUS_TOKEN,
        "title": "今日待处理任务提醒",
        "content": message,
        "template": "txt"
    }
    
    try:
        print("正在发送消息到PushPlus...")
        response = requests.post(url, json=data)
        print(f"PushPlus响应状态码: {response.status_code}")
        
        result = response.json()
        print(f"PushPlus响应内容: {result}")
        
        if response.status_code != 200:
            print(f"HTTP错误: {response.status_code}")
            return False
            
        if result.get('code') != 200:
            print(f"PushPlus错误: {result.get('msg')}")
            return False
            
        return True
    except Exception as e:
        print(f"发送消息时出错: {str(e)}")
        return False

def main():
    try:
        print("开始获取任务...")
        tasks = get_notion_tasks()
        print(f"获取到 {len(tasks.get('results', []))} 个任务")
        
        print("格式化消息...")
        message = format_message(tasks)
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
