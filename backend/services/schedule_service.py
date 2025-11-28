"""
Schedule Service - 定时任务配置管理服务
负责保存、读取定时任务配置，并自动更新GitHub Actions workflow
"""

import json
import os
from pathlib import Path
from typing import List, Dict
import yaml

class ScheduleService:
    def __init__(self):
        self.config_file = Path(__file__).parent.parent.parent / 'config' / 'schedule.json'
        self.workflow_file = Path(__file__).parent.parent.parent / '.github' / 'workflows' / 'schedule.yml'
        
        # 确保配置目录存在
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
    
    def get_schedules(self) -> List[Dict]:
        """获取定时任务配置"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # 返回默认配置
                return self._get_default_schedules()
        except Exception as e:
            print(f"读取配置失败: {e}")
            return self._get_default_schedules()
    
    def save_schedules(self, schedules: List[Dict]) -> Dict:
        """保存定时任务配置"""
        try:
            # 保存到JSON文件
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(schedules, f, ensure_ascii=False, indent=2)
            
            # 更新GitHub Actions workflow
            self._update_github_workflow(schedules)
            
            return {
                'success': True,
                'message': '定时任务配置已保存',
                'schedules': schedules
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _get_default_schedules(self) -> List[Dict]:
        """获取默认配置"""
        return [
            {
                'id': '1',
                'type': 'daily_todo',
                'time': '09:00',
                'enabled': True,
                'customMessage': '早上好！今天的任务已为您准备好 💪'
            },
            {
                'id': '2',
                'type': 'daily_done',
                'time': '21:00',
                'enabled': True,
                'customMessage': '晚上好！今天辛苦了，看看完成了多少任务 ✨'
            }
        ]
    
    def _update_github_workflow(self, schedules: List[Dict]):
        """更新GitHub Actions workflow文件"""
        try:
            # 只处理启用的定时任务
            enabled_schedules = [s for s in schedules if s.get('enabled', True)]
            
            if not enabled_schedules:
                print("没有启用的定时任务，跳过workflow更新")
                return
            
            # 生成workflow内容
            workflow = self._generate_workflow(enabled_schedules)
            
            # 确保.github/workflows目录存在
            self.workflow_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 保存workflow文件
            with open(self.workflow_file, 'w', encoding='utf-8') as f:
                yaml.dump(workflow, f, allow_unicode=True, sort_keys=False)
            
            print(f"✅ GitHub Actions workflow已更新: {self.workflow_file}")
            
        except Exception as e:
            print(f"更新GitHub Actions workflow失败: {e}")
            raise
    
    def _generate_workflow(self, schedules: List[Dict]) -> Dict:
        """生成GitHub Actions workflow配置"""
        
        # 生成cron表达式列表
        cron_expressions = []
        for schedule in schedules:
            cron = self._time_to_cron(schedule['time'])
            if cron not in cron_expressions:
                cron_expressions.append(cron)
        
        # 基础workflow结构
        workflow = {
            'name': 'Notion Task Reminder Schedule',
            'on': {
                'schedule': [{'cron': cron} for cron in cron_expressions],
                'workflow_dispatch': {}  # 允许手动触发
            },
            'jobs': {}
        }
        
        # 为每个定时任务创建job
        for schedule in schedules:
            job_id = f"notify_{schedule['type']}_{schedule['id']}"
            
            workflow['jobs'][job_id] = {
                'runs-on': 'ubuntu-latest',
                'steps': [
                    {
                        'name': 'Checkout code',
                        'uses': 'actions/checkout@v3'
                    },
                    {
                        'name': 'Set up Python',
                        'uses': 'actions/setup-python@v4',
                        'with': {
                            'python-version': '3.9'
                        }
                    },
                    {
                        'name': 'Install dependencies',
                        'run': 'pip install -r requirements.txt'
                    },
                    {
                        'name': f"Send {schedule['type']} notification",
                        'env': {
                            'NOTION_TOKEN': '${{ secrets.NOTION_TOKEN }}',
                            'DATABASE_ID': '${{ secrets.DATABASE_ID }}',
                            'PUSHPLUS_TOKEN': '${{ secrets.PUSHPLUS_TOKEN }}',
                            'EMAIL_ENABLED': '${{ secrets.EMAIL_ENABLED }}',
                            'EMAIL_SMTP_SERVER': '${{ secrets.EMAIL_SMTP_SERVER }}',
                            'EMAIL_SMTP_PORT': '${{ secrets.EMAIL_SMTP_PORT }}',
                            'EMAIL_SENDER': '${{ secrets.EMAIL_SENDER }}',
                            'EMAIL_PASSWORD': '${{ secrets.EMAIL_PASSWORD }}',
                            'EMAIL_RECEIVER': '${{ secrets.EMAIL_RECEIVER }}'
                        },
                        'run': f"python src/main.py --type {schedule['type']}"
                    }
                ]
            }
            
            # 添加时间条件（只在指定时间运行）
            schedule_time = schedule['time']
            hour, minute = schedule_time.split(':')
            
            # 添加条件：只在指定时间运行
            workflow['jobs'][job_id]['if'] = (
                f"github.event.schedule == '{self._time_to_cron(schedule_time)}' || "
                f"github.event_name == 'workflow_dispatch'"
            )
        
        return workflow
    
    def _time_to_cron(self, time_str: str) -> str:
        """
        将时间字符串转换为cron表达式
        例如: "09:00" -> "0 9 * * *"
        注意: GitHub Actions使用UTC时间，需要转换
        """
        hour, minute = map(int, time_str.split(':'))
        
        # 转换为UTC时间（假设输入是北京时间 UTC+8）
        utc_hour = (hour - 8) % 24
        
        # cron格式: 分 时 日 月 星期
        return f"{minute} {utc_hour} * * *"
    
    def _cron_to_time(self, cron: str) -> str:
        """
        将cron表达式转换回时间字符串
        例如: "0 1 * * *" -> "09:00" (UTC+8)
        """
        parts = cron.split()
        minute = int(parts[0])
        hour = int(parts[1])
        
        # 转换回北京时间
        beijing_hour = (hour + 8) % 24
        
        return f"{beijing_hour:02d}:{minute:02d}"
