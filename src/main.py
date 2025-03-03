import requests
from datetime import datetime, timezone
import pytz
import os
import time
import hmac
import hashlib
import base64
import urllib.parse

# 修改配置信息部分
NOTION_TOKEN = os.environ.get('NOTION_TOKEN', "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")
DATABASE_ID = os.environ.get('DATABASE_ID', "192ed4b7aaea81859bbbf3ad4ea54b56")
PUSHPLUS_TOKEN = os.environ.get('PUSHPLUS_TOKEN', "3cfcadc8fcf744769292f0170e724ddb")

# 在配置部分添加 WxPusher 配置
WXPUSHER_TOKEN = "AT_wO2h16sJxNbV0pR3wOvssCi5eGKomrhH"
WXPUSHER_UID = "UID_Kp0Ftm3F0GmnGmdYnmKY3yBet7u4"

# 四象限优先级
PRIORITY_ORDER = {
    "P0 重要紧急": 0,
    "P1 重要不紧急": 1,
    "P2 紧急不重要": 2,
    "P3 不重要不紧急": 3
}

# 添加钉钉配置
DINGTALK_TOKEN = None  # 禁用钉钉推送
DINGTALK_SECRET = None
DINGTALK_WEBHOOK = None

def get_notion_tasks(is_evening=False):
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    # 获取今天的开始和结束时间（UTC）
    today = datetime.now(timezone.utc)
    today_start = today.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = today.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    
    if is_evening:
        # 晚上查询当天已完成的任务
        body = {
            "filter": {
                "and": [
                    {
                        "property": "状态",
                        "status": {
                            "equals": "done"
                        }
                    },
                    {
                        "property": "上次编辑时间",
                        "last_edited_time": {
                            "after": today_start,
                            "before": today_end
                        }
                    }
                ]
            },
            "sorts": [
                {
                    "property": "四象限",
                    "direction": "ascending"
                }
            ],
            "page_size": 100
        }
    else:
        # 早上的待办任务查询
        body = {
            "filter": {
                "and": [
                    {
                        "or": [
                            {
                                "property": "状态",
                                "status": {
                                    "equals": "inbox"
                                }
                            },
                            {
                                "property": "状态",
                                "status": {
                                    "equals": "doing"
                                }
                            }
                        ]
                    },
                    {
                        "or": [
                            {
                                "property": "开始日期",
                                "date": {
                                    "is_empty": True
                                }
                            },
                            {
                                "property": "开始日期",
                                "date": {
                                    "on_or_before": today.strftime("%Y-%m-%d")
                                }
                            }
                        ]
                    }
                ]
            },
            "sorts": [
                {
                    "property": "四象限",
                    "direction": "ascending"
                }
            ],
            "page_size": 100
        }
    
    try:
        print("正在发送请求到Notion API...")
        print(f"查询条件: {body}")
        
        all_tasks = []
        has_more = True
        start_cursor = None
        max_retries = 3
        retry_count = 0
        
        # 使用分页获取所有任务，添加重试机制
        while has_more and retry_count < max_retries:
            try:
                if start_cursor:
                    body['start_cursor'] = start_cursor
                
                response = requests.post(
                    f"https://api.notion.com/v1/databases/{DATABASE_ID}/query",
                    headers=headers,
                    json=body,
                    timeout=30  # 添加超时设置
                )
                
                if response.status_code == 200:
                    data = response.json()
                    all_tasks.extend(data.get('results', []))
                    has_more = data.get('has_more', False)
                    start_cursor = data.get('next_cursor')
                    retry_count = 0  # 重置重试计数
                elif response.status_code == 429:  # Rate limit
                    retry_count += 1
                    print(f"达到速率限制，等待重试 ({retry_count}/{max_retries})")
                    time.sleep(2 ** retry_count)  # 指数退避
                else:
                    print(f"Notion API错误: {response.text}")
                    break
                    
            except requests.exceptions.Timeout:
                retry_count += 1
                print(f"请求超时，重试 ({retry_count}/{max_retries})")
                time.sleep(2 ** retry_count)
            except Exception as e:
                print(f"请求出错: {str(e)}")
                break
        
        tasks_data = {"results": all_tasks}
        
        # 创建任务ID到任务信息的映射
        task_map = {}
        
        # 第一遍遍历：收集所有任务的基本信息
        for task in tasks_data.get('results', []):
            task_id = task['id']
            properties = task.get('properties', {})
            
            # 获取任务名称
            title = properties.get('任务名称', {}).get('title', [])
            name = title[0].get('plain_text', '未命名任务') if title else '未命名任务'
            
            # 获取任务状态
            status = properties.get('状态', {}).get('status', {}).get('name', 'unknown')
            
            # 获取负责人
            assignee = properties.get('负责人', {}).get('select', {}).get('name', '未分配')
            
            # 获取任务类型
            task_type = properties.get('任务类型', {}).get('select', {}).get('name', '未分类')
            
            # 获取优先级
            priority = properties.get('四象限', {}).get('select', {}).get('name', 'P3')
            
            # 获取关系
            parent_relations = properties.get('上级 项目', {}).get('relation', [])  # 注意空格
            child_relations = properties.get('子级 项目', {}).get('relation', [])   # 注意空格
            blocked_by = properties.get('被阻止', {}).get('relation', [])
            
            task_info = {
                'id': task_id,
                'name': name,
                'status': status,
                'assignee': assignee,
                'task_type': task_type,
                'priority': priority,
                'parent_ids': [p['id'] for p in parent_relations],
                'child_ids': [c['id'] for c in child_relations],
                'parent_tasks': [],
                'child_tasks': [],
                'blocked_by': blocked_by
            }
            
            task_map[task_id] = task_info
            print(f"收集任务: {name} (ID: {task_id})")
        
        # 第二遍遍历：建立父子关系
        for task_id, task_info in task_map.items():
            # 处理父任务关系
            for parent_id in task_info['parent_ids']:
                if parent_id in task_map:
                    parent_info = task_map[parent_id]
                    task_info['parent_tasks'].append(parent_info)
                    if task_info not in parent_info['child_tasks']:
                        parent_info['child_tasks'].append(task_info)
            
            # 处理子任务关系
            for child_id in task_info['child_ids']:
                if child_id in task_map:
                    child_info = task_map[child_id]
                    if child_info not in task_info['child_tasks']:
                        task_info['child_tasks'].append(child_info)
                    if task_info not in child_info['parent_tasks']:
                        child_info['parent_tasks'].append(task_info)
        
        # 更新原始数据中的任务信息
        for task in tasks_data.get('results', []):
            task_id = task['id']
            if task_id in task_map:
                task['details'] = task_map[task_id]
        
        return tasks_data
        
    except Exception as e:
        print(f"获取Notion任务时出错: {str(e)}")
        return {"results": []}

def format_message(tasks_data):
    """格式化早上的待办任务消息"""
    messages = []
    tasks_by_assignee = {}
    
    print(f"\n=== 开始处理任务 ===")
    print(f"总任务数: {len(tasks_data.get('results', []))}")
    
    # 第一步：收集所有任务并按负责人分组
    for result in tasks_data.get('results', []):
        try:
            task_details = result.get('details', {})
            if not task_details:
                print(f"警告: 任务缺少详细信息")
                continue
            
            # 只处理顶级任务（没有父任务的任务）
            if not task_details.get('parent_ids', []):
                assignee = task_details['assignee']
                if assignee not in tasks_by_assignee:
                    tasks_by_assignee[assignee] = []
                tasks_by_assignee[assignee].append(task_details)
                print(f"添加顶级任务: {task_details['name']}")
            else:
                print(f"跳过子任务: {task_details['name']}")
        except Exception as e:
            print(f"处理任务时出错: {str(e)}")
            continue
    
    # 如果没有任务数据
    if not tasks_by_assignee:
        return "没有找到待处理的任务。"
    
    # 生成消息
    for assignee, tasks in tasks_by_assignee.items():
        # 计算实际任务总数（包括子任务）
        total_tasks = sum(1 + len(task.get('child_tasks', [])) for task in tasks)
        message = [f"📋 待办任务 | {assignee} (共{total_tasks}条)\n"]
        
        # 按优先级和状态排序
        priority_order = {'P0 重要紧急': 0, 'P1 重要不紧急': 1, 'P2 紧急不重要': 2, 'P3 不重要不紧急': 3}
        status_order = {'inbox': 0, 'doing': 1, 'done': 2}
        
        # 对主任务进行排序
        tasks.sort(key=lambda x: (
            priority_order.get(x['priority'], 999),
            status_order.get(x['status'], 999)
        ))
        
        for i, task in enumerate(tasks, 1):
            # 添加主任务
            task_line = [f"{i}. {task['name']} | {task['status']}"]
            
            # 如果有优先级和任务类型，添加到任务信息中
            if task['priority'] != 'P3' or task['task_type'] != '未分类':
                extra_info = []
                if task['priority'] != 'P3':
                    extra_info.append(task['priority'][:2])
                if task['task_type'] != '未分类':
                    extra_info.append(task['task_type'])
                if extra_info:
                    task_line.append(f" ({' | '.join(extra_info)})")
            
            message.append(''.join(task_line))
            
            # 添加主任务的阻止关系
            if task.get('blocked_by'):
                blocked_names = []
                for b in task['blocked_by']:
                    blocked_name = b.get('title', [{}])[0].get('plain_text', '未知任务')
                    blocked_names.append(blocked_name)
                if blocked_names:
                    message.append(f"   ⛔️ 被阻止: {', '.join(blocked_names)}")
            
            # 添加子任务（按优先级和状态排序）
            child_tasks = task.get('child_tasks', [])
            if child_tasks:
                # 对子任务进行排序
                sorted_children = sorted(
                    child_tasks,
                    key=lambda x: (
                        priority_order.get(x['priority'], 999),
                        status_order.get(x['status'], 999)
                    )
                )
                
                # 添加子任务标题和第一个子任务
                first_child = sorted_children[0]
                child_line = [f"   └─ {first_child['name']} | {first_child['status']}"]
                
                # 如果第一个子任务有优先级和任务类型，添加到任务信息中
                if first_child['priority'] != 'P3' or first_child['task_type'] != '未分类':
                    extra_info = []
                    if first_child['priority'] != 'P3':
                        extra_info.append(first_child['priority'][:2])
                    if first_child['task_type'] != '未分类':
                        extra_info.append(first_child['task_type'])
                    if extra_info:
                        child_line.append(f" ({' | '.join(extra_info)})")
                
                message.append(''.join(child_line))
                
                # 添加第一个子任务的阻止关系
                if first_child.get('blocked_by'):
                    blocked_names = []
                    for b in first_child['blocked_by']:
                        blocked_name = b.get('title', [{}])[0].get('plain_text', '未知任务')
                        blocked_names.append(blocked_name)
                    if blocked_names:
                        message.append(f"      ⛔️ 被阻止: {', '.join(blocked_names)}")
                
                # 添加剩余的子任务
                for child in sorted_children[1:]:
                    child_line = [f"   └─ {child['name']} | {child['status']}"]
                    
                    # 如果子任务有优先级和任务类型，添加到任务信息中
                    if child['priority'] != 'P3' or child['task_type'] != '未分类':
                        extra_info = []
                        if child['priority'] != 'P3':
                            extra_info.append(child['priority'][:2])
                        if child['task_type'] != '未分类':
                            extra_info.append(child['task_type'])
                        if extra_info:
                            child_line.append(f" ({' | '.join(extra_info)})")
                    
                    message.append(''.join(child_line))
                    
                    # 添加子任务的阻止关系
                    if child.get('blocked_by'):
                        blocked_names = []
                        for b in child['blocked_by']:
                            blocked_name = b.get('title', [{}])[0].get('plain_text', '未知任务')
                            blocked_names.append(blocked_name)
                        if blocked_names:
                            message.append(f"      ⛔️ 被阻止: {', '.join(blocked_names)}")
        
        messages.append('\n'.join(message))  # 不再添加空行
    
    return "\n\n---\n\n".join(messages) if len(messages) > 1 else messages[0]

def format_evening_message(tasks):
    """格式化晚间已完成任务消息"""
    try:
        # 获取今天的日期
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_tasks = []
        
        # 过滤今天完成的任务
        for task in tasks.get('results', []):
            last_edited = task.get('last_edited_time', '').split('T')[0]
            if last_edited == today:
                today_tasks.append(task)
        
        if not today_tasks:
            return "✅ 今日完成 (0/0)\n\n还没有完成任何任务哦！加油！"
        
        # 统计信息初始化
        total_tasks = len(today_tasks)
        task_types = {}  # 按任务类型统计
        priorities = {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0}  # 按优先级统计
        important_count = 0
        urgent_count = 0
        
        # 收集任务信息
        message_lines = []
        for task in today_tasks:
            properties = task.get('properties', {})
            
            # 获取任务名称
            title = properties.get('任务名称', {}).get('title', [])
            name = title[0].get('plain_text', '未命名任务') if title else '未命名任务'
            
            # 获取任务类型
            task_type = properties.get('任务类型', {}).get('select', {}).get('name', '未分类')
            task_types[task_type] = task_types.get(task_type, 0) + 1
            
            # 获取优先级
            priority = properties.get('四象限', {}).get('select', {}).get('name', 'P3')
            priority_key = priority.split()[0] if ' ' in priority else priority  # 处理优先级格式
            priorities[priority_key] = priorities.get(priority_key, 0) + 1
            
            # 统计重要和紧急任务
            if priority_key in ['P0', 'P1']:
                important_count += 1
            if priority_key == 'P0' or priority_key == 'P2':
                urgent_count += 1
            
            # 格式化任务信息
            message_lines.append(f"{len(message_lines) + 1}. {name} | {task_type} | {priority}")
        
        # 生成消息头
        estimated_total = max(total_tasks, round(total_tasks * 1.5))  # 估算总任务数
        header = f"✅ 今日完成 ({total_tasks}/{estimated_total})"
        
        # 生成统计信息
        stats = f"\n\n📊 任务统计:\n"
        stats += f"- 完成率: {round(total_tasks/estimated_total*100)}%\n"
        stats += f"- 重要任务: {important_count} | 紧急任务: {urgent_count}\n"
        stats += f"- 优先级: P0({priorities['P0']}) P1({priorities['P1']}) P2({priorities['P2']}) P3({priorities['P3']})\n"
        
        # 生成任务类型统计
        type_stats = "- 任务类型:\n"
        for task_type, count in sorted(task_types.items(), key=lambda x: x[1], reverse=True):
            type_stats += f"  • {task_type}: {count}\n"
        
        # 组合最终消息
        final_message = header + "\n\n" + "\n\n".join(message_lines) + "\n" + stats + type_stats
        
        return final_message
        
    except Exception as e:
        print(f"格式化消息时出错: {str(e)}")
        return "格式化消息时出错，请检查日志。"

def send_to_wechat(message):
    """发送消息到微信（通过 PushPlus）"""
    url = "http://www.pushplus.plus/send"
    
    # 检查 token 是否为空
    if not PUSHPLUS_TOKEN or PUSHPLUS_TOKEN.strip() == "":
        print("错误: PUSHPLUS_TOKEN 未设置或为空")
        return False
        
    data = {
        "token": PUSHPLUS_TOKEN,
        "title": "任务提醒",
        "content": message,
        "template": "txt",
        "channel": "wechat"
    }
    
    try:
        print("\n=== PushPlus 发送信息 ===")
        print(f"发送地址: {url}")
        print(f"Token长度: {len(PUSHPLUS_TOKEN)}")
        print(f"Token前8位: {PUSHPLUS_TOKEN[:8]}***")
        print(f"消息长度: {len(message)}")
        print(f"消息内容预览: {message[:100]}...")
        
        # 设置超时和重试
        session = requests.Session()
        retries = requests.adapters.Retry(total=3, backoff_factor=1)
        session.mount('http://', requests.adapters.HTTPAdapter(max_retries=retries))
        session.mount('https://', requests.adapters.HTTPAdapter(max_retries=retries))
        
        print("\n正在发送请求...")
        response = session.post(url, json=data, timeout=30)
        print(f"响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        try:
            result = response.json()
            print(f"响应内容: {result}")
            
            if response.status_code == 200:
                if result.get('code') == 200:
                    print("消息发送成功")
                    return True
                else:
                    print(f"PushPlus返回错误: code={result.get('code')}, msg={result.get('msg')}")
                    if result.get('code') == 400:
                        print("可能是 token 无效，请检查 token 是否正确")
                    return False
            else:
                print(f"HTTP请求失败: {response.status_code}")
                return False
                
        except ValueError as e:
            print(f"解析响应JSON失败: {str(e)}")
            print(f"原始响应内容: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("请求超时")
        return False
    except requests.exceptions.ConnectionError:
        print("连接错误，可能是网络问题或 PushPlus 服务不可用")
        return False
    except Exception as e:
        print(f"发送消息时出错: {str(e)}")
        return False

def send_to_dingtalk(message):
    """发送消息到钉钉群(已禁用)"""
    print("\n=== 钉钉推送已禁用 ===")
    return False

def send_to_wxpusher(message):
    """发送消息到 WxPusher"""
    url = "http://wxpusher.zjiecode.com/api/send/message"
    data = {
        "appToken": WXPUSHER_TOKEN,
        "content": message,
        "contentType": 1,  # 1表示文本
        "uids": [WXPUSHER_UID],
        "summary": "任务提醒"  # 消息摘要
    }
    
    try:
        print(f"\n=== WxPusher 发送信息 ===")
        print(f"请求URL: {url}")
        print(f"发送数据: {data}")
        
        response = requests.post(url, json=data, timeout=10)
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("WxPusher消息发送成功")
                return True
            else:
                print(f"WxPusher返回错误: {result}")
                return False
        else:
            print(f"HTTP请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"WxPusher发送失败: {str(e)}")
        return False

def send_message(message):
    """统一的消息发送函数"""
    results = []
    
    # PushPlus 推送
    print("\n=== 开始 PushPlus 推送 ===")
    pushplus_result = send_to_wechat(message)
    results.append(pushplus_result)
    print(f"PushPlus发送{'成功' if pushplus_result else '失败'}")
    
    # WxPusher 推送
    print("\n=== 开始 WxPusher 推送 ===")
    wxpusher_result = send_to_wxpusher(message)
    results.append(wxpusher_result)
    print(f"WxPusher发送{'成功' if wxpusher_result else '失败'}")
    
    return any(results)

def wait_until_send_time():
    # 如果是 GitHub Actions 环境，直接发送
    if os.environ.get('GITHUB_ACTIONS'):
        return
        
    beijing_tz = pytz.timezone('Asia/Shanghai')
    target_time_str = os.environ.get('SEND_TIME', '08:00')  # 默认早上8点
    
    now = datetime.now(beijing_tz)
    target_time = datetime.strptime(target_time_str, '%H:%M').time()
    target_datetime = datetime.combine(now.date(), target_time)
    target_datetime = beijing_tz.localize(target_datetime)
    
    # 如果当前时间已经过了目标时间，说明是测试运行，立即发送
    if now.time() > target_time:
        return
    
    wait_seconds = (target_datetime - now).total_seconds()
    if wait_seconds > 0:
        print(f"等待发送时间，将在 {target_time_str} 发送...")
        time.sleep(wait_seconds)

def main():
    try:
        # 添加时间调试信息
        beijing_tz = pytz.timezone('Asia/Shanghai')
        utc_now = datetime.now(timezone.utc)
        beijing_now = utc_now.astimezone(beijing_tz)
        
        print(f"\n=== 时间信息 ===")
        print(f"UTC 时间: {utc_now}")
        print(f"北京时间: {beijing_now}")
        print(f"目标发送时间: {os.environ.get('SEND_TIME', '08:00')}")
        print(f"执行类型: {os.environ.get('REMINDER_TYPE', '未设置')}")
        print("=== 时间信息结束 ===\n")
        
        # 检查环境变量
        print("检查环境变量...")
        print(f"PUSHPLUS_TOKEN: {PUSHPLUS_TOKEN[:8]}*** (长度: {len(PUSHPLUS_TOKEN)})")
        print(f"REMINDER_TYPE: {os.environ.get('REMINDER_TYPE', '未设置')}")
        print(f"NOTION_TOKEN: {'已设置' if NOTION_TOKEN else '未设置'}")
        print(f"DATABASE_ID: {'已设置' if DATABASE_ID else '未设置'}")
        
        # 提前获取和处理数据
        is_evening = os.environ.get('REMINDER_TYPE') == 'evening'
        print(f"开始获取{'已完成' if is_evening else '待处理'}任务...")
        
        # 先获取数据
        tasks = get_notion_tasks(is_evening)
        if tasks.get('results'):
            print(f"获取到 {len(tasks.get('results', []))} 个任务")
            message = format_evening_message(tasks) if is_evening else format_message(tasks)
        else:
            print("没有获取到任何任务")
            message = "今日没有已完成的任务。" if is_evening else "今日没有待办任务。"
        
        if not message or not message.strip():
            message = "生成任务消息时出错，请检查日志。"
        
        # 等待到指定时间
        wait_until_send_time()
        
        # 发送消息
        print("发送消息...")
        if send_message(message):
            print("至少一个渠道发送成功!")
            return
        else:
            print("所有渠道发送失败!")
            raise Exception("消息发送失败")
            
    except Exception as e:
        print(f"运行出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
