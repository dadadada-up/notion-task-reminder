"""
Habit Service - 封装习惯打卡相关的 Notion API 交互逻辑
"""

import requests
from datetime import datetime, timezone, timedelta
import os
import pytz
from typing import List, Dict, Optional

class HabitService:
    def __init__(self):
        self.token = os.environ.get('NOTION_TOKEN')
        self.habits_db_id = "2caed4b7-aaea-809a-9044-ec31020e6b3e"
        self.daily_logs_db_id = "2caed4b7-aaea-8090-952f-f1a72166a90c"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }
        self.base_url = "https://api.notion.com/v1"
    
    # ==================== 习惯管理 ====================
    
    def get_habits(self, status: Optional[str] = None) -> List[Dict]:
        """
        获取习惯列表
        Args:
            status: '生效' 或 '失效'，默认返回所有
        """
        try:
            url = f"{self.base_url}/databases/{self.habits_db_id}/query"
            
            payload = {}
            if status:
                payload["filter"] = {
                    "property": "生效状态",
                    "select": {"equals": status}
                }
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            data = response.json()
            results = data.get('results', [])
            
            habits = []
            for result in results:
                habit = self._format_habit(result)
                habits.append(habit)
            
            print(f"✅ 获取到 {len(habits)} 个习惯")
            return habits
            
        except Exception as e:
            print(f"❌ 获取习惯列表失败: {str(e)}")
            raise
    
    def get_habit_by_id(self, habit_id: str) -> Optional[Dict]:
        """获取单个习惯详情"""
        try:
            url = f"{self.base_url}/pages/{habit_id}"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 404:
                return None
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            return self._format_habit(result)
            
        except Exception as e:
            print(f"❌ 获取习惯 {habit_id} 失败: {str(e)}")
            raise
    
    def create_habit(self, habit_data: Dict) -> Dict:
        """创建新习惯"""
        try:
            url = f"{self.base_url}/pages"
            
            properties = {
                '名称': {
                    "title": [{"text": {"content": habit_data.get('name', '未命名习惯')}}]
                }
            }
            
            if 'frequency' in habit_data:
                properties['频率'] = {
                    "select": {"name": habit_data['frequency']}
                }
            
            if 'status' in habit_data:
                properties['生效状态'] = {
                    "select": {"name": habit_data['status']}
                }
            
            if 'weekly_target' in habit_data:
                properties['每周目标'] = {
                    "number": habit_data['weekly_target']
                }
            
            if 'monthly_target' in habit_data:
                properties['每月目标'] = {
                    "number": habit_data['monthly_target']
                }
            
            if 'start_date' in habit_data and habit_data['start_date']:
                properties['开始日期'] = {
                    "date": {"start": habit_data['start_date']}
                }
            
            if 'phase' in habit_data:
                properties['阶段/周期'] = {
                    "select": {"name": habit_data['phase']}
                }
            
            if 'notes' in habit_data and habit_data['notes']:
                properties['备注'] = {
                    "rich_text": [{"text": {"content": habit_data['notes']}}]
                }
            
            payload = {
                "parent": {"database_id": self.habits_db_id},
                "properties": properties
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            print(f"✅ 创建习惯成功: {habit_data.get('name')}")
            return self._format_habit(result)
            
        except Exception as e:
            print(f"❌ 创建习惯失败: {str(e)}")
            raise
    
    def update_habit(self, habit_id: str, updates: Dict) -> Dict:
        """更新习惯"""
        try:
            url = f"{self.base_url}/pages/{habit_id}"
            
            properties = {}
            
            if 'name' in updates:
                properties['名称'] = {
                    "title": [{"text": {"content": updates['name']}}]
                }
            
            if 'frequency' in updates:
                properties['频率'] = {
                    "select": {"name": updates['frequency']}
                }
            
            if 'status' in updates:
                properties['生效状态'] = {
                    "select": {"name": updates['status']}
                }
            
            if 'weekly_target' in updates:
                properties['每周目标'] = {
                    "number": updates['weekly_target']
                }
            
            if 'monthly_target' in updates:
                properties['每月目标'] = {
                    "number": updates['monthly_target']
                }
            
            if 'start_date' in updates:
                if updates['start_date']:
                    properties['开始日期'] = {
                        "date": {"start": updates['start_date']}
                    }
                else:
                    properties['开始日期'] = {"date": None}
            
            if 'end_date' in updates:
                if updates['end_date']:
                    properties['结束日期'] = {
                        "date": {"start": updates['end_date']}
                    }
                else:
                    properties['结束日期'] = {"date": None}
            
            if 'phase' in updates:
                properties['阶段/周期'] = {
                    "select": {"name": updates['phase']}
                }
            
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
            print(f"✅ 更新习惯成功: {habit_id}")
            return self._format_habit(result)
            
        except Exception as e:
            print(f"❌ 更新习惯失败: {str(e)}")
            raise
    
    # ==================== 打卡记录管理 ====================
    
    def get_daily_logs(self, 
                       habit_id: Optional[str] = None,
                       start_date: Optional[str] = None,
                       end_date: Optional[str] = None,
                       completed: Optional[bool] = None) -> List[Dict]:
        """
        获取打卡记录
        Args:
            habit_id: 习惯ID
            start_date: 开始日期 YYYY-MM-DD
            end_date: 结束日期 YYYY-MM-DD
            completed: 是否完成
        """
        try:
            url = f"{self.base_url}/databases/{self.daily_logs_db_id}/query"
            
            filters = []
            
            if habit_id:
                filters.append({
                    "property": "Habit",
                    "relation": {"contains": habit_id}
                })
            
            if start_date:
                filters.append({
                    "property": "Date",
                    "date": {"on_or_after": start_date}
                })
            
            if end_date:
                filters.append({
                    "property": "Date",
                    "date": {"on_or_before": end_date}
                })
            
            if completed is not None:
                filters.append({
                    "property": "Completed",
                    "checkbox": {"equals": completed}
                })
            
            payload = {}
            if filters:
                if len(filters) == 1:
                    payload["filter"] = filters[0]
                else:
                    payload["filter"] = {"and": filters}
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            data = response.json()
            results = data.get('results', [])
            
            logs = []
            for result in results:
                log = self._format_daily_log(result)
                logs.append(log)
            
            print(f"✅ 获取到 {len(logs)} 条打卡记录")
            return logs
            
        except Exception as e:
            print(f"❌ 获取打卡记录失败: {str(e)}")
            raise
    
    def create_daily_log(self, log_data: Dict) -> Dict:
        """
        创建打卡记录
        Args:
            log_data: {
                'habit_id': str,
                'date': str (YYYY-MM-DD),
                'completed': bool,
                'notes': str (optional)
            }
        """
        try:
            url = f"{self.base_url}/pages"
            
            properties = {
                'Daily Logs': {
                    "title": [{"text": {"content": log_data.get('date', datetime.now().strftime('%Y-%m-%d'))}}]
                },
                'Date': {
                    "date": {"start": log_data.get('date', datetime.now().strftime('%Y-%m-%d'))}
                },
                'Habit': {
                    "relation": [{"id": log_data['habit_id']}]
                },
                'Completed': {
                    "checkbox": log_data.get('completed', False)
                }
            }
            
            if 'notes' in log_data and log_data['notes']:
                properties['Notes'] = {
                    "rich_text": [{"text": {"content": log_data['notes']}}]
                }
            
            payload = {
                "parent": {"database_id": self.daily_logs_db_id},
                "properties": properties
            }
            
            response = requests.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            print(f"✅ 创建打卡记录成功")
            return self._format_daily_log(result)
            
        except Exception as e:
            print(f"❌ 创建打卡记录失败: {str(e)}")
            raise
    
    def update_daily_log(self, log_id: str, updates: Dict) -> Dict:
        """更新打卡记录"""
        try:
            url = f"{self.base_url}/pages/{log_id}"
            
            properties = {}
            
            if 'completed' in updates:
                properties['Completed'] = {
                    "checkbox": updates['completed']
                }
            
            if 'notes' in updates:
                if updates['notes']:
                    properties['Notes'] = {
                        "rich_text": [{"text": {"content": updates['notes']}}]
                    }
                else:
                    properties['Notes'] = {"rich_text": []}
            
            if 'date' in updates:
                properties['Date'] = {
                    "date": {"start": updates['date']}
                }
            
            payload = {"properties": properties}
            
            response = requests.patch(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Notion API error: {response.text}")
            
            result = response.json()
            print(f"✅ 更新打卡记录成功")
            return self._format_daily_log(result)
            
        except Exception as e:
            print(f"❌ 更新打卡记录失败: {str(e)}")
            raise
    
    # ==================== 统计分析 ====================
    
    def get_statistics(self) -> Dict:
        """获取习惯统计数据"""
        try:
            beijing_tz = pytz.timezone('Asia/Shanghai')
            now = datetime.now(beijing_tz)
            today = now.date()
            
            # 获取所有生效的习惯
            habits = self.get_habits(status='生效')
            
            # 获取本月打卡记录
            month_start = today.replace(day=1).strftime('%Y-%m-%d')
            month_end = today.strftime('%Y-%m-%d')
            logs = self.get_daily_logs(start_date=month_start, end_date=month_end)
            
            # 获取今日打卡记录
            today_str = today.strftime('%Y-%m-%d')
            today_logs = self.get_daily_logs(start_date=today_str, end_date=today_str)
            
            return {
                'today': self._calculate_today_stats(habits, today_logs),
                'week': self._calculate_week_stats(habits, logs),
                'month': self._calculate_month_stats(habits, logs),
                'habits': self._calculate_habit_details(habits, logs)
            }
            
        except Exception as e:
            print(f"❌ 获取统计数据失败: {str(e)}")
            raise
    
    def _calculate_today_stats(self, habits: List[Dict], today_logs: List[Dict]) -> Dict:
        """计算今日统计"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        today = datetime.now(beijing_tz).date()
        weekday = today.weekday()  # 0=周一, 6=周日
        
        # 筛选今日应该打卡的习惯
        today_habits = []
        for habit in habits:
            frequency = habit.get('frequency', '每日')
            if frequency == '每日':
                today_habits.append(habit)
            elif frequency == '工作日' and weekday < 5:
                today_habits.append(habit)
            elif frequency == '周末' and weekday >= 5:
                today_habits.append(habit)
            # 每周、每月、不定期的习惯不计入今日
        
        total = len(today_habits)
        completed = len([log for log in today_logs if log.get('completed')])
        remaining = max(0, total - completed)
        
        return {
            'total': total,
            'completed': completed,
            'remaining': remaining,
            'completion_rate': round((completed / total) * 100, 1) if total > 0 else 0
        }
    
    def _calculate_week_stats(self, habits: List[Dict], logs: List[Dict]) -> Dict:
        """计算本周统计"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        now = datetime.now(beijing_tz)
        
        # 计算本周一和本周日
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        # 筛选本周的打卡记录
        week_logs = [
            log for log in logs
            if log.get('date') and self._is_in_week(log['date'], week_start, week_end)
        ]
        
        completed = len([log for log in week_logs if log.get('completed')])
        
        # 计算本周目标（所有习惯的每周目标之和）
        target = sum([h.get('weekly_target', 0) for h in habits if h.get('weekly_target')])
        if target == 0:
            # 如果没有设置每周目标，按每日习惯 * 7 天估算
            daily_habits = len([h for h in habits if h.get('frequency') == '每日'])
            target = daily_habits * 7
        
        # 计算最长连续天数
        longest_streak = self._calculate_longest_streak(logs)
        
        return {
            'completed': completed,
            'target': target,
            'remaining': max(0, target - completed),
            'completion_rate': round((completed / target) * 100, 1) if target > 0 else 0,
            'longest_streak': longest_streak
        }
    
    def _calculate_month_stats(self, habits: List[Dict], logs: List[Dict]) -> Dict:
        """计算本月统计"""
        completed = len([log for log in logs if log.get('completed')])
        
        # 计算本月目标
        target = sum([h.get('monthly_target', 0) for h in habits if h.get('monthly_target')])
        if target == 0:
            # 如果没有设置月度目标，按每日习惯 * 30 天估算
            daily_habits = len([h for h in habits if h.get('frequency') == '每日'])
            target = daily_habits * 30
        
        return {
            'completed': completed,
            'target': target,
            'completion_rate': round((completed / target) * 100, 1) if target > 0 else 0
        }
    
    def _calculate_habit_details(self, habits: List[Dict], logs: List[Dict]) -> List[Dict]:
        """计算每个习惯的详细统计"""
        details = []
        
        for habit in habits:
            habit_id = habit['id']
            habit_logs = [log for log in logs if habit_id in log.get('habit_ids', [])]
            completed_logs = [log for log in habit_logs if log.get('completed')]
            
            # 计算连续天数
            current_streak = self._calculate_current_streak(habit_id, logs)
            
            details.append({
                'habit_id': habit_id,
                'habit_name': habit['name'],
                'frequency': habit.get('frequency', '每日'),
                'monthly_completed': habit.get('monthly_completed', 0),
                'monthly_target': habit.get('monthly_target', 0),
                'completion_rate': round((habit.get('monthly_completed', 0) / habit.get('monthly_target', 1)) * 100, 1) if habit.get('monthly_target', 0) > 0 else 0,
                'current_streak': current_streak,
                'total_completed': habit.get('total_completed', 0)
            })
        
        # 按完成率排序
        details.sort(key=lambda x: x['completion_rate'], reverse=True)
        
        return details
    
    def _calculate_longest_streak(self, logs: List[Dict]) -> int:
        """计算最长连续打卡天数"""
        if not logs:
            return 0
        
        # 按日期排序
        sorted_logs = sorted(logs, key=lambda x: x.get('date', ''))
        
        # 按日期分组，统计每天的完成情况
        daily_completion = {}
        for log in sorted_logs:
            date = log.get('date')
            if date and log.get('completed'):
                if date not in daily_completion:
                    daily_completion[date] = 0
                daily_completion[date] += 1
        
        # 计算连续天数
        max_streak = 0
        current_streak = 0
        prev_date = None
        
        for date in sorted(daily_completion.keys()):
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            
            if prev_date is None:
                current_streak = 1
            elif (date_obj - prev_date).days == 1:
                current_streak += 1
            else:
                max_streak = max(max_streak, current_streak)
                current_streak = 1
            
            prev_date = date_obj
        
        max_streak = max(max_streak, current_streak)
        return max_streak
    
    def _calculate_current_streak(self, habit_id: str, logs: List[Dict]) -> int:
        """计算当前连续打卡天数"""
        beijing_tz = pytz.timezone('Asia/Shanghai')
        today = datetime.now(beijing_tz).date()
        
        # 筛选该习惯的已完成打卡记录
        habit_logs = [
            log for log in logs
            if habit_id in log.get('habit_ids', []) and log.get('completed')
        ]
        
        if not habit_logs:
            return 0
        
        # 按日期倒序排序
        sorted_logs = sorted(habit_logs, key=lambda x: x.get('date', ''), reverse=True)
        
        streak = 0
        check_date = today
        
        for log in sorted_logs:
            log_date = datetime.strptime(log.get('date', ''), '%Y-%m-%d').date()
            
            if log_date == check_date:
                streak += 1
                check_date -= timedelta(days=1)
            elif log_date < check_date:
                break
        
        return streak
    
    # ==================== 辅助方法 ====================
    
    def _format_habit(self, result: Dict) -> Dict:
        """格式化习惯数据"""
        if not result:
            return None
        
        properties = result.get('properties', {})
        
        # 获取名称
        title = properties.get('名称', {}).get('title', [])
        name = title[0].get('plain_text', '未命名习惯') if title else '未命名习惯'
        
        # 获取频率
        frequency_obj = properties.get('频率', {})
        frequency = frequency_obj.get('select', {}).get('name', '每日') if frequency_obj.get('select') else '每日'
        
        # 获取生效状态
        status_obj = properties.get('生效状态', {})
        status = status_obj.get('select', {}).get('name', '生效') if status_obj.get('select') else '生效'
        
        # 获取目标
        weekly_target = properties.get('每周目标', {}).get('number')
        monthly_target = properties.get('每月目标', {}).get('number')
        
        # 获取日期
        start_date_obj = properties.get('开始日期', {})
        start_date = start_date_obj.get('date', {}).get('start') if start_date_obj.get('date') else None
        
        end_date_obj = properties.get('结束日期', {})
        end_date = end_date_obj.get('date', {}).get('start') if end_date_obj.get('date') else None
        
        # 获取阶段
        phase_obj = properties.get('阶段/周期', {})
        phase = phase_obj.get('select', {}).get('name') if phase_obj.get('select') else None
        
        # 获取备注
        notes_obj = properties.get('备注', {})
        notes = None
        if notes_obj and notes_obj.get('rich_text'):
            notes_list = notes_obj.get('rich_text', [])
            if notes_list:
                notes = ''.join([text.get('plain_text', '') for text in notes_list])
        
        # 获取关联的打卡记录
        daily_logs_obj = properties.get('Daily Logs', {})
        daily_logs = daily_logs_obj.get('relation', []) if daily_logs_obj.get('relation') else []
        daily_log_ids = [log.get('id') for log in daily_logs if log.get('id')]
        
        # 获取公式计算的统计数据
        monthly_completed_obj = properties.get('本月完成次数', {})
        monthly_completed = monthly_completed_obj.get('formula', {}).get('number', 0) if monthly_completed_obj.get('formula') else 0
        
        monthly_rate_obj = properties.get('本月打卡率', {})
        monthly_rate = monthly_rate_obj.get('formula', {}).get('string', '0%') if monthly_rate_obj.get('formula') else '0%'
        
        total_completed_obj = properties.get('总打卡次数', {})
        total_completed = total_completed_obj.get('formula', {}).get('number', 0) if total_completed_obj.get('formula') else 0
        
        return {
            'id': result.get('id'),
            'name': name,
            'frequency': frequency,
            'status': status,
            'weekly_target': weekly_target,
            'monthly_target': monthly_target,
            'start_date': start_date,
            'end_date': end_date,
            'phase': phase,
            'notes': notes,
            'daily_log_ids': daily_log_ids,
            'monthly_completed': monthly_completed,
            'monthly_rate': monthly_rate,
            'total_completed': total_completed,
            'created_time': result.get('created_time'),
            'last_edited_time': result.get('last_edited_time'),
            'url': result.get('url')
        }
    
    def _format_daily_log(self, result: Dict) -> Dict:
        """格式化打卡记录数据"""
        if not result:
            return None
        
        properties = result.get('properties', {})
        
        # 获取标题
        title = properties.get('Daily Logs', {}).get('title', [])
        title_text = title[0].get('plain_text', '') if title else ''
        
        # 获取日期
        date_obj = properties.get('Date', {})
        date = date_obj.get('date', {}).get('start') if date_obj.get('date') else None
        
        # 获取关联的习惯
        habit_obj = properties.get('Habit', {})
        habits = habit_obj.get('relation', []) if habit_obj.get('relation') else []
        habit_ids = [h.get('id') for h in habits if h.get('id')]
        
        # 获取完成状态
        completed = properties.get('Completed', {}).get('checkbox', False)
        
        # 获取备注
        notes_obj = properties.get('Notes', {})
        notes = None
        if notes_obj and notes_obj.get('rich_text'):
            notes_list = notes_obj.get('rich_text', [])
            if notes_list:
                notes = ''.join([text.get('plain_text', '') for text in notes_list])
        
        # 获取公式字段
        weekday_obj = properties.get('星期', {})
        weekday = weekday_obj.get('formula', {}).get('string', '') if weekday_obj.get('formula') else ''
        
        month_obj = properties.get('月份', {})
        month = month_obj.get('formula', {}).get('string', '') if month_obj.get('formula') else ''
        
        return {
            'id': result.get('id'),
            'title': title_text,
            'date': date,
            'habit_ids': habit_ids,
            'completed': completed,
            'notes': notes,
            'weekday': weekday,
            'month': month,
            'created_time': result.get('created_time'),
            'last_edited_time': result.get('last_edited_time'),
            'url': result.get('url')
        }
    
    def _is_in_week(self, date_str: str, week_start: datetime, week_end: datetime) -> bool:
        """判断日期是否在本周"""
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
            date = date.replace(tzinfo=week_start.tzinfo)
            return week_start <= date <= week_end
        except:
            return False
