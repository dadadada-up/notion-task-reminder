"""
Notion Service - 封装 Notion API 交互逻辑
"""

import requests
from datetime import datetime, timezone
import os
import pytz
import time
from typing import List, Dict, Optional

class NotionService:
    def __init__(self):
        self.token = os.environ.get('NOTION_TOKEN')
        self.database_id = os.environ.get('DATABASE_ID')
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
        self.base_url = "https://api.notion.com/v1"
    
    def _retry_request(self, func, max_retries=3, delay=1):
        """重试机制，处理网络连接问题"""
        for attempt in range(max_retries):
            try:
                return func()
            except (requests.exceptions.ConnectionError, 
                    requests.exceptions.Timeout,
                    ConnectionResetError) as e:
                if attempt < max_retries - 1:
                    print(f"⚠️  网络连接失败 (尝试 {attempt + 1}/{max_retries})，{delay}秒后重试...")
                    time.sleep(delay)
                    delay *= 2  # 指数退避
                else:
                    raise Exception(f"网络连接失败，已重试{max_retries}次: {str(e)}")
        
    def get_tasks(self, status: Optional[str] = None, 
                  assignee: Optional[str] = None,
                  priority: Optional[str] = None,
                  task_type: Optional[str] = None) -> List[Dict]:
        """
        获取任务列表
        """
        try:
            # 检查配置
            if not self.token or not self.database_id:
                raise Exception("Notion token or database_id not configured")
            
            url = f"{self.base_url}/databases/{self.database_id}/query"
            
            # 构建过滤条件
            filters = []
            
            if status:
                filters.append({
                    "property": "状态",
                    "status": {"equals": status}
                })
            
            if assignee:
                filters.append({
                    "property": "负责人",
                    "select": {"equals": assignee}
                })
            
            if priority:
                filters.append({
                    "property": "四象限",
                    "select": {"equals": priority}
                })
            
            if task_type:
                filters.append({
                    "property": "任务类型",
                    "select": {"equals": task_type}
                })
            
            # 构建请求体
            payload = {}
            if filters:
                if len(filters) == 1:
                    payload["filter"] = filters[0]
                else:
                    payload["filter"] = {"and": filters}
            
            # 使用重试机制发送请求，并处理分页
            all_results = []
            has_more = True
            start_cursor = None
            
            while has_more:
                # 添加分页参数
                current_payload = payload.copy()
                if start_cursor:
                    current_payload["start_cursor"] = start_cursor
                
                def make_request():
                    resp = requests.post(url, headers=self.headers, json=current_payload, timeout=10)
                    if resp.status_code != 200:
                        raise Exception(f"Notion API error: {resp.text}")
                    return resp
                
                response = self._retry_request(make_request)
                data = response.json()
                
                # 添加当前页的结果
                all_results.extend(data.get('results', []))
                
                # 检查是否还有更多数据
                has_more = data.get('has_more', False)
                start_cursor = data.get('next_cursor')
                
                print(f"已获取 {len(all_results)} 个任务，has_more: {has_more}")
            
            # 格式化任务数据
            tasks = []
            for result in all_results:
                task = self._format_task(result)
                tasks.append(task)
            
            print(f"总共获取到 {len(tasks)} 个任务")
            return tasks
            
        except Exception as e:
            print(f"Error getting tasks: {str(e)}")
            raise
    
    def get_task_by_id(self, task_id: str) -> Optional[Dict]:
        """获取单个任务"""
        try:
            url = f"{self.base_url}/pages/{task_id}"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 404:
                return None
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            return self._format_task(result)
            
        except Exception as e:
            print(f"Error getting task {task_id}: {str(e)}")
            raise
    
    def create_task(self, task_data: Dict) -> Dict:
        """创建新任务"""
        try:
            url = f"{self.base_url}/pages"
            
            # 构建任务属性
            properties = {
                '任务名称': {
                    "title": [{"text": {"content": task_data.get('name', '未命名任务')}}]
                }
            }
            
            if 'status' in task_data:
                properties['状态'] = {
                    "status": {"name": task_data['status']}
                }
            
            if 'priority' in task_data:
                properties['四象限'] = {
                    "select": {"name": task_data['priority']}
                }
            
            if 'assignee' in task_data:
                properties['负责人'] = {
                    "select": {"name": task_data['assignee']}
                }
            
            if 'task_type' in task_data:
                properties['任务类型'] = {
                    "select": {"name": task_data['task_type']}
                }
            
            if 'start_date' in task_data and task_data['start_date']:
                properties['开始日期'] = {
                    "date": {"start": task_data['start_date']}
                }
            
            if 'deadline' in task_data and task_data['deadline']:
                properties['截止日期'] = {
                    "date": {"start": task_data['deadline']}
                }
            
            if 'notes' in task_data and task_data['notes']:
                properties['备注'] = {
                    "rich_text": [{"text": {"content": task_data['notes']}}]
                }
            
            payload = {
                "parent": {"database_id": self.database_id},
                "properties": properties
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            return self._format_task(result)
            
        except Exception as e:
            print(f"Error creating task: {str(e)}")
            raise
    
    def update_task(self, task_id: str, updates: Dict) -> Dict:
        """更新任务"""
        try:
            url = f"{self.base_url}/pages/{task_id}"
            
            # 构建更新属性
            properties = {}
            
            if 'name' in updates:
                properties['任务名称'] = {
                    "title": [{"text": {"content": updates['name']}}]
                }
            
            if 'status' in updates:
                properties['状态'] = {
                    "status": {"name": updates['status']}
                }
            
            if 'priority' in updates:
                properties['四象限'] = {
                    "select": {"name": updates['priority']}
                }
            
            if 'assignee' in updates:
                properties['负责人'] = {
                    "select": {"name": updates['assignee']}
                }
            
            if 'task_type' in updates:
                properties['任务类型'] = {
                    "select": {"name": updates['task_type']}
                }
            
            if 'start_date' in updates:
                if updates['start_date']:
                    properties['开始日期'] = {
                        "date": {"start": updates['start_date']}
                    }
                else:
                    properties['开始日期'] = {"date": None}
            
            if 'deadline' in updates:
                if updates['deadline']:
                    properties['截止日期'] = {
                        "date": {"start": updates['deadline']}
                    }
                else:
                    properties['截止日期'] = {"date": None}
            
            if 'notes' in updates:
                if updates['notes']:
                    properties['备注'] = {
                        "rich_text": [{"text": {"content": updates['notes']}}]
                    }
                else:
                    properties['备注'] = {"rich_text": []}
            
            payload = {"properties": properties}
            
            response = requests.patch(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            return self._format_task(result)
            
        except Exception as e:
            print(f"Error updating task {task_id}: {str(e)}")
            raise
    
    def get_tasks_for_notification(self, is_done: bool = False) -> List[Dict]:
        """获取用于通知的任务"""
        try:
            beijing_tz = pytz.timezone('Asia/Shanghai')
            now = datetime.now(timezone.utc).astimezone(beijing_tz)
            today = now.date()
            today_str = today.strftime('%Y-%m-%d')
            
            url = f"{self.base_url}/databases/{self.database_id}/query"
            
            if is_done:
                # 查询今天已完成的任务
                filter_conditions = {
                    "and": [{
                        "property": "状态",
                        "status": {"equals": "已完成"}
                    }]
                }
            else:
                # 查询今天待办的任务
                filter_conditions = {
                    "or": [
                        {
                            "property": "状态",
                            "status": {"equals": "进行中"}
                        },
                        {
                            "and": [
                                {
                                    "property": "状态",
                                    "status": {"equals": "收集箱"}
                                },
                                {
                                    "property": "开始日期",
                                    "date": {"on_or_before": today_str}
                                }
                            ]
                        }
                    ]
                }
            
            payload = {"filter": filter_conditions}
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            data = response.json()
            results = data.get('results', [])
            
            # 格式化任务数据
            tasks = []
            for result in results:
                task = self._format_task(result)
                tasks.append(task)
            
            return tasks
            
        except Exception as e:
            print(f"Error getting notification tasks: {str(e)}")
            raise
    
    def get_statistics(self) -> Dict:
        """获取任务统计数据"""
        try:
            # 检查配置
            if not self.token or not self.database_id:
                raise Exception("Notion token or database_id not configured")
            
            # 获取所有任务
            all_tasks = self.get_tasks()
            
            # 统计数据
            stats = {
                'total': len(all_tasks),
                'by_status': {},
                'by_priority': {},
                'by_type': {},
                'by_assignee': {},
                'today_completed': 0,
                'important_tasks': 0,
                'urgent_tasks': 0
            }
            
            beijing_tz = pytz.timezone('Asia/Shanghai')
            today = datetime.now(beijing_tz).date()
            
            for task in all_tasks:
                # 按状态统计
                status = task.get('status', 'unknown')
                stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
                
                # 按优先级统计
                priority = task.get('priority', 'P3')
                stats['by_priority'][priority] = stats['by_priority'].get(priority, 0) + 1
                
                # 按类型统计
                task_type = task.get('task_type', '未分类')
                stats['by_type'][task_type] = stats['by_type'].get(task_type, 0) + 1
                
                # 按负责人统计
                assignee = task.get('assignee', '未分配')
                stats['by_assignee'][assignee] = stats['by_assignee'].get(assignee, 0) + 1
                
                # 统计重要和紧急任务
                if priority in ['P0 重要紧急', 'P1 重要不紧急']:
                    stats['important_tasks'] += 1
                if priority in ['P0 重要紧急', 'P2 紧急不重要']:
                    stats['urgent_tasks'] += 1
                
                # 统计今日完成
                if status == '已完成':
                    last_edited = task.get('last_edited_time')
                    if last_edited:
                        try:
                            edited_date = datetime.fromisoformat(last_edited.replace('Z', '+00:00'))
                            edited_date = edited_date.astimezone(beijing_tz).date()
                            if edited_date == today:
                                stats['today_completed'] += 1
                        except:
                            pass
            
            return stats
            
        except Exception as e:
            print(f"Error getting statistics: {str(e)}")
            raise
    
    def _format_task(self, result: Dict) -> Dict:
        """格式化任务数据"""
        if not result:
            return None
            
        properties = result.get('properties', {})
        
        # 获取任务名称
        title = properties.get('任务名称', {}).get('title', [])
        name = title[0].get('plain_text', '未命名任务') if title else '未命名任务'
        
        # 获取状态
        status_obj = properties.get('状态', {})
        if status_obj and status_obj.get('status'):
            status = status_obj.get('status', {}).get('name', '收集箱')
        else:
            status = '收集箱'
        
        # 获取负责人
        assignee_obj = properties.get('负责人', {})
        if assignee_obj and assignee_obj.get('select'):
            assignee = assignee_obj.get('select', {}).get('name', '未分配')
        else:
            assignee = '未分配'
        
        # 获取优先级
        priority_obj = properties.get('四象限', {})
        if priority_obj and priority_obj.get('select'):
            priority = priority_obj.get('select', {}).get('name', 'P3 不重要不紧急')
        else:
            priority = 'P3 不重要不紧急'
        
        # 获取任务类型
        task_type_obj = properties.get('任务类型', {})
        if task_type_obj and task_type_obj.get('select'):
            task_type = task_type_obj.get('select', {}).get('name', '未分类')
        else:
            task_type = '未分类'
        
        # 获取关系
        parent_relations = properties.get('上级 项目', {}).get('relation', []) if properties.get('上级 项目') else []
        parent_ids = [p.get('id') for p in parent_relations if p and p.get('id')]
        
        child_relations = properties.get('子级 项目', {}).get('relation', []) if properties.get('子级 项目') else []
        child_ids = [c.get('id') for c in child_relations if c and c.get('id')]
        
        blocked_by_relations = properties.get('被阻止', {}).get('relation', []) if properties.get('被阻止') else []
        blocked_by_ids = [b.get('id') for b in blocked_by_relations if b and b.get('id')]
        
        # 获取开始日期
        start_date_obj = properties.get('开始日期', {})
        start_date = None
        if start_date_obj and start_date_obj.get('date'):
            start_date = start_date_obj.get('date', {}).get('start')
        
        # 获取截止日期
        deadline_obj = properties.get('截止日期', {})
        deadline = None
        if deadline_obj and deadline_obj.get('date'):
            deadline = deadline_obj.get('date', {}).get('start')
        
        # 获取备注
        notes_obj = properties.get('备注', {})
        notes = None
        if notes_obj and notes_obj.get('rich_text'):
            notes_list = notes_obj.get('rich_text', [])
            if notes_list:
                notes = ''.join([text.get('plain_text', '') for text in notes_list])
        
        # 获取任务完成时间
        completed_time_obj = properties.get('任务完成时间', {})
        completed_time = None
        if completed_time_obj and completed_time_obj.get('date'):
            completed_time = completed_time_obj.get('date', {}).get('start')
        
        # 获取电子邮件
        email_obj = properties.get('电子邮件', {})
        email = None
        if email_obj and email_obj.get('email'):
            email = email_obj.get('email')
        
        # 获取唯一ID
        unique_id_obj = properties.get('ID', {})
        unique_id = None
        if unique_id_obj and unique_id_obj.get('unique_id'):
            unique_id = unique_id_obj.get('unique_id', {}).get('prefix') + '-' + str(unique_id_obj.get('unique_id', {}).get('number', ''))
        
        return {
            'id': result.get('id'),
            'name': name,
            'status': status,
            'assignee': assignee,
            'priority': priority,
            'task_type': task_type,
            'parent_ids': parent_ids,
            'child_ids': child_ids,
            'blocked_by_ids': blocked_by_ids,
            'created_time': result.get('created_time'),
            'last_edited_time': result.get('last_edited_time'),
            'url': result.get('url'),
            'start_date': start_date,
            'deadline': deadline,
            'completed_time': completed_time,
            'email': email,
            'unique_id': unique_id,
            'notes': notes
        }
