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
DINGTALK_TOKEN = "812a9229191e0073b8e8f7b8634566be7ad6c76250e62ed98335d29d342c1336"
DINGTALK_SECRET = "SEC49c94c1d04babd709d033051569ed245d99857f5c744f77656abd15bd30abf90"
DINGTALK_WEBHOOK = f"https://oapi.dingtalk.com/robot/send?access_token={DINGTALK_TOKEN}"

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
                            "equals": "done"
                        }
                    },
                    {
                        "property": "上次编辑时间",
                        "last_edited_time": {
                            "on_or_after": today
                        }
                    }
                ]
            },
            "sorts": [
                {
                    "property": "上次编辑时间",
                    "direction": "descending"
                }
            ]
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
                                    "equals": "pedding"
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
        print(f"查询条件: {body}")
        
        all_tasks = []
        has_more = True
        start_cursor = None
        
        # 使用分页获取所有任务
        while has_more:
            if start_cursor:
                body['start_cursor'] = start_cursor
                
            response = requests.post(
                f"https://api.notion.com/v1/databases/{DATABASE_ID}/query",
                headers=headers,
                json=body
            )
            
            if response.status_code != 200:
                print(f"Notion API错误: {response.text}")
                return {"results": []}
            
            data = response.json()
            all_tasks.extend(data.get('results', []))
            has_more = data.get('has_more', False)
            start_cursor = data.get('next_cursor')
        
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
            parent_relations = properties.get('上级项目', {}).get('relation', [])
            child_relations = properties.get('子级项目', {}).get('relation', [])
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
        status_order = {'inbox': 0, 'pedding': 1, 'doing': 2, 'done': 3}
        
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
                
                for child in sorted_children:
                    # 添加子任务
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
            
            # 在每个主任务后添加空行，增加可读性
            message.append('')
        
        messages.append('\n'.join(message).rstrip())  # 移除最后的空行
    
    return "\n\n---\n\n".join(messages) if len(messages) > 1 else messages[0]

def format_evening_message(tasks_data):
    """格式化晚上的完成任务消息"""
    try:
        # 过滤今天完成的任务
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_tasks = []
        
        print(f"处理已完成任务，检查日期: {today}")
        
        for result in tasks_data.get('results', []):
            try:
                if result.get('last_edited_time', '').startswith(today):
                    today_tasks.append(result)
            except AttributeError as e:
                print(f"检查任务日期时出错: {str(e)}")
                continue
        
        total_tasks = len(today_tasks)
        if total_tasks == 0:
            return "✅ 今日完成 (0/0)\n\n还没有完成任何任务哦！加油！"
        
        # 假设总任务数是完成任务的1.5倍
        estimated_total = max(total_tasks, round(total_tasks * 1.5))
        completion_rate = round((total_tasks / estimated_total) * 100)
        
        message = [f"✅ 今日完成 ({total_tasks}/{estimated_total})"]
        
        # 统计信息初始化
        important_count = 0
        urgent_count = 0
        
        # 添加任务列表
        for idx, result in enumerate(today_tasks, 1):
            try:
                properties = result.get('properties', {})
                if not properties:
                    print(f"警告: 第{idx}个任务没有properties属性")
                    continue
                
                # 获取任务信息
                name = '未命名任务'
                try:
                    title = properties.get('任务名称', {}).get('title', [])
                    if title and isinstance(title[0], dict):
                        name = title[0].get('plain_text', '未命名任务')
                except (IndexError, AttributeError) as e:
                    print(f"获取任务名称时出错: {str(e)}")
                
                task_type = '未分类'
                try:
                    type_data = properties.get('任务类型', {}).get('select', {})
                    if isinstance(type_data, dict):
                        task_type = type_data.get('name', '未分类')
                except AttributeError as e:
                    print(f"获取任务类型时出错: {str(e)}")
                
                priority = 'P3'
                try:
                    priority_data = properties.get('四象限', {}).get('select', {})
                    if isinstance(priority_data, dict):
                        priority = priority_data.get('name', 'P3')
                except AttributeError as e:
                    print(f"获取优先级时出错: {str(e)}")
                
                # 统计重要和紧急任务
                if 'P0' in priority or 'P1' in priority:
                    important_count += 1
                if 'P0' in priority or 'P2' in priority:
                    urgent_count += 1
                
                message.append(f"{idx}. {name} | {task_type} | {priority[:2]}")
                
            except Exception as e:
                print(f"处理第{idx}个任务时出错: {str(e)}")
                continue
        
        # 添加统计信息
        message.append(f"\n📊 完成率: {completion_rate}% | 重要{important_count} | 紧急{urgent_count}")
        
        return "\n\n".join(message)
        
    except Exception as e:
        print(f"格式化晚间消息时出错: {str(e)}")
        return "生成晚间总结时出错，请检查日志"

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
    """发送消息到钉钉群"""
    try:
        # 生成时间戳和签名
        timestamp = str(round(time.time() * 1000))
        secret = DINGTALK_SECRET
        secret_enc = secret.encode('utf-8')
        string_to_sign = '{}\n{}'.format(timestamp, secret)
        string_to_sign_enc = string_to_sign.encode('utf-8')
        hmac_code = hmac.new(secret_enc, string_to_sign_enc, digestmod=hashlib.sha256).digest()
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code))
        
        # 构建完整的URL
        url = f"{DINGTALK_WEBHOOK}&timestamp={timestamp}&sign={sign}"
        
        print(f"\n=== 钉钉发送信息 ===")
        print(f"时间戳: {timestamp}")
        print(f"目标URL: {url}")
        
        # 构建消息内容，确保分隔线正确显示
        data = {
            "msgtype": "markdown",
            "markdown": {
                "title": "任务提醒",
                "text": message.replace("---", "---\n")  # 确保分隔线正确显示
            }
        }
        
        print(f"发送数据: {data}")
        
        # 发送请求
        response = requests.post(url, json=data, timeout=10)
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('errcode') == 0:
                print("钉钉消息发送成功")
                return True
            else:
                print(f"钉钉返回错误: {result}")
                return False
        else:
            print(f"HTTP请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"钉钉发送失败: {str(e)}")
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
    
    # 钉钉推送
    print("\n=== 开始钉钉推送 ===")
    dingtalk_result = send_to_dingtalk(message)
    results.append(dingtalk_result)
    print(f"钉钉发送{'成功' if dingtalk_result else '失败'}")
    
    # WxPusher 推送
    print("\n=== 开始 WxPusher 推送 ===")
    wxpusher_result = send_to_wxpusher(message)
    results.append(wxpusher_result)
    print(f"WxPusher发送{'成功' if wxpusher_result else '失败'}")
    
    return any(results)

def wait_until_send_time():
    beijing_tz = pytz.timezone('Asia/Shanghai')
    target_time_str = os.environ.get('SEND_TIME', '08:00')  # 默认早上8点
    
    now = datetime.now(beijing_tz)
    target_time = datetime.strptime(target_time_str, '%H:%M').time()
    target_datetime = datetime.combine(now.date(), target_time)
    target_datetime = beijing_tz.localize(target_datetime)
    
    if now.time() > target_time:
        # 如果当前时间已经过了目标时间，说明是测试运行，立即发送
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
        
        message = None
        try:
            tasks = get_notion_tasks(is_evening)
            
            if tasks.get('results'):
                print(f"获取到 {len(tasks.get('results', []))} 个任务")
                message = format_evening_message(tasks) if is_evening else format_message(tasks)
            else:
                print("没有获取到任何任务")
                message = "今日没有已完成的任务。" if is_evening else "今日没有待办任务。"
        except Exception as e:
            print(f"获取或格式化任务时出错: {str(e)}")
            message = "获取任务信息时出错，请检查 Notion API 配置。"
        
        if not message or not message.strip():
            message = "生成任务消息时出错，请检查日志。"
        
        # 等待到指定时间
        wait_until_send_time()
        
        print("发送消息...")
        if send_message(message):
            print("至少一个渠道发送成功!")
            return  # 成功发送则返回 0
        else:
            print("所有渠道发送失败!")
            raise Exception("消息发送失败")  # 抛出异常导致返回 1
            
    except Exception as e:
        print(f"运行出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
