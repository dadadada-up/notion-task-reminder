"""
Notion Service - 封装 Notion API 交互逻辑
"""

import requests
from datetime import datetime, timezone
import os
import pytz
import time
from typing import List, Dict, Optional
import mimetypes

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
            
            # 添加图片（支持外部链接和 file_upload）
            if 'images' in task_data and task_data['images']:
                files = []
                for img in task_data['images']:
                    if isinstance(img, dict):
                        if 'file_upload_id' in img:
                            # Notion File Upload 格式
                            files.append({
                                "name": img.get('name', 'image'),
                                "type": "file_upload",
                                "file_upload": {"id": img['file_upload_id']}
                            })
                        elif 'url' in img:
                            # 外部链接格式
                            files.append({
                                "name": img.get('name', 'image'),
                                "type": "external",
                                "external": {"url": img['url']}
                            })
                    elif isinstance(img, str):
                        # 直接是URL字符串
                        files.append({
                            "name": "image",
                            "type": "external",
                            "external": {"url": img}
                        })
                if files:
                    properties['图片'] = {"files": files}
            
            # 添加父任务关联（如果提供了 parent_ids）
            if 'parent_ids' in task_data and task_data['parent_ids']:
                # 使用"上级 项目"关系属性（注意中间有空格）
                # parent_ids 是一个数组，需要转换为 Notion 的 relation 格式
                properties['上级 项目'] = {
                    "relation": [{"id": pid} for pid in task_data['parent_ids']]
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
            
            # 更新图片（支持外部链接和 file_upload）
            if 'images' in updates:
                if updates['images']:
                    files = []
                    for img in updates['images']:
                        if isinstance(img, dict):
                            if 'file_upload_id' in img:
                                # Notion File Upload 格式
                                files.append({
                                    "name": img.get('name', 'image'),
                                    "type": "file_upload",
                                    "file_upload": {"id": img['file_upload_id']}
                                })
                            elif 'url' in img:
                                # 外部链接格式
                                files.append({
                                    "name": img.get('name', 'image'),
                                    "type": "external",
                                    "external": {"url": img['url']}
                                })
                        elif isinstance(img, str):
                            # 直接是URL字符串
                            files.append({
                                "name": "image",
                                "type": "external",
                                "external": {"url": img}
                            })
                    properties['图片'] = {"files": files}
                else:
                    # 清空图片
                    properties['图片'] = {"files": []}
            
            # 添加父任务关联（如果提供了 parent_ids）
            if 'parent_ids' in updates:
                # 使用"上级 项目"关系属性（注意中间有空格）
                # parent_ids 是一个数组，需要转换为 Notion 的 relation 格式
                if updates['parent_ids'] and len(updates['parent_ids']) > 0:
                    properties['上级 项目'] = {
                        "relation": [{"id": pid} for pid in updates['parent_ids']]
                    }
                else:
                    # 如果 parent_ids 为空数组，清空关系
                    properties['上级 项目'] = {"relation": []}
            
            if 'completed_time' in updates:
                if updates['completed_time']:
                    properties['任务完成时间'] = {
                        "date": {"start": updates['completed_time']}
                    }
                else:
                    properties['任务完成时间'] = {"date": None}
            
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
            
            print(f"[NotionService] 查询{'已完成' if is_done else '待办'}任务，日期: {today_str}")
            
            url = f"{self.base_url}/databases/{self.database_id}/query"
            
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
                print(f"[NotionService] 查询条件: 状态=已完成 AND 任务完成时间={today_str}")
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
            
            print(f"[NotionService] Notion API 返回 {len(results)} 个任务")
            
            # 格式化任务数据
            tasks = []
            for result in results:
                task = self._format_task(result)
                # 打印已完成任务的完成时间用于调试
                if is_done and task:
                    print(f"[NotionService] 任务: {task.get('name')}, 完成时间: {task.get('completed_time')}")
                tasks.append(task)
            
            print(f"[NotionService] 格式化后返回 {len(tasks)} 个任务")
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
        
        # 获取图片
        images_obj = properties.get('图片', {})
        images = []
        if images_obj and images_obj.get('files'):
            files_list = images_obj.get('files', [])
            for file in files_list:
                if file:
                    # Notion files 字段可能包含外部文件或内部文件
                    file_info = {
                        'name': file.get('name', ''),
                        'type': file.get('type', 'file')  # 'file' 或 'external'
                    }
                    
                    # 根据类型获取URL
                    if file.get('type') == 'external':
                        file_info['url'] = file.get('external', {}).get('url', '')
                    else:
                        file_info['url'] = file.get('file', {}).get('url', '')
                    
                    # 添加过期时间（Notion内部文件URL会过期）
                    if file.get('file') and file.get('file', {}).get('expiry_time'):
                        file_info['expiry_time'] = file.get('file', {}).get('expiry_time')
                    
                    images.append(file_info)
        
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
            'notes': notes,
            'images': images
        }
    
    def create_file_upload(self, filename: str = None, content_type: str = None) -> Dict:
        """
        创建 File Upload 对象（Notion File Upload API Step 1）
        
        Args:
            filename: 文件名（可选）
            content_type: MIME 类型（可选，如 'image/png'）
            
        Returns:
            包含 id 和 upload_url 的字典
        """
        try:
            url = f"{self.base_url}/file_uploads"
            
            payload = {}
            if filename:
                payload['filename'] = filename
            if content_type:
                payload['content_type'] = content_type
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"创建 File Upload 失败: {response.text}")
            
            result = response.json()
            print(f"✅ 创建 File Upload 成功: {result.get('id')}")
            return result
            
        except Exception as e:
            print(f"❌ 创建 File Upload 失败: {str(e)}")
            raise
    
    def upload_file_content(self, upload_id: str, file_content: bytes, content_type: str = 'image/png') -> Dict:
        """
        上传文件内容（Notion File Upload API Step 2）
        
        Args:
            upload_id: File Upload 对象的 ID
            file_content: 文件的二进制内容
            content_type: MIME 类型
            
        Returns:
            上传结果
        """
        try:
            url = f"{self.base_url}/file_uploads/{upload_id}/send"
            
            # 使用 multipart/form-data 上传
            files = {
                'file': ('image', file_content, content_type)
            }
            
            # 注意：这里不使用 self.headers，因为 Content-Type 需要是 multipart/form-data
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Notion-Version": "2022-06-28"
            }
            
            response = requests.post(url, headers=headers, files=files)
            
            if response.status_code != 200:
                raise Exception(f"上传文件内容失败: {response.text}")
            
            result = response.json()
            print(f"✅ 上传文件内容成功: {upload_id}")
            return result
            
        except Exception as e:
            print(f"❌ 上传文件内容失败: {str(e)}")
            raise
    
    def upload_image_to_notion(self, file_content: bytes, filename: str = 'image.png') -> str:
        """
        完整的图片上传流程（Step 1 + Step 2）
        
        Args:
            file_content: 图片的二进制内容
            filename: 文件名
            
        Returns:
            file_upload_id: 上传成功后的文件 ID
        """
        try:
            # 检测文件类型
            content_type, _ = mimetypes.guess_type(filename)
            if not content_type or not content_type.startswith('image/'):
                content_type = 'image/png'  # 默认类型
            
            print(f"📤 开始上传图片: {filename} ({content_type})")
            
            # Step 1: 创建 File Upload 对象
            file_upload = self.create_file_upload(filename=filename, content_type=content_type)
            upload_id = file_upload['id']
            
            # Step 2: 上传文件内容
            self.upload_file_content(upload_id, file_content, content_type)
            
            print(f"✅ 图片上传完成: {upload_id}")
            return upload_id
            
        except Exception as e:
            print(f"❌ 图片上传失败: {str(e)}")
            raise
