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
        # 修改为生成 daily_reminder.yml
        self.workflow_file = Path(__file__).parent.parent.parent / '.github' / 'workflows' / 'daily_reminder.yml'
        
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
        """生成GitHub Actions workflow配置（完善版 daily_reminder.yml 格式）"""
        
        # 生成cron表达式列表（去重）
        cron_expressions = []
        for schedule in schedules:
            cron = self._time_to_cron(schedule['time'])
            if cron not in cron_expressions:
                cron_expressions.append(cron)
        
        # 构建 workflow_dispatch 输入参数
        workflow_dispatch_inputs = {
            'task_type': {
                'description': '任务类型',
                'required': True,
                'default': 'daily_todo',
                'type': 'choice',
                'options': ['daily_todo', 'daily_done']
            },
            'action_type': {
                'description': '操作类型',
                'required': True,
                'default': 'combined',
                'type': 'choice',
                'options': ['send', 'combined']
            },
            'force_send': {
                'description': '强制发送（忽略时间检查）',
                'required': False,
                'default': 'false',
                'type': 'choice',
                'options': ['true', 'false']
            },
            'custom_send_time': {
                'description': '自定义发送时间（格式：HH:MM，如 08:00）',
                'required': False,
                'default': '',
                'type': 'string'
            },
            'debug_mode': {
                'description': '调试模式（显示更多日志）',
                'required': False,
                'default': 'false',
                'type': 'choice',
                'options': ['true', 'false']
            }
        }
        
        # 基础workflow结构
        workflow = {
            'name': 'Daily Task Reminder',
            'on': {
                'schedule': [{'cron': cron} for cron in cron_expressions],
                'workflow_dispatch': {
                    'inputs': workflow_dispatch_inputs
                }
            },
            'jobs': {
                'send-reminder': {
                    'runs-on': 'ubuntu-latest',
                    'steps': []
                }
            }
        }
        
        # 添加 checkout 步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'uses': 'actions/checkout@v4'
        })
        
        # 添加 Python 设置步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'name': 'Set up Python',
            'uses': 'actions/setup-python@v5',
            'with': {
                'python-version': '3.9'
            }
        })
        
        # 添加依赖安装步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'name': 'Install dependencies',
            'run': 'python -m pip install --upgrade pip\npip install -r requirements.txt'
        })
        
        # 添加时间判断步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'name': 'Determine action type',
            'id': 'action-type',
            'run': self._generate_time_determination_script(schedules)
        })
        
        # 添加执行脚本步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'name': 'Run reminder script',
            'id': 'reminder',
            'env': {
                'NOTION_TOKEN': '${{ secrets.NOTION_TOKEN }}',
                'DATABASE_ID': '${{ secrets.DATABASE_ID }}',
                'PUSHPLUS_TOKEN': '${{ secrets.PUSHPLUS_TOKEN }}',
                'WXPUSHER_TOKEN': '${{ secrets.WXPUSHER_TOKEN }}',
                'WXPUSHER_UID': '${{ secrets.WXPUSHER_UID }}',
                'EMAIL_ENABLED': '${{ secrets.EMAIL_ENABLED }}',
                'EMAIL_SMTP_SERVER': '${{ secrets.EMAIL_SMTP_SERVER }}',
                'EMAIL_SMTP_PORT': '${{ secrets.EMAIL_SMTP_PORT }}',
                'EMAIL_SENDER': '${{ secrets.EMAIL_SENDER }}',
                'EMAIL_PASSWORD': '${{ secrets.EMAIL_PASSWORD }}',
                'EMAIL_RECEIVER': '${{ secrets.EMAIL_RECEIVER }}',
                'REMINDER_TYPE': '${{ steps.action-type.outputs.task_type }}',
                'ACTION_TYPE': '${{ steps.action-type.outputs.action_type }}',
                'SEND_TIME': '${{ steps.action-type.outputs.send_time }}',
                'FORCE_SEND': "${{ github.event_name == 'workflow_dispatch' && github.event.inputs.force_send == 'true' }}",
                'DEBUG_MODE': "${{ github.event_name == 'workflow_dispatch' && github.event.inputs.debug_mode == 'true' }}"
            },
            'run': self._generate_execution_script()
        })
        
        # 添加获取当前时间步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'name': 'Get current time',
            'id': 'current-time',
            'run': "echo \"time=$(TZ='Asia/Shanghai' date '+%Y-%m-%d %H:%M:%S')\" >> $GITHUB_OUTPUT"
        })
        
        # 添加执行记录步骤
        workflow['jobs']['send-reminder']['steps'].append({
            'name': 'Create execution record',
            'uses': 'peter-evans/commit-comment@v3',
            'with': {
                'token': '${{ secrets.GITHUB_TOKEN }}',
                'body': "${{ steps.action-type.outputs.emoji }} ${{ steps.action-type.outputs.task_type == 'daily_todo' && '今日待办任务' || '今日已完成任务' }}${{ steps.action-type.outputs.action_type == 'prepare' && '准备' || '发送' }}\n\n执行时间: ${{ steps.action-type.outputs.send_time }}\n任务类型: ${{ steps.action-type.outputs.task_type }}\n操作类型: ${{ steps.action-type.outputs.action_type }}\n${{ steps.action-type.outputs.action_type == 'prepare' && format('任务数量: {0}', steps.reminder.outputs.task_count) || '' }}\n\n运行时间: ${{ steps.current-time.outputs.time }}"
            }
        })
        
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
    
    def _generate_time_determination_script(self, schedules: List[Dict]) -> str:
        """生成时间判断脚本"""
        # 按时间分组任务
        time_groups = {}
        for schedule in schedules:
            time = schedule['time']
            if time not in time_groups:
                time_groups[time] = []
            time_groups[time].append(schedule)
        
        script_lines = [
            '# 获取当前 UTC 时间',
            'hour_utc=$(date -u +%H)',
            'minute_utc=$(date -u +%M)',
            '',
            'echo "当前 UTC 时间: ${hour_utc}:${minute_utc}"',
            '',
            '# 默认使用 combined 操作类型（合并准备和发送）',
            'action_type="combined"',
            '',
            '# 判断是手动触发还是定时触发',
            'if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then',
            '  echo "手动触发工作流"',
            '  ',
            '  # 使用用户输入的参数',
            '  task_type="${{ github.event.inputs.task_type }}"',
            '  action_type="${{ github.event.inputs.action_type }}"',
            '  ',
            '  # 检查是否有自定义发送时间',
            '  custom_time="${{ github.event.inputs.custom_send_time }}"',
            '  ',
            '  # 根据任务类型设置发送时间',
            '  if [ -n "$custom_time" ]; then',
            '    # 使用自定义时间',
            '    send_time="$custom_time"',
            '    echo "使用自定义发送时间: $send_time"',
        ]
        
        # 添加默认时间逻辑
        for time, tasks in time_groups.items():
            task_type = tasks[0]['type']
            script_lines.append(f'  elif [ "$task_type" == "{task_type}" ]; then')
            script_lines.append(f'    send_time="{time}"')
        
        script_lines.extend([
            '  else',
            '    send_time="08:00"',
            '  fi',
            '  ',
            '  # 设置表情',
            '  if [ "$task_type" == "daily_todo" ]; then',
            '    emoji="📋"',
            '  else',
            '    emoji="✅"',
            '  fi',
            '  ',
            '  echo "task_type=${task_type}" >> $GITHUB_OUTPUT',
            '  echo "action_type=${action_type}" >> $GITHUB_OUTPUT',
            '  echo "send_time=${send_time}" >> $GITHUB_OUTPUT',
            '  echo "emoji=${emoji}" >> $GITHUB_OUTPUT',
            '  ',
            '  exit 0',
            'fi',
            '',
            '# 定时触发的情况，根据当前时间判断任务类型'
        ])
        
        # 为每个时间段生成判断逻辑
        for time, tasks in time_groups.items():
            hour, minute = map(int, time.split(':'))
            utc_hour = (hour - 8) % 24
            
            # 设置时间窗口（前后10分钟）
            start_hour = utc_hour
            start_minute = max(0, minute - 10)
            end_hour = utc_hour
            end_minute = min(59, minute + 10)
            
            # 处理跨小时的情况
            if start_minute > minute:
                start_hour = (start_hour - 1) % 24
            if end_minute < minute:
                end_hour = (end_hour + 1) % 24
            
            task_type = tasks[0]['type']
            emoji = '📋' if task_type == 'daily_todo' else '✅'
            
            script_lines.extend([
                f'# UTC {start_hour:02d}:{start_minute:02d}-{end_hour:02d}:{end_minute:02d} (北京时间约 {time})',
                f'if ([ "$hour_utc" == "{start_hour}" ] && [ "$minute_utc" -ge "{start_minute}" ]) || ([ "$hour_utc" == "{end_hour}" ] && [ "$minute_utc" -lt "{end_minute}" ]); then',
                f'  echo "task_type={task_type}" >> $GITHUB_OUTPUT',
                f'  echo "action_type=${{action_type}}" >> $GITHUB_OUTPUT',
                f'  echo "send_time={time}" >> $GITHUB_OUTPUT',
                f'  echo "emoji={emoji}" >> $GITHUB_OUTPUT',
                f'  echo "发送 {time} 的{task_type}任务"',
                f'  exit 0',
                'fi',
                ''
            ])
        
        script_lines.extend([
            '# 如果不是预期的执行时间，返回未知状态',
            'echo "task_type=unknown" >> $GITHUB_OUTPUT',
            'echo "action_type=unknown" >> $GITHUB_OUTPUT',
            'echo "send_time=unknown" >> $GITHUB_OUTPUT',
            'echo "emoji=❓" >> $GITHUB_OUTPUT',
            'echo "无效的执行时间: ${hour_utc}:${minute_utc}"'
        ])
        
        return '\n'.join(script_lines)
    
    def _generate_execution_script(self) -> str:
        """生成执行脚本"""
        script_lines = [
            'echo "=== 环境变量检查 ==="',
            'echo "Python 版本:"',
            'python --version',
            'echo "当前时间 (UTC):"',
            'date -u',
            'echo "当前时间 (北京):"',
            "TZ='Asia/Shanghai' date",
            'echo "REMINDER_TYPE: $REMINDER_TYPE"',
            'echo "ACTION_TYPE: $ACTION_TYPE"',
            'echo "SEND_TIME: $SEND_TIME"',
            'echo "PUSHPLUS_TOKEN 长度: ${#PUSHPLUS_TOKEN}"',
            'echo "PUSHPLUS_TOKEN 前8位: ${PUSHPLUS_TOKEN:0:8}***"',
            'echo "FORCE_SEND: $FORCE_SEND"',
            'echo "DEBUG_MODE: $DEBUG_MODE"',
            '',
            '# 如果是调试模式，显示更多信息',
            'if [ "$DEBUG_MODE" == "true" ]; then',
            '  echo "=== 调试信息 ==="',
            '  echo "工作目录: $(pwd)"',
            '  echo "目录内容:"',
            '  ls -la',
            '  echo "数据目录内容:"',
            '  ls -la ./data || echo "数据目录不存在"',
            '  echo "Python 环境:"',
            '  pip list',
            '  echo "=== 调试信息结束 ==="',
            'fi',
            '',
            'echo "=== 开始执行脚本 ==="',
            '',
            '# 创建数据目录',
            'mkdir -p ./data',
            '',
            'python -u src/main.py',
            'echo "=== 脚本执行完成 ==="'
        ]
        
        return '\n'.join(script_lines)
