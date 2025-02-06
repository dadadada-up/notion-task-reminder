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

    response = requests.post(
        f"https://api.notion.com/v1/databases/{DATABASE_ID}/query",
        headers=headers,
        json=body
    )
    
    return response.json()

def format_message(tasks):
    if not tasks.get('results'):
        return "今日无待处理任务"
    
    # 按负责人分组任务
    tasks_by_assignee = {}
    for task in tasks['results']:
        props = task['properties']
        
        # 获取任务信息
        task_name = props['任务名称']['title'][0]['text']['content'] if props['任务名称']['title'] else "无标题"
        quadrant = props['四象限']['select']['name'] if props['四象限']['select'] else "未分类"
        due_date = props['截止日期']['date']['start'] if props['截止日期']['date'] else "无截止日期"
        task_type = props['任务类型']['select']['name'] if props['任务类型']['select'] else "未分类"
        
        # 获取负责人
        assignees = props['负责人']['people']
        if not assignees:
            assignee_name = "未分配"
        else:
            assignee_name = assignees[0].get('name', '未知')
        
        if assignee_name not in tasks_by_assignee:
            tasks_by_assignee[assignee_name] = []
            
        tasks_by_assignee[assignee_name].append({
            'name': task_name,
            'quadrant': quadrant,
            'due_date': due_date,
            'task_type': task_type
        })
    
    # 格式化消息
    messages = []
    for assignee, tasks in tasks_by_assignee.items():
        msg = f"{assignee}今日待处理任务{len(tasks)}条\n"
        for i, task in enumerate(sorted(tasks, key=lambda x: PRIORITY_ORDER.get(x['quadrant'], 999)), 1):
            due_date = datetime.fromisoformat(task['due_date'].replace('Z', '+00:00')).strftime('%Y-%m-%d') if task['due_date'] != "无截止日期" else "无截止日期"
            msg += f"任务{i}: {task['name']} [{task['task_type']}] {task['quadrant']} 截止日期: {due_date}\n"
        messages.append(msg)
    
    return "\n".join(messages)

def send_to_wechat(message):
    url = "http://www.pushplus.plus/send"
    data = {
        "token": PUSHPLUS_TOKEN,
        "title": "今日待处理任务提醒",
        "content": message,
        "template": "txt"
    }
    
    response = requests.post(url, json=data)
    return response.json()

def main():
    tasks = get_notion_tasks()
    message = format_message(tasks)
    result = send_to_wechat(message)
    print(f"消息发送结果: {result}")

if __name__ == "__main__":
    main()
