"""
GitHub API 服务
用于动态更新 GitHub Actions workflow 文件
"""

import os
import requests
import base64
from typing import Dict, List, Optional


class GitHubService:
    def __init__(self):
        self.token = os.getenv('GITHUB_TOKEN')
        self.repo = os.getenv('GITHUB_REPOSITORY')  # 格式: owner/repo
        self.base_url = 'https://api.github.com'
        self.headers = {
            'Authorization': f'token {self.token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    
    def update_workflow(self, schedules: List[Dict]) -> bool:
        """
        更新 workflow 文件
        
        Args:
            schedules: 定时任务配置列表
            
        Returns:
            bool: 更新是否成功
        """
        if not self.token or not self.repo:
            print("警告: GitHub Token 或 Repository 未配置，跳过 workflow 更新")
            return False
        
        try:
            # 1. 生成新的 workflow 内容
            workflow_content = self._generate_workflow_yaml(schedules)
            
            # 2. 获取当前文件的 SHA (用于更新)
            file_path = '.github/workflows/daily_reminder.yml'
            sha = self._get_file_sha(file_path)
            
            # 3. 更新文件
            url = f'{self.base_url}/repos/{self.repo}/contents/{file_path}'
            
            data = {
                'message': f'Update workflow schedules: {len(schedules)} tasks configured',
                'content': base64.b64encode(workflow_content.encode()).decode(),
                'sha': sha,
                'branch': 'main'
            }
            
            response = requests.put(url, headers=self.headers, json=data)
            
            if response.status_code == 200:
                print(f"✅ GitHub Actions workflow 更新成功")
                return True
            else:
                print(f"❌ GitHub Actions workflow 更新失败: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 更新 GitHub Actions workflow 时出错: {str(e)}")
            return False
    
    def _generate_workflow_yaml(self, schedules: List[Dict]) -> str:
        """
        根据配置生成 workflow YAML
        
        Args:
            schedules: 定时任务配置列表
            
        Returns:
            str: YAML 内容
        """
        # 生成 cron 表达式
        cron_expressions = []
        for schedule in schedules:
            if schedule.get('enabled', False):
                cron = self._time_to_cron(schedule['time'])
                cron_expressions.append(f"    - cron: '{cron}'  # {schedule['type']} at {schedule['time']} Beijing Time")
        
        # 如果没有启用的任务，添加一个永不触发的 cron
        if not cron_expressions:
            cron_expressions.append("    - cron: '0 0 31 2 *'  # Never (Feb 31st)")
        
        # 生成完整的 YAML
        yaml_content = f"""name: Daily Task Reminder

on:
  schedule:
{chr(10).join(cron_expressions)}
  workflow_dispatch:
    inputs:
      task_type:
        description: 'Task type to send'
        required: true
        default: 'daily_todo'
        type: choice
        options:
          - daily_todo
          - daily_done
      force_send:
        description: 'Force send regardless of time'
        required: false
        default: 'false'
        type: boolean
      debug_mode:
        description: 'Enable debug mode'
        required: false
        default: 'false'
        type: boolean

jobs:
  send-reminder:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.9'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Run reminder script
        env:
          NOTION_TOKEN: ${{{{ secrets.NOTION_TOKEN }}}}
          DATABASE_ID: ${{{{ secrets.DATABASE_ID }}}}
          PUSHPLUS_TOKEN: ${{{{ secrets.PUSHPLUS_TOKEN }}}}
          WXPUSHER_TOKEN: ${{{{ secrets.WXPUSHER_TOKEN }}}}
          WXPUSHER_UID: ${{{{ secrets.WXPUSHER_UID }}}}
          EMAIL_ENABLED: ${{{{ secrets.EMAIL_ENABLED }}}}
          EMAIL_SMTP_SERVER: ${{{{ secrets.EMAIL_SMTP_SERVER }}}}
          EMAIL_SMTP_PORT: ${{{{ secrets.EMAIL_SMTP_PORT }}}}
          EMAIL_SENDER: ${{{{ secrets.EMAIL_SENDER }}}}
          EMAIL_PASSWORD: ${{{{ secrets.EMAIL_PASSWORD }}}}
          EMAIL_RECEIVER: ${{{{ secrets.EMAIL_RECEIVER }}}}
          FORCE_SEND: ${{{{ github.event_name == 'workflow_dispatch' && github.event.inputs.force_send == 'true' }}}}
          DEBUG_MODE: ${{{{ github.event_name == 'workflow_dispatch' && github.event.inputs.debug_mode == 'true' }}}}
          MANUAL_TASK_TYPE: ${{{{ github.event.inputs.task_type }}}}
        run: |
          echo "=== 开始执行任务提醒脚本 ==="
          echo "当前时间 (UTC): $(date -u)"
          echo "当前时间 (Beijing): $(TZ='Asia/Shanghai' date)"
          
          mkdir -p ./data
          python -u src/main.py
          
          echo "=== 脚本执行完成 ==="
      
      - name: Get current time
        id: current-time
        run: echo "time=$(TZ='Asia/Shanghai' date '+%Y-%m-%d %H:%M:%S')" >> $GITHUB_OUTPUT
      
      - name: Create execution record
        if: always()
        uses: peter-evans/commit-comment@v3
        with:
          token: ${{{{ secrets.GITHUB_TOKEN }}}}
          body: |
            🤖 **任务提醒执行记录**
            
            ⏰ 执行时间: ${{{{ steps.current-time.outputs.time }}}}
            📋 触发方式: ${{{{ github.event_name == 'workflow_dispatch' && '手动触发' || '定时触发' }}}}
            ✅ 执行状态: ${{{{ job.status }}}}
"""
        
        return yaml_content
    
    def _time_to_cron(self, time_str: str) -> str:
        """
        将北京时间转换为 UTC cron 表达式
        
        Args:
            time_str: 时间字符串，格式 "HH:MM"，例如 "09:00"
            
        Returns:
            str: cron 表达式，例如 "0 1 * * *"
        """
        hour, minute = time_str.split(':')
        hour = int(hour)
        minute = int(minute)
        
        # 北京时间转 UTC 时间 (UTC = Beijing - 8)
        utc_hour = (hour - 8) % 24
        
        return f"{minute} {utc_hour} * * *"
    
    def _get_file_sha(self, file_path: str) -> str:
        """
        获取文件的 SHA (用于更新文件)
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: 文件的 SHA
        """
        url = f'{self.base_url}/repos/{self.repo}/contents/{file_path}'
        response = requests.get(url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()['sha']
        else:
            raise Exception(f"Failed to get file SHA: {response.text}")
