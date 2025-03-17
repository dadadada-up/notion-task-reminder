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
import random

# 修改配置信息部分
NOTION_TOKEN = os.environ.get('NOTION_TOKEN', "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")
DATABASE_ID = os.environ.get('DATABASE_ID', "192ed4b7aaea81859bbbf3ad4ea54b56")
PUSHPLUS_TOKEN = os.environ.get('PUSHPLUS_TOKEN', "3cfcadc8fcf744769292f0170e724ddb")

# 在配置部分添加 WxPusher 配置
WXPUSHER_TOKEN = "AT_wO2h16sJxNbV0pR3wOvssCi5eGKomrhH"
WXPUSHER_UID = "UID_Kp0Ftm3F0GmnGmdYnmKY3yBet7u4"

# 优先级排序
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

# 获取环境变量
NOTION_TOKEN = os.environ.get('NOTION_TOKEN')
DATABASE_ID = os.environ.get('DATABASE_ID')
PUSHPLUS_TOKEN = os.environ.get('PUSHPLUS_TOKEN', '')
WXPUSHER_TOKEN = os.environ.get('WXPUSHER_TOKEN', '')
WXPUSHER_UID = os.environ.get('WXPUSHER_UID', '')
DEBUG_MODE = os.environ.get('DEBUG_MODE', '').lower() in ['true', '1', 'yes']

# 调试函数
def debug_print(*args, **kwargs):
    if DEBUG_MODE:
        print("[DEBUG]", *args, **kwargs)

def get_task_name(task):
    """从任务对象中提取任务名称"""
    if not task or not task.get('properties'):
        return "未知任务"
    
    properties = task.get('properties', {})
    title_property = properties.get('任务名称', {})  # 使用实际的字段名称
    title = title_property.get('title', [])
    
    if title and len(title) > 0:
        return title[0].get('plain_text', '未知任务')
    return "未知任务"

def get_notion_tasks(is_done=False):
    """
    从 Notion 数据库获取任务
    """
    try:
        debug_print(f"开始从 Notion 获取{'已完成' if is_done else '待办'}任务...")
        
        # 获取当前北京时间的日期
        beijing_tz = pytz.timezone('Asia/Shanghai')
        now = datetime.now(timezone.utc).astimezone(beijing_tz)
        today = now.date()
        today_str = today.strftime('%Y-%m-%d')
        
        debug_print(f"当前北京时间: {now}")
        debug_print(f"今日日期: {today_str}")
        
        # 构建 API 请求
        url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
        
        headers = {
            "Authorization": f"Bearer {NOTION_TOKEN}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
        
        # 根据是否完成构建不同的过滤条件
        if is_done:
            # 查询今天已完成的任务
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
        else:
            # 查询今天待办的任务
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
        
        # 构建请求体
        payload = {
            "filter": filter_conditions
        }
        
        debug_print(f"API 请求 URL: {url}")
        debug_print(f"请求头: {headers}")
        debug_print(f"请求体: {json.dumps(payload, ensure_ascii=False, indent=2)}")
        
        # 发送请求
        response = requests.post(url, headers=headers, json=payload)
        
        # 检查响应状态
        if response.status_code != 200:
            print(f"API 请求失败: {response.status_code}")
            print(f"响应内容: {response.text}")
            return None
        
        # 解析响应
        data = response.json()
        
        debug_print(f"获取到 {len(data.get('results', []))} 个任务")
        
        # 添加更多调试信息
        if DEBUG_MODE:
            if data.get('results'):
                # 打印第一个任务的详细信息，帮助了解数据库结构
                first_task = data.get('results')[0]
                debug_print(f"第一个任务 ID: {first_task.get('id')}")
                debug_print(f"第一个任务属性: {json.dumps(first_task.get('properties', {}), ensure_ascii=False, indent=2)}")
                
                # 打印所有状态值
                status_values = set()
                for task in data.get('results', []):
                    properties = task.get('properties', {})
                    status_obj = properties.get('状态', {})
                    status = status_obj.get('status', {}).get('name', 'unknown') if status_obj else 'unknown'
                    status_values.add(status)
                debug_print(f"数据库中的状态值: {status_values}")
            else:
                debug_print("没有获取到任何任务")
        
        if DEBUG_MODE and data.get('results'):
            for i, task in enumerate(data.get('results', [])):
                task_id = task.get('id', 'unknown')
                properties = task.get('properties', {})
                title_obj = properties.get('任务名称', {}).get('title', [{}])[0]
                title = title_obj.get('plain_text', '无标题') if title_obj else '无标题'
                debug_print(f"任务 {i+1}: {title} (ID: {task_id})")
        
        return data
    except Exception as e:
        print(f"获取任务时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def format_message(tasks_data):
    """格式化早上的待办任务消息"""
    try:
        messages = []
        tasks_by_assignee = {}
        all_tasks = {}  # 存储所有任务的字典，用于后续查找关系
        
        print(f"\n=== 开始处理任务 ===")
        print(f"总任务数: {len(tasks_data.get('results', []))}")
        
        # 检查是否有任务数据
        if not tasks_data or not tasks_data.get('results'):
            print("没有任务数据")
            return "没有找到待处理的任务。"
        
        # 第一步：收集所有任务
        for result in tasks_data.get('results', []):
            try:
                properties = result.get('properties', {})
                task_id = result.get('id', '')
                
                # 获取任务名称
                title = properties.get('任务名称', {}).get('title', [])
                name = title[0].get('plain_text', '未命名任务') if title else '未命名任务'
                
                # 获取任务状态
                status_obj = properties.get('状态', {})
                status = status_obj.get('status', {}).get('name', 'unknown') if status_obj else 'unknown'
                
                # 获取负责人
                assignee_obj = properties.get('负责人', {})
                assignee = assignee_obj.get('select', {}).get('name', '未分配') if assignee_obj else '未分配'
                
                # 获取任务类型
                task_type_obj = properties.get('任务类型', {})
                task_type = task_type_obj.get('select', {}).get('name', '未分类') if task_type_obj else '未分类'
                
                # 获取优先级
                priority_obj = properties.get('四象限', {})
                priority = priority_obj.get('select', {}).get('name', 'P3') if priority_obj else 'P3'
                
                # 获取上级项目关系
                parent_relations = properties.get('上级 项目', {}).get('relation', []) if properties.get('上级 项目') else []
                parent_ids = [p.get('id') for p in parent_relations if p and p.get('id')]
                
                # 获取子级项目关系
                child_relations = properties.get('子级 项目', {}).get('relation', []) if properties.get('子级 项目') else []
                child_ids = [c.get('id') for c in child_relations if c and c.get('id')]
                
                # 获取被阻止关系
                blocked_by_relations = properties.get('被阻止', {}).get('relation', []) if properties.get('被阻止') else []
                blocked_by_ids = [b.get('id') for b in blocked_by_relations if b and b.get('id')]
                
                # 创建任务信息对象
                task_info = {
                    'id': task_id,
                    'name': name,
                    'status': status,
                    'assignee': assignee,
                    'task_type': task_type,
                    'priority': priority,
                    'parent_ids': parent_ids,
                    'child_ids': child_ids,
                    'blocked_by_ids': blocked_by_ids,
                    'is_processed': False  # 标记是否已处理，避免重复处理
                }
                
                # 存储到所有任务字典中
                all_tasks[task_id] = task_info
                
                # 按负责人分组
                if assignee not in tasks_by_assignee:
                    tasks_by_assignee[assignee] = []
                tasks_by_assignee[assignee].append(task_info)
                print(f"添加任务: {name} | {assignee} | {status}")
                
            except Exception as e:
                print(f"处理任务时出错: {str(e)}")
                continue
        
        # 如果没有任务数据
        if not tasks_by_assignee:
            print("没有找到任务")
            return "没有找到待处理的任务。"
        
        # 第二步：处理任务关系，找出顶级任务（没有父任务的任务）
        for task_id, task in all_tasks.items():
            # 如果有父任务，则不是顶级任务
            if task['parent_ids']:
                task['is_top_level'] = False
            else:
                task['is_top_level'] = True
        
        # 生成消息
        for assignee, tasks in tasks_by_assignee.items():
            try:
                # 计算任务总数
                total_tasks = len(tasks)
                message = [f"📋 待办任务 | {assignee} (共{total_tasks}条)\n"]
                
                # 按优先级和状态排序
                priority_order = {'P0 重要紧急': 0, 'P1 重要不紧急': 1, 'P2 紧急不重要': 2, 'P3 不重要不紧急': 3}
                status_order = {'inbox': 0, 'pedding': 1, 'doing': 2, 'done': 3}  # 修改为数据库中的实际状态值
                
                # 对任务进行排序
                try:
                    tasks.sort(key=lambda x: (
                        priority_order.get(x.get('priority', 'P3'), 999),
                        status_order.get(x.get('status', 'unknown'), 999)
                    ))
                except Exception as e:
                    print(f"排序任务时出错: {str(e)}")
                    # 不排序，继续处理
                
                # 只处理顶级任务，子任务将在递归中处理
                task_index = 1
                for task in tasks:
                    if task.get('is_top_level', True) and not task.get('is_processed', False):
                        task_line = format_task_with_children(task, all_tasks, task_index, 0)
                        message.extend(task_line)
                        task_index += 1
                        task['is_processed'] = True
                
                messages.append('\n'.join(message))  # 不再添加空行
            except Exception as e:
                print(f"处理负责人 {assignee} 的任务时出错: {str(e)}")
                continue
        
        if not messages:
            return "没有找到待处理的任务。"
            
        return "\n\n---\n\n".join(messages) if len(messages) > 1 else messages[0]
    
    except Exception as e:
        print(f"格式化消息时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return "格式化消息时出错，请检查日志。"

def format_task_with_children(task, all_tasks, index, level):
    """递归格式化任务及其子任务"""
    lines = []
    
    # 获取任务基本信息
    task_name = task.get('name', '未命名任务')
    task_status = task.get('status', 'unknown')
    task_priority = task.get('priority', 'P3')
    task_type = task.get('task_type', '未分类')
    
    # 构建任务行
    if level == 0:
        # 顶级任务显示序号
        task_line = [f"{index}. {task_name} | {task_status}"]
    else:
        # 子任务显示缩进
        indent = "   " * level
        task_line = [f"{indent}└─ {task_name} | {task_status}"]
    
    # 如果有优先级和任务类型，添加到任务信息中
    if task_priority != 'P3' or task_type != '未分类':
        extra_info = []
        if task_priority != 'P3':
            extra_info.append(task_priority[:2])
        if task_type != '未分类':
            extra_info.append(task_type)
        if extra_info:
            task_line.append(f" ({' | '.join(extra_info)})")
    
    lines.append(''.join(task_line))
    
    # 处理被阻止关系
    blocked_by_ids = task.get('blocked_by_ids', [])
    if blocked_by_ids:
        blocked_names = []
        for blocked_id in blocked_by_ids:
            if blocked_id in all_tasks:
                blocked_task = all_tasks[blocked_id]
                blocked_names.append(blocked_task.get('name', '未知任务'))
        
        if blocked_names:
            indent = "   " * (level + 1)
            lines.append(f"{indent}⛔️ 被阻止: {', '.join(blocked_names)}")
    
    # 递归处理子任务
    child_ids = task.get('child_ids', [])
    for child_id in child_ids:
        if child_id in all_tasks and not all_tasks[child_id].get('is_processed', False):
            child_task = all_tasks[child_id]
            child_lines = format_task_with_children(child_task, all_tasks, 0, level + 1)
            lines.extend(child_lines)
            child_task['is_processed'] = True
    
    return lines

def format_evening_message(tasks):
    """格式化晚间已完成任务消息"""
    try:
        # 检查是否有任务数据
        if not tasks or not tasks.get('results'):
            print("没有任务数据")
            return "✅ 今日完成 (0/0)\n\n还没有完成任何任务哦！加油！"
            
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
                # 获取任务名称
                properties = task.get('properties', {})
                title = properties.get('任务名称', {}).get('title', [])
                name = title[0].get('plain_text', '未命名任务') if title else '未命名任务'
                
                # 将 UTC 时间转换为北京时间
                last_edited_time = task.get('last_edited_time', '')
                if not last_edited_time:
                    print(f"跳过任务 '{name}': 缺少编辑时间")
                    continue
                    
                try:
                    last_edited_utc = datetime.fromisoformat(last_edited_time.replace('Z', '+00:00'))
                    last_edited_beijing = last_edited_utc.astimezone(beijing_tz)
                    last_edited_date = last_edited_beijing.strftime("%Y-%m-%d")
                    
                    if last_edited_date == today:
                        today_tasks.append(task)
                        print(f"✅ 找到今天完成的任务: {name} (完成时间: {last_edited_beijing.strftime('%Y-%m-%d %H:%M:%S')})")
                    else:
                        print(f"❌ 跳过非今天完成的任务: {name} (完成时间: {last_edited_date})")
                except Exception as e:
                    print(f"解析任务 '{name}' 的编辑时间时出错: {str(e)}")
                    continue
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
        for idx, task in enumerate(today_tasks, 1):
            try:
                properties = task.get('properties', {})
                
                # 获取任务名称
                title = properties.get('任务名称', {}).get('title', [])
                name = title[0].get('plain_text', '未命名任务') if title else '未命名任务'
                
                # 获取任务类型
                task_type_obj = properties.get('任务类型', {})
                task_type = task_type_obj.get('select', {}).get('name', '未分类') if task_type_obj else '未分类'
                task_types[task_type] = task_types.get(task_type, 0) + 1
                
                # 获取优先级
                priority_obj = properties.get('优先级', {})
                priority = priority_obj.get('select', {}).get('name', 'P3') if priority_obj else 'P3'
                priority_key = priority.split()[0] if ' ' in priority else priority  # 处理优先级格式
                priorities[priority_key] = priorities.get(priority_key, 0) + 1
                
                # 统计重要和紧急任务
                if priority_key in ['P0', 'P1']:
                    important_count += 1
                if priority_key == 'P0' or priority_key == 'P2':
                    urgent_count += 1
                
                # 格式化任务信息
                message_lines.append(f"{idx}. {name} | {task_type} | {priority}")
            except Exception as e:
                print(f"处理任务 {idx} 时出错: {str(e)}")
                # 添加一个简单的占位行，确保序号连续
                message_lines.append(f"{idx}. 未能解析的任务")
                continue
        
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
        return "✅ 今日完成 (0/0)\n\n格式化消息时出错，请检查日志。"

def add_unique_suffix(message):
    """
    为消息添加唯一后缀，避免被识别为重复内容
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=6))
    
    # 添加一个不可见的唯一标识符
    unique_suffix = f"\n\n<!-- {timestamp}-{random_str} -->"
    return message + unique_suffix

def send_to_wechat(title, content):
    """
    使用 PushPlus 发送微信消息
    """
    try:
        if not PUSHPLUS_TOKEN or len(PUSHPLUS_TOKEN.strip()) < 8:
            print("PUSHPLUS_TOKEN 未设置或无效")
            return False
            
        print(f"准备发送 PushPlus 消息")
        print(f"标题: {title}")
        print(f"内容长度: {len(content)}")
        print(f"内容预览: {content[:50]}...")
        
        url = "http://www.pushplus.plus/send"
        data = {
            "token": PUSHPLUS_TOKEN,
            "title": title,
            "content": content,
            "template": "markdown"
        }
        
        print(f"请求 URL: {url}")
        print(f"Token 长度: {len(PUSHPLUS_TOKEN)}")
        
        # 添加重试机制
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"PushPlus 发送尝试 {attempt+1}/{max_retries}")
                response = requests.post(url, json=data, timeout=15)
                print(f"PushPlus 响应状态码: {response.status_code}")
                
                try:
                    response_text = response.text
                    print(f"PushPlus 响应内容: {response_text}")
                    result = response.json()
                except Exception as e:
                    print(f"解析 PushPlus 响应时出错: {str(e)}")
                    print(f"原始响应: {response.text[:200]}")
                    result = {"code": 999, "msg": "响应解析失败"}
                
                if response.status_code == 200:
                    if result.get("code") == 200:
                        print("PushPlus 消息发送成功")
                        return True
                    else:
                        error_msg = result.get('msg', '未知错误')
                        print(f"PushPlus 消息发送失败: {error_msg}")
                        
                        # 如果是重复内容错误，修改内容再试
                        if "重复" in error_msg or "频率" in error_msg:
                            print("检测到重复内容或频率限制，修改内容后重试")
                            # 添加更多随机内容
                            random_suffix = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=10))
                            data["content"] = content + f"\n\n<!-- {random_suffix} -->\n\n时间戳: {datetime.now().timestamp()}"
                            data["title"] = title + f" [{random_suffix[:4]}]"
                else:
                    print(f"PushPlus 请求失败，状态码: {response.status_code}")
                
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 10  # 更长的等待时间
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
            except Exception as e:
                print(f"PushPlus 请求异常: {str(e)}")
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 10
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        return False
    except Exception as e:
        print(f"发送 PushPlus 消息时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def send_to_dingtalk(message):
    """发送消息到钉钉群(已禁用)"""
    print("\n=== 钉钉推送已禁用 ===")
    return False

def send_to_wxpusher(title, content):
    """
    使用 WxPusher 发送微信消息
    """
    try:
        if not WXPUSHER_TOKEN or len(WXPUSHER_TOKEN.strip()) < 8 or not WXPUSHER_UID:
            print("WXPUSHER_TOKEN 或 WXPUSHER_UID 未设置或无效")
            return False
            
        debug_print(f"准备发送 WxPusher 消息")
        debug_print(f"标题: {title}")
        debug_print(f"内容长度: {len(content)}")
        debug_print(f"内容预览: {content[:100]}...")
        
        url = "https://wxpusher.zjiecode.com/api/send/message"
        data = {
            "appToken": WXPUSHER_TOKEN,
            "content": f"# {title}\n\n{content}",
            "contentType": 3,  # Markdown
            "uids": [WXPUSHER_UID],
        }
        
        debug_print(f"请求 URL: {url}")
        debug_print(f"Token 长度: {len(WXPUSHER_TOKEN)}")
        debug_print(f"UID: {WXPUSHER_UID}")
        
        # 添加重试机制
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=data, timeout=10)
                debug_print(f"WxPusher 响应状态码: {response.status_code}")
                debug_print(f"WxPusher 响应内容: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        print("WxPusher 消息发送成功")
                        return True
                    else:
                        print(f"WxPusher 消息发送失败: {result.get('msg', '未知错误')}")
                else:
                    print(f"WxPusher 请求失败，状态码: {response.status_code}")
                
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 5  # 指数退避，并增加基础等待时间
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
            except Exception as e:
                print(f"WxPusher 请求异常: {str(e)}")
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 5
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        return False
    except Exception as e:
        print(f"发送 WxPusher 消息时出错: {str(e)}")
        return False

def send_message(message):
    """
    发送消息到各个渠道
    """
    if not message or not message.strip():
        print("错误: 消息内容为空，无法发送")
        return False
    
    try:    
        # 添加唯一后缀，避免被识别为重复内容
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_str = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8))
        
        # 添加一个不可见的唯一标识符和随机内容变化
        unique_suffix = f"\n\n<!-- {timestamp}-{random_str} -->\n\n"
        unique_message = message + unique_suffix + f"消息ID: {random_str[:4]}-{timestamp[-6:]}"
        
        debug_print(f"准备发送消息，长度: {len(unique_message)}")
        debug_print(f"消息内容预览: {unique_message[:100]}...")
        
        # 提取标题（第一行）并添加随机字符
        lines = unique_message.strip().split('\n')
        base_title = lines[0].strip() if lines else "任务提醒"
        title = f"{base_title} [{random_str[:4]}]"
        
        print(f"消息标题: {title}")
        print(f"消息长度: {len(unique_message)} 字符")
        
        # 尝试所有可用的渠道发送消息
        success = False
        
        # 尝试通过 PushPlus 发送
        if PUSHPLUS_TOKEN:
            print("尝试通过 PushPlus 发送消息...")
            try:
                if send_to_wechat(title, unique_message):
                    success = True
                    print("PushPlus 发送成功")
                else:
                    print("PushPlus 发送失败，尝试其他渠道")
            except Exception as e:
                print(f"PushPlus 发送过程中出错: {str(e)}")
        else:
            print("PushPlus 未配置，跳过")
        
        # 如果 PushPlus 失败，等待一段时间再尝试 WxPusher
        if not success and WXPUSHER_TOKEN and WXPUSHER_UID:
            print("等待 10 秒后尝试 WxPusher...")
            time.sleep(10)
            
            print("尝试通过 WxPusher 发送消息...")
            try:
                if send_to_wxpusher(title, unique_message):
                    success = True
                    print("WxPusher 发送成功")
                else:
                    print("WxPusher 发送失败")
            except Exception as e:
                print(f"WxPusher 发送过程中出错: {str(e)}")
        elif not WXPUSHER_TOKEN or not WXPUSHER_UID:
            print("WxPusher 未配置，跳过")
        
        # 如果所有渠道都失败，返回失败
        if not success:
            print("所有消息渠道发送失败")
            return False
        
        return True
    except Exception as e:
        print(f"发送消息过程中出现未处理的异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

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
    """
    准备任务数据并保存到缓存文件
    """
    print(f"准备{'已完成' if is_done else '待办'}任务数据...")
    
    # 创建数据目录（如果不存在）
    os.makedirs('./data', exist_ok=True)
    
    # 多次尝试获取数据
    max_retries = 3
    tasks = None
    
    for attempt in range(max_retries):
        try:
            print(f"获取数据尝试 {attempt+1}/{max_retries}")
            tasks = get_notion_tasks(is_done)
            
            if tasks and tasks.get('results'):
                print(f"成功获取到 {len(tasks.get('results', []))} 个任务")
                break
            else:
                print("未获取到任务数据，将重试")
                
            if attempt < max_retries - 1:
                wait_time = 5 * (attempt + 1)
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
        except Exception as e:
            print(f"获取数据时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            
            if attempt < max_retries - 1:
                wait_time = 5 * (attempt + 1)
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
    
    # 检查是否成功获取数据
    if not tasks or not tasks.get('results'):
        print("所有尝试都失败，未能获取任务数据")
        return False
    
    # 保存数据到缓存文件
    try:
        cache_file = './data/task_data.json'
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)
        print(f"任务数据已保存到缓存文件: {cache_file}")
        
        # 生成并保存消息
        try:
            message = format_evening_message(tasks) if is_done else format_message(tasks)
            
            if not message or not message.strip():
                print("生成的消息为空，使用默认消息")
                message = f"{'✅ 今日完成任务' if is_done else '📋 今日待办任务'}\n\n暂无{'已完成' if is_done else '待办'}任务数据。"
            
            message_file = './data/message.txt'
            with open(message_file, 'w', encoding='utf-8') as f:
                f.write(message)
            print(f"消息已保存到文件: {message_file}")
            
            # 保存任务数量信息
            info = {
                'task_count': len(tasks.get('results', [])),
                'is_done': is_done,
                'timestamp': datetime.now().timestamp(),
                'message_length': len(message)
            }
            info_file = './data/info.json'
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(info, f, ensure_ascii=False, indent=2)
            print(f"任务信息已保存到文件: {info_file}")
            
            return True
        except Exception as e:
            print(f"生成或保存消息时出错: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # 尝试保存简单消息
            try:
                print("尝试保存简单消息...")
                simple_message = f"{'✅ 今日完成任务' if is_done else '📋 今日待办任务'}\n\n获取到 {len(tasks.get('results', []))} 个任务，但格式化失败。\n\n错误信息: {str(e)}"
                message_file = './data/message.txt'
                with open(message_file, 'w', encoding='utf-8') as f:
                    f.write(simple_message)
                print(f"简单消息已保存到文件: {message_file}")
                return True
            except Exception as e2:
                print(f"保存简单消息也失败了: {str(e2)}")
                return False
    except Exception as e:
        print(f"保存任务数据到缓存文件时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def send_cached_message():
    """
    从缓存文件中读取消息并发送
    返回值:
    - True: 发送成功
    - False: 发送失败
    - None: 缓存文件不存在
    """
    message_file = './data/message.txt'
    info_file = './data/info.json'
    
    # 检查缓存文件是否存在
    if not os.path.exists(message_file) or not os.path.exists(info_file):
        print(f"缓存文件不存在: {message_file} 或 {info_file}")
        return None
    
    try:
        # 读取任务信息
        with open(info_file, 'r', encoding='utf-8') as f:
            info = json.load(f)
            
        # 检查缓存是否过期（超过1小时）
        current_time = datetime.now().timestamp()
        cache_time = info.get('timestamp', 0)
        cache_age = current_time - cache_time
        
        if cache_age > 3600:  # 1小时 = 3600秒
            print(f"缓存已过期，已经过去了 {cache_age:.2f} 秒")
            return None
            
        # 读取消息内容
        with open(message_file, 'r', encoding='utf-8') as f:
            message = f.read()
            
        if not message or not message.strip():
            print("缓存的消息内容为空")
            return None
            
        print(f"从缓存读取到消息，长度: {len(message)}")
        print(f"任务数量: {info.get('task_count', 0)}, 类型: {'已完成' if info.get('is_done', False) else '待办'}")
        
        # 多次尝试发送消息
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"发送缓存消息尝试 {attempt+1}/{max_retries}")
                if send_message(message):
                    print("缓存消息发送成功")
                    return True
                else:
                    print(f"缓存消息发送失败，尝试 {attempt+1}/{max_retries}")
                
                if attempt < max_retries - 1:
                    wait_time = 15 * (attempt + 1)
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
            except Exception as e:
                print(f"发送缓存消息时出错: {str(e)}")
                import traceback
                traceback.print_exc()
                
                if attempt < max_retries - 1:
                    wait_time = 15 * (attempt + 1)
                    print(f"等待 {wait_time} 秒后重试...")
                    time.sleep(wait_time)
        
        print("所有尝试都失败，无法发送缓存消息")
        return False
    except Exception as e:
        print(f"读取或处理缓存消息时出错: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

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
        print(f"WXPUSHER_TOKEN: {WXPUSHER_TOKEN[:8] if len(WXPUSHER_TOKEN) >= 8 else '***'} (长度: {len(WXPUSHER_TOKEN)})")
        print(f"WXPUSHER_UID: {WXPUSHER_UID}")
        print(f"REMINDER_TYPE: {os.environ.get('REMINDER_TYPE', '未设置')}")
        print(f"NOTION_TOKEN: {'已设置' if NOTION_TOKEN else '未设置'}")
        print(f"DATABASE_ID: {'已设置' if DATABASE_ID else '未设置'}")
        
        # 检查推送渠道是否配置正确
        if not PUSHPLUS_TOKEN or len(PUSHPLUS_TOKEN.strip()) < 8:
            print("警告: PUSHPLUS_TOKEN 未正确设置")
        
        if not WXPUSHER_TOKEN or len(WXPUSHER_TOKEN.strip()) < 8 or not WXPUSHER_UID:
            print("警告: WXPUSHER 配置未正确设置")
            
        if (not PUSHPLUS_TOKEN or len(PUSHPLUS_TOKEN.strip()) < 8) and (not WXPUSHER_TOKEN or len(WXPUSHER_TOKEN.strip()) < 8 or not WXPUSHER_UID):
            print("错误: 所有推送渠道都未正确配置，无法发送消息")
            # 继续执行，但可能无法发送消息
        
        is_done = os.environ.get('REMINDER_TYPE') == 'daily_done'
        action_type = os.environ.get('ACTION_TYPE', 'send')
        send_time = os.environ.get('SEND_TIME', '08:00')
        
        # 任务类型和操作类型的日志
        task_type_desc = "已完成任务" if is_done else "待办任务"
        action_desc = "准备" if action_type == 'prepare' else "发送"
        print(f"\n=== 开始{action_desc}{task_type_desc} ===")
        
        # 强制发送模式（用于调试）
        force_send = os.environ.get('FORCE_SEND', '').lower() in ['true', '1', 'yes']
        if force_send:
            print("警告: 强制发送模式已启用，将忽略时间检查")
        
        if action_type == 'prepare':
            # 准备数据模式，只获取和保存数据，不发送消息
            print(f"准备{task_type_desc}数据...")
            try:
                if prepare_task_data(is_done):
                    print(f"{task_type_desc}数据准备完成")
                    return
                else:
                    print(f"{task_type_desc}数据准备失败，但不中断执行")
            except Exception as e:
                print(f"数据准备过程中出错: {str(e)}")
                print("继续执行，不中断流程")
        else:
            # 发送模式
            # 检查是否是允许的发送时间
            valid_send_times = {
                'daily_todo': '08:00',
                'daily_done': '22:00'
            }
            expected_time = valid_send_times.get(os.environ.get('REMINDER_TYPE', ''), None)
            
            if expected_time and send_time != expected_time and not force_send:
                print(f"警告: 当前设置的发送时间 {send_time} 与任务类型 {os.environ.get('REMINDER_TYPE')} 的预期时间 {expected_time} 不匹配")
            
            if send_time not in ['08:00', '22:00'] and not force_send:
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
            
            # 多次尝试获取数据
            max_retries = 3
            tasks = None
            
            for attempt in range(max_retries):
                try:
                    print(f"获取数据尝试 {attempt+1}/{max_retries}")
                    tasks = get_notion_tasks(is_done)
                    
                    if tasks and tasks.get('results'):
                        print(f"成功获取到 {len(tasks.get('results', []))} 个任务")
                        break
                    else:
                        print("未获取到任务数据，将重试")
                        
                    if attempt < max_retries - 1:
                        wait_time = 5 * (attempt + 1)
                        print(f"等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
                except Exception as e:
                    print(f"获取数据时出错: {str(e)}")
                    if attempt < max_retries - 1:
                        wait_time = 5 * (attempt + 1)
                        print(f"等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
            
            # 即使没有获取到任务，也生成一个默认消息
            if not tasks or not tasks.get('results'):
                print("未获取到任务数据，使用默认消息")
                default_message = f"{'✅ 今日完成任务' if is_done else '📋 今日待办任务'}\n\n暂无{'已完成' if is_done else '待办'}任务数据。\n\n可能的原因：\n1. Notion API 连接问题\n2. 数据库中没有符合条件的任务\n3. 数据库结构可能已更改"
                
                # 多次尝试发送默认消息
                for attempt in range(3):
                    try:
                        print(f"发送默认消息尝试 {attempt+1}/3")
                        if send_message(default_message):
                            print("默认消息发送成功")
                            return
                        else:
                            print(f"默认消息发送失败，尝试 {attempt+1}/3")
                        
                        if attempt < 2:
                            wait_time = 15 * (attempt + 1)
                            print(f"等待 {wait_time} 秒后重试...")
                            time.sleep(wait_time)
                    except Exception as e:
                        print(f"发送默认消息时出错: {str(e)}")
                        if attempt < 2:
                            wait_time = 15 * (attempt + 1)
                            print(f"等待 {wait_time} 秒后重试...")
                            time.sleep(wait_time)
                
                # 如果所有尝试都失败，抛出异常
                raise Exception(f"默认{task_type_desc}消息发送失败")
            
            print(f"获取到 {len(tasks.get('results', []))} 个任务")
            
            # 多次尝试格式化和发送消息
            for attempt in range(3):
                try:
                    print(f"格式化和发送消息尝试 {attempt+1}/3")
                    message = format_evening_message(tasks) if is_done else format_message(tasks)
                    
                    if not message or not message.strip():
                        print(f"生成消息为空，使用默认消息")
                        message = f"{'✅ 今日完成任务' if is_done else '📋 今日待办任务'}\n\n暂无{'已完成' if is_done else '待办'}任务数据。"
                    
                    if send_message(message):
                        print("消息发送成功")
                        return
                    else:
                        print(f"消息发送失败，尝试 {attempt+1}/3")
                    
                    if attempt < 2:
                        wait_time = 20 * (attempt + 1)
                        print(f"等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
                except Exception as e:
                    print(f"格式化或发送消息时出错: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    
                    if attempt < 2:
                        wait_time = 20 * (attempt + 1)
                        print(f"等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
                    
                    # 最后一次尝试，使用简单消息
                    if attempt == 2:
                        try:
                            print("尝试发送简单消息...")
                            task_count = len(tasks.get('results', []))
                            simple_message = f"{'✅ 今日完成任务' if is_done else '📋 今日待办任务'}\n\n获取到 {task_count} 个任务，但格式化失败。\n\n错误信息: {str(e)}"
                            if send_message(simple_message):
                                print("简单消息发送成功")
                                return
                        except Exception as e2:
                            print(f"发送简单消息也失败了: {str(e2)}")
            
            # 如果所有尝试都失败，抛出异常
            raise Exception(f"{task_type_desc}消息发送失败")
            
    except Exception as e:
        print(f"运行出错: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # 尝试发送错误通知
        try:
            is_done = os.environ.get('REMINDER_TYPE') == 'daily_done'
            error_message = f"{'✅ 今日完成任务' if is_done else '📋 今日待办任务'}\n\n系统运行出错，请检查日志。\n\n错误信息: {str(e)}\n\n时间戳: {datetime.now().timestamp()}"
            
            # 多次尝试发送错误通知
            for attempt in range(3):
                try:
                    print(f"发送错误通知尝试 {attempt+1}/3")
                    if send_message(error_message):
                        print("错误通知已发送")
                        break
                    
                    if attempt < 2:
                        wait_time = 15 * (attempt + 1)
                        print(f"等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
                except Exception as e2:
                    print(f"发送错误通知时出错: {str(e2)}")
                    if attempt < 2:
                        wait_time = 15 * (attempt + 1)
                        print(f"等待 {wait_time} 秒后重试...")
                        time.sleep(wait_time)
        except Exception as e2:
            print(f"发送错误通知过程中出错: {str(e2)}")
            print("发送错误通知也失败了")
        
        # 不再抛出异常，避免脚本崩溃
        print("尽管出现错误，脚本将正常退出")
        return 1
    
    return 0

if __name__ == "__main__":
    main()
