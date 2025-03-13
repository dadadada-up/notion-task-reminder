import requests
from datetime import datetime, timezone
import pytz
import os
import time
import hmac
import hashlib
import base64
import urllib.parse
import json
from pathlib import Path

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

def get_notion_tasks(is_done=False):
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
    }
    
    # 获取北京时间的今天的开始和结束时间
    beijing_tz = pytz.timezone('Asia/Shanghai')
    beijing_now = datetime.now(beijing_tz)
    beijing_start = beijing_now.replace(hour=0, minute=0, second=0, microsecond=0)
    beijing_end = beijing_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # 转换为 UTC 时间
    utc_start = beijing_start.astimezone(timezone.utc)
    utc_end = beijing_end.astimezone(timezone.utc)
    
    if is_done:
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
                            "after": utc_start.isoformat(),
                            "before": utc_end.isoformat()
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
                                    "on_or_before": beijing_now.strftime("%Y-%m-%d")
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
        # 获取北京时间的今天日期
        beijing_tz = pytz.timezone('Asia/Shanghai')
        today = datetime.now(beijing_tz).strftime("%Y-%m-%d")
        today_tasks = []
        
        print(f"\n=== 开始处理今日已完成任务 ===")
        print(f"今天日期（北京时间）: {today}")
        print(f"总任务数: {len(tasks.get('results', []))}")
        
        # 过滤今天完成的任务
        for task in tasks.get('results', []):
            try:
                # 获取任务名称用于日志
                task_name = task.get('properties', {}).get('任务名称', {}).get('title', [{}])[0].get('plain_text', '未命名任务')
                
                # 将 UTC 时间转换为北京时间
                last_edited_time = task.get('last_edited_time', '')
                if not last_edited_time:
                    print(f"跳过任务 '{task_name}': 缺少编辑时间")
                    continue
                    
                last_edited_utc = datetime.fromisoformat(last_edited_time.replace('Z', '+00:00'))
                last_edited_beijing = last_edited_utc.astimezone(beijing_tz)
                last_edited_date = last_edited_beijing.strftime("%Y-%m-%d")
                
                if last_edited_date == today:
                    today_tasks.append(task)
                    print(f"✅ 找到今天完成的任务: {task_name} (完成时间: {last_edited_beijing.strftime('%Y-%m-%d %H:%M:%S')})")
                else:
                    print(f"❌ 跳过非今天完成的任务: {task_name} (完成时间: {last_edited_date})")
            except Exception as e:
                print(f"处理任务时出错: {str(e)}")
                continue
        
        print(f"今日完成任务数: {len(today_tasks)}/{len(tasks.get('results', []))}")
        
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
        final_message = header + "\n\n" + "\n".join(message_lines) + "\n" + stats + type_stats
        
        return final_message
        
    except Exception as e:
        print(f"格式化消息时出错: {str(e)}")
        import traceback
        traceback.print_exc()
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

def prepare_task_data(is_done=False):
    """准备任务数据并保存到文件"""
    print(f"准备{'已完成' if is_done else '待办'}任务数据...")
    
    # 创建数据目录
    data_dir = Path("./data")
    data_dir.mkdir(exist_ok=True)
    
    # 获取任务数据
    tasks = get_notion_tasks(is_done)
    message = format_evening_message(tasks) if is_done else format_message(tasks)
    
    # 保存数据
    data_file = data_dir / "task_data.json"
    data = {
        "message": message,
        "type": "daily_done" if is_done else "daily_todo",
        "tasks_count": len(tasks.get('results', [])),
    }
    
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"数据已保存到 {data_file}")
    return True

def send_cached_message():
    """发送已缓存的消息
    返回值:
    - True: 发送成功
    - False: 发送失败
    - None: 缓存文件不存在
    """
    data_file = Path("./data/task_data.json")
    
    try:
        # 检查文件是否存在
        if not data_file.exists():
            print("未找到缓存数据文件")
            return None
            
        # 读取缓存数据
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        message = data.get("message")
        tasks_count = data.get("tasks_count", 0)
        task_type = data.get("type", "unknown")
        
        if not message or not message.strip():
            print("缓存消息为空，无法发送")
            return False
        
        print(f"从缓存读取到任务数据，类型: {task_type}，共 {tasks_count} 条任务")
        
        # 发送消息
        if send_message(message):
            print("缓存消息发送成功")
            return True
        else:
            print("缓存消息发送失败")
            return False
            
    except json.JSONDecodeError:
        print("缓存数据格式错误，无法解析")
        return False
    except Exception as e:
        print(f"读取缓存数据出错: {str(e)}")
        return False

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
        print(f"操作类型: {os.environ.get('ACTION_TYPE', '未设置')}")
        print("=== 时间信息结束 ===\n")
        
        # 检查环境变量
        print("检查环境变量...")
        print(f"PUSHPLUS_TOKEN: {PUSHPLUS_TOKEN[:8]}*** (长度: {len(PUSHPLUS_TOKEN)})")
        print(f"REMINDER_TYPE: {os.environ.get('REMINDER_TYPE', '未设置')}")
        print(f"NOTION_TOKEN: {'已设置' if NOTION_TOKEN else '未设置'}")
        print(f"DATABASE_ID: {'已设置' if DATABASE_ID else '未设置'}")
        
        is_done = os.environ.get('REMINDER_TYPE') == 'daily_done'
        action_type = os.environ.get('ACTION_TYPE', 'send')
        send_time = os.environ.get('SEND_TIME', '08:00')
        
        # 任务类型和操作类型的日志
        task_type_desc = "已完成任务" if is_done else "待办任务"
        action_desc = "准备" if action_type == 'prepare' else "发送"
        print(f"\n=== 开始{action_desc}{task_type_desc} ===")
        
        if action_type == 'prepare':
            # 准备数据模式，只获取和保存数据，不发送消息
            print(f"准备{task_type_desc}数据...")
            if prepare_task_data(is_done):
                print(f"{task_type_desc}数据准备完成")
                return
            else:
                raise Exception(f"{task_type_desc}数据准备失败")
        else:
            # 发送模式
            # 检查是否是允许的发送时间
            valid_send_times = {
                'daily_todo': '08:00',
                'daily_done': '22:00'
            }
            expected_time = valid_send_times.get(os.environ.get('REMINDER_TYPE', ''), None)
            
            if expected_time and send_time != expected_time:
                print(f"警告: 当前设置的发送时间 {send_time} 与任务类型 {os.environ.get('REMINDER_TYPE')} 的预期时间 {expected_time} 不匹配")
            
            if send_time not in ['08:00', '22:00']:
                print(f"当前时间 {send_time} 不是指定的发送时间（08:00 或 22:00），跳过发送")
                return
                
            print(f"开始发送{task_type_desc}消息...")
            
            # 尝试发送缓存的消息
            cache_result = send_cached_message()
            if cache_result:
                print("缓存消息发送成功")
                return
            elif cache_result is None:  # 缓存文件不存在
                print("未找到缓存数据，尝试实时获取数据")
            else:  # 发送失败
                print("缓存消息发送失败，尝试实时获取数据")
                
            # 如果发送缓存消息失败，实时获取并发送
            print("尝试实时获取数据并发送...")
            tasks = get_notion_tasks(is_done)
            if tasks.get('results'):
                print(f"获取到 {len(tasks.get('results', []))} 个任务")
                message = format_evening_message(tasks) if is_done else format_message(tasks)
                
                if not message or not message.strip():
                    message = f"生成{task_type_desc}消息时出错，请检查日志。"
                
                if send_message(message):
                    print("实时消息发送成功")
                    return
                else:
                    raise Exception(f"{task_type_desc}消息发送失败")
            else:
                raise Exception(f"获取{task_type_desc}数据失败")
            
    except Exception as e:
        print(f"运行出错: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    main()
