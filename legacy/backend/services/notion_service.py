"""
Notion Service - 封装 Notion API 交互逻辑
"""

import requests
from datetime import datetime, timezone, timedelta
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
        
        # 添加缓存相关属性
        self._tasks_cache = None
        self._cache_timestamp = 0
        self._cache_ttl = 30  # 缓存有效期（秒）
        self._stats_cache = None
        self._stats_cache_timestamp = 0
        self._stats_cache_ttl = 60  # 统计数据缓存有效期（秒）
    
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
    
    def _is_cache_valid(self, timestamp: float, ttl: int) -> bool:
        """检查缓存是否有效"""
        return (time.time() - timestamp) < ttl
    
    def get_statistics(self) -> Dict:
        """获取增强的任务统计数据（带缓存）"""
        try:
            # 检查缓存是否有效
            if self._stats_cache is not None and self._is_cache_valid(self._stats_cache_timestamp, self._stats_cache_ttl):
                print("📊 使用缓存的统计数据")
                return self._stats_cache
            
            # 检查配置
            if not self.token or not self.database_id:
                raise Exception("Notion token or database_id not configured")
            
            # 获取所有任务
            all_tasks = self.get_tasks()
            
            # 计算统计数据
            stats = {
                'today': self._calculate_today_stats(all_tasks),
                'week': self._calculate_weekly_stats(all_tasks),
                'health': self._calculate_health_stats(all_tasks),
                'month': self._calculate_monthly_stats(all_tasks),
                'distribution': self._calculate_distribution_stats(all_tasks)
            }
            
            # 更新缓存
            self._stats_cache = stats
            self._stats_cache_timestamp = time.time()
            print(f"📊 统计数据已缓存，共 {len(all_tasks)} 个任务")
            
            return stats
            
        except Exception as e:
            print(f"Error getting statistics: {str(e)}")
            raise
    
    def get_tasks_with_cache(self, status: Optional[str] = None, 
                          assignee: Optional[str] = None,
                          priority: Optional[str] = None,
                          task_type: Optional[str] = None) -> List[Dict]:
        """
        带缓存的获取任务方法
        只有在没有过滤条件时使用缓存
        """
        # 如果有特定过滤条件，则不使用缓存
        if any([status, assignee, priority, task_type]):
            return self.get_tasks(status, assignee, priority, task_type)
        
        # 检查缓存是否有效
        if self._tasks_cache is not None and self._is_cache_valid(self._cache_timestamp, self._cache_ttl):
            print("📊 使用缓存的任务数据")
            return self._tasks_cache
        
        # 获取新数据并更新缓存
        tasks = self.get_tasks()
        self._tasks_cache = tasks
        self._cache_timestamp = time.time()
        print(f"📊 缓存了 {len(tasks)} 个任务")
        return tasks
    
    def clear_cache(self):
        """清除缓存"""
        self._tasks_cache = None
        self._cache_timestamp = 0
        self._stats_cache = None
        self._stats_cache_timestamp = 0
    
    def _calculate_today_stats(self, tasks: List[Dict]) -> Dict:
        """计算今日统计"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        today = datetime.now(beijing_tz).date()
        
        # 统计今日待办（应该在今天处理的任务）
        # 1. 进行中的任务
        # 2. 收集箱中开始日期在今天或之前的任务
        today_tasks = []
        for t in tasks:
            if t['status'] in ['已完成', '已放弃']:
                continue
            
            # 进行中的任务
            if t['status'] == '进行中':
                today_tasks.append(t)
                continue
            
            # 收集箱中的任务，需要检查开始日期
            if t['status'] == '收集箱':
                start_date = t.get('start_date')
                if start_date:
                    try:
                        # 解析开始日期
                        if isinstance(start_date, str):
                            start_date_obj = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                            start_date_date = start_date_obj.date()
                        else:
                            start_date_date = start_date
                        
                        # 如果开始日期在今天或之前，算作今日任务
                        if start_date_date <= today:
                            today_tasks.append(t)
                    except (ValueError, AttributeError):
                        # 如果日期解析失败，不计入今日任务
                        pass
        
        p0_count = len([t for t in today_tasks if t['priority'] == 'P0 重要紧急'])
        p1_count = len([t for t in today_tasks if t['priority'] == 'P1 重要不紧急'])
        p2_count = len([t for t in today_tasks if t['priority'] == 'P2 紧急不重要'])
        p3_count = len([t for t in today_tasks if t['priority'] == 'P3 不重要不紧急'])
        
        # 统计今日完成
        today_completed = len([
            t for t in tasks 
            if t['status'] == '已完成' and self._is_today(t.get('last_edited_time'))
        ])
        
        # 今日目标（可配置，默认12个）
        today_target = 12
        
        # 生成建议
        suggestion = self._generate_today_suggestion(p0_count, p1_count, today_completed, today_target)
        
        return {
            'p0_urgent': p0_count,
            'p1_important': p1_count,
            'p2_normal': p2_count,
            'p3_low': p3_count,
            'completed': today_completed,
            'target': today_target,
            'completion_rate': round((today_completed / today_target) * 100, 1) if today_target > 0 else 0,
            'suggestion': suggestion
        }
    
    def _calculate_weekly_stats(self, tasks: List[Dict]) -> Dict:
        """计算本周统计"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        now = datetime.now(beijing_tz)
        
        # 计算本周一和本周日
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        # 统计本周完成的任务
        week_completed = len([
            t for t in tasks 
            if t['status'] == '已完成' and self._is_in_week(t.get('last_edited_time'), week_start, week_end)
        ])
        
        # 本周目标（可配置，默认20个）
        week_target = 20
        
        # 计算剩余天数
        days_left = 7 - now.weekday()
        
        # 生成每日趋势
        daily_trend = self._calculate_daily_trend(tasks, week_start, week_end)
        
        # 判断是否在正轨
        expected_progress = (now.weekday() + 1) / 7
        actual_progress = week_completed / week_target if week_target > 0 else 0
        on_track = actual_progress >= expected_progress * 0.8
        
        # 生成预测
        prediction = self._generate_week_prediction(week_completed, week_target, days_left, on_track)
        
        return {
            'completed': week_completed,
            'target': week_target,
            'remaining': max(0, week_target - week_completed),
            'days_left': days_left,
            'completion_rate': round((week_completed / week_target) * 100, 1) if week_target > 0 else 0,
            'daily_trend': daily_trend,
            'on_track': on_track,
            'prediction': prediction
        }
    
    def _calculate_health_stats(self, tasks: List[Dict]) -> Dict:
        """计算健康度统计"""
        # 识别风险
        risks = self._identify_risks(tasks)
        
        # 计算流动效率
        flow = self._calculate_flow_efficiency(tasks)
        
        # 计算积压状态
        backlog = self._calculate_backlog_status(tasks)
        
        # 计算综合健康分
        overall_score = self._calculate_health_score(risks, flow, backlog)
        
        # 确定健康等级
        if overall_score >= 80:
            overall_level = 'excellent'
        elif overall_score >= 60:
            overall_level = 'good'
        else:
            overall_level = 'poor'
        
        return {
            'risks': risks,
            'flow': flow,
            'backlog': backlog,
            'overall_score': overall_score,
            'overall_level': overall_level
        }
    
    def _calculate_monthly_stats(self, tasks: List[Dict]) -> Dict:
        """计算月度统计"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        now = datetime.now(beijing_tz)
        
        # 计算本月第一天和最后一天
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 12:
            next_month = month_start.replace(year=now.year + 1, month=1)
        else:
            next_month = month_start.replace(month=now.month + 1)
        month_end = next_month - timedelta(seconds=1)
        
        # 统计本月完成的任务
        month_completed = len([
            t for t in tasks 
            if t['status'] == '已完成' and self._is_in_month(t.get('last_edited_time'), month_start, month_end)
        ])
        
        # 统计本月新增的任务
        month_new = len([
            t for t in tasks 
            if self._is_in_month(t.get('created_time'), month_start, month_end)
        ])
        
        # 月度目标（可配置，默认60个）
        month_target = 60
        
        # 净增长
        net_growth = month_new - month_completed
        
        # 趋势
        if net_growth > 5:
            trend = 'increasing'
        elif net_growth < -5:
            trend = 'decreasing'
        else:
            trend = 'stable'
        
        # 生成亮点和建议
        highlight = self._generate_month_highlight(month_completed, month_target)
        improvement = self._generate_month_improvement(net_growth, trend)
        
        return {
            'completed': month_completed,
            'target': month_target,
            'new_tasks': month_new,
            'net_growth': net_growth,
            'completion_rate': round((month_completed / month_target) * 100, 1) if month_target > 0 else 0,
            'trend': trend,
            'highlight': highlight,
            'improvement': improvement
        }
    
    def _calculate_distribution_stats(self, tasks: List[Dict]) -> Dict:
        """计算详细分布统计（原有逻辑）"""
        stats = {
            'total': len(tasks),
            'by_status': {},
            'by_priority': {},
            'by_type': {},
            'by_assignee': {}
        }
        
        for task in tasks:
            # 按状态统计
            status = task.get('status', 'unknown')
            stats['by_status'][status] = stats['by_status'].get(status, 0) + 1
            
            # 按优先级统计
            priority = task.get('priority', 'P3 不重要不紧急')
            stats['by_priority'][priority] = stats['by_priority'].get(priority, 0) + 1
            
            # 按类型统计
            task_type = task.get('task_type', '未分类')
            stats['by_type'][task_type] = stats['by_type'].get(task_type, 0) + 1
            
            # 按负责人统计
            assignee = task.get('assignee', '未分配')
            stats['by_assignee'][assignee] = stats['by_assignee'].get(assignee, 0) + 1
        
        return stats
    
    def _calculate_flow_efficiency(self, tasks: List[Dict]) -> Dict:
        """计算流动效率"""
        # 统计各状态任务数
        inbox_count = len([t for t in tasks if t['status'] == '收集箱'])
        progress_count = len([t for t in tasks if t['status'] == '进行中'])
        done_count = len([t for t in tasks if t['status'] == '已完成'])
        
        total_active = inbox_count + progress_count + done_count
        
        # 启动效率 = (进行中 + 已完成) / 总活跃任务
        started_tasks = progress_count + done_count
        inbox_to_progress_rate = round((started_tasks / total_active) * 100, 1) if total_active > 0 else 0
        
        # 完成效率 = 已完成 / (进行中 + 已完成)
        progress_to_done_rate = round((done_count / started_tasks) * 100, 1) if started_tasks > 0 else 0
        
        # 识别瓶颈
        bottleneck = None
        if inbox_count > progress_count * 2:
            bottleneck = 'inbox'
        elif progress_count > done_count * 0.5 and progress_count > 10:
            bottleneck = 'progress'
        
        return {
            'inbox_to_progress_rate': inbox_to_progress_rate,
            'progress_to_done_rate': progress_to_done_rate,
            'bottleneck': bottleneck,
            'status_counts': {
                'inbox': inbox_count,
                'in_progress': progress_count,
                'done': done_count
            }
        }
    
    def _identify_risks(self, tasks: List[Dict]) -> List[Dict]:
        """识别风险"""
        risks = []
        
        # 风险1: P0任务过多
        p0_count = len([t for t in tasks if t['priority'] == 'P0 重要紧急' and t['status'] not in ['已完成', '已放弃']])
        if p0_count > 10:
            risks.append({
                'type': 'p0_overload',
                'severity': 'high',
                'message': f'P0任务过多：{p0_count} 个待处理',
                'suggestion': '建议：分解大任务或调整部分任务为P1',
                'count': p0_count
            })
        
        # 风险2: 收集箱堆积
        inbox_count = len([t for t in tasks if t['status'] == '收集箱'])
        if inbox_count > 5:
            risks.append({
                'type': 'inbox_pile',
                'severity': 'medium',
                'message': f'收集箱堆积：{inbox_count} 个任务',
                'suggestion': '建议：花10分钟整理收集箱，将任务分类',
                'count': inbox_count
            })
        
        # 风险3: 今日完成率低
        today_completed = len([t for t in tasks if t['status'] == '已完成' and self._is_today(t.get('last_edited_time'))])
        if today_completed < 3:
            risks.append({
                'type': 'low_completion',
                'severity': 'medium',
                'message': '今日完成率较低',
                'suggestion': '建议：聚焦2-3个核心任务，避免分散精力',
                'count': today_completed
            })
        
        return risks
    
    def _calculate_backlog_status(self, tasks: List[Dict]) -> Dict:
        """计算积压状态"""
        inbox_count = len([t for t in tasks if t['status'] == '收集箱'])
        in_progress_count = len([t for t in tasks if t['status'] == '进行中'])
        
        # 判断状态
        if inbox_count > 10 or in_progress_count > 15:
            status = 'critical'
            recommendation = '严重积压，建议立即清理'
        elif inbox_count > 5 or in_progress_count > 10:
            status = 'warning'
            recommendation = '轻度积压，建议本周清理'
        else:
            status = 'healthy'
            recommendation = '流动正常'
        
        return {
            'inbox_count': inbox_count,
            'in_progress_count': in_progress_count,
            'status': status,
            'recommendation': recommendation
        }
    
    def _calculate_health_score(self, risks: List[Dict], flow: Dict, backlog: Dict) -> int:
        """计算综合健康分"""
        score = 100
        
        # 根据风险扣分
        for risk in risks:
            if risk['severity'] == 'high':
                score -= 15
            elif risk['severity'] == 'medium':
                score -= 10
            else:
                score -= 5
        
        # 根据流动效率加分/扣分
        if flow['progress_to_done_rate'] >= 80:
            score += 10
        elif flow['progress_to_done_rate'] < 50:
            score -= 10
        
        # 根据积压状态扣分
        if backlog['status'] == 'critical':
            score -= 20
        elif backlog['status'] == 'warning':
            score -= 10
        
        return max(0, min(100, score))
    
    def _calculate_daily_trend(self, tasks: List[Dict], week_start: datetime, week_end: datetime) -> List[Dict]:
        """计算每日完成趋势"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        today = datetime.now(beijing_tz).date()
        
        daily_trend = []
        current = week_start
        
        weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        
        for i in range(7):
            day_date = current.date()
            completed_count = len([
                t for t in tasks
                if t['status'] == '已完成' and self._is_on_date(t.get('last_edited_time'), day_date)
            ])
            
            daily_trend.append({
                'date': day_date.isoformat(),
                'day': weekday_names[i],
                'completed': completed_count,
                'is_today': day_date == today
            })
            
            current += timedelta(days=1)
        
        return daily_trend
    
    def _is_today(self, timestamp: str) -> bool:
        """判断时间戳是否是今天"""
        if not timestamp:
            return False
        beijing_tz = pytz.timezone('Asia/Shanghai')
        today = datetime.now(beijing_tz).date()
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            dt = dt.astimezone(beijing_tz).date()
            return dt == today
        except:
            return False
    
    def _is_on_date(self, timestamp: str, target_date) -> bool:
        """判断时间戳是否在指定日期"""
        if not timestamp:
            return False
        beijing_tz = pytz.timezone('Asia/Shanghai')
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            dt = dt.astimezone(beijing_tz).date()
            return dt == target_date
        except:
            return False
    
    def _is_in_week(self, timestamp: str, week_start: datetime, week_end: datetime) -> bool:
        """判断时间戳是否在本周"""
        if not timestamp:
            return False
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            dt = dt.astimezone(week_start.tzinfo)
            return week_start <= dt <= week_end
        except:
            return False
    
    def _is_in_month(self, timestamp: str, month_start: datetime, month_end: datetime) -> bool:
        """判断时间戳是否在本月"""
        if not timestamp:
            return False
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            dt = dt.astimezone(month_start.tzinfo)
            return month_start <= dt <= month_end
        except:
            return False
    
    def _generate_today_suggestion(self, p0: int, p1: int, completed: int, target: int) -> str:
        """生成今日建议"""
        if p0 > 0:
            return f"建议：先完成 {min(p0, 2)} 个 P0 任务，再处理 {min(p1, 3)} 个 P1 任务"
        elif p1 > 0:
            return f"建议：今日聚焦 {min(p1, 5)} 个 P1 重要任务"
        else:
            return "建议：从收集箱中选择任务开始执行"
    
    def _generate_week_prediction(self, completed: int, target: int, days_left: int, on_track: bool) -> str:
        """生成本周预测"""
        if on_track:
            return "按当前速度，可以完成本周目标"
        else:
            needed_per_day = (target - completed) / days_left if days_left > 0 else 0
            return f"需要加速，每天需完成 {round(needed_per_day, 1)} 个任务"
    
    def _generate_month_highlight(self, completed: int, target: int) -> str:
        """生成月度亮点"""
        rate = (completed / target) * 100 if target > 0 else 0
        if rate >= 80:
            return f"本月完成率 {round(rate, 1)}%，表现优秀！"
        elif rate >= 60:
            return f"本月完成率 {round(rate, 1)}%，保持良好"
        else:
            return f"本月完成率 {round(rate, 1)}%，还需努力"
    
    def _generate_month_improvement(self, net_growth: int, trend: str) -> str:
        """生成月度改进建议"""
        if trend == 'increasing':
            return f"任务净增长 {net_growth} 个，建议控制新任务流入"
        elif trend == 'decreasing':
            return "任务在减少，继续保持！"
        else:
            return "任务量稳定，保持当前节奏"
    
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
    
    def auto_transition_tasks(self) -> Dict:
        """
        自动流转任务状态
        将收集箱中已到开始时间的任务自动转为进行中
        
        Returns:
            Dict: 包含流转统计信息
        """
        try:
            print("🔄 开始检查需要自动流转的任务...")
            
            # 获取所有收集箱的任务
            inbox_tasks = self.get_tasks(status='收集箱')
            
            if not inbox_tasks:
                print("📭 收集箱中没有任务")
                return {
                    'success': True,
                    'total_checked': 0,
                    'transitioned': 0,
                    'tasks': []
                }
            
            print(f"📋 收集箱中共有 {len(inbox_tasks)} 个任务")
            
            # 获取当前时间（北京时间）
            beijing_tz = pytz.timezone('Asia/Shanghai')
            now = datetime.now(beijing_tz)
            
            transitioned_tasks = []
            
            # 检查每个任务的开始时间
            for task in inbox_tasks:
                start_date = task.get('start_date')
                
                # 如果没有开始时间，跳过
                if not start_date:
                    continue
                
                # 解析开始时间
                try:
                    # 处理不同的日期格式
                    if 'T' in start_date:
                        # 包含时间的格式：2025-12-08T00:00:00+08:00
                        task_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    else:
                        # 只有日期的格式：2025-12-08
                        task_start = datetime.strptime(start_date, '%Y-%m-%d')
                        task_start = beijing_tz.localize(task_start)
                    
                    # 如果开始时间已到或已过，则转为进行中
                    if task_start <= now:
                        print(f"⏰ 任务 '{task['name']}' 开始时间已到: {start_date}")
                        
                        # 更新任务状态为进行中
                        self.update_task(task['id'], {'status': '进行中'})
                        
                        transitioned_tasks.append({
                            'id': task['id'],
                            'name': task['name'],
                            'start_date': start_date,
                            'priority': task.get('priority', 'P3 不重要不紧急')
                        })
                        
                        print(f"✅ 已将任务 '{task['name']}' 转为进行中")
                    
                except Exception as e:
                    print(f"⚠️  解析任务 '{task['name']}' 的开始时间失败: {str(e)}")
                    continue
            
            result = {
                'success': True,
                'total_checked': len(inbox_tasks),
                'transitioned': len(transitioned_tasks),
                'tasks': transitioned_tasks,
                'timestamp': now.isoformat()
            }
            
            print(f"✅ 状态流转完成: 检查了 {len(inbox_tasks)} 个任务，流转了 {len(transitioned_tasks)} 个任务")
            
            return result
            
        except Exception as e:
            print(f"❌ 自动流转任务失败: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'total_checked': 0,
                'transitioned': 0,
                'tasks': []
            }
