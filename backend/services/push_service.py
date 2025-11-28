"""
Push Service - 优化的 PushPlus 推送服务
支持增强的 HTML 样式
"""

import requests
import os
from datetime import datetime
from typing import List, Dict
import random

class PushService:
    def __init__(self):
        self.token = os.environ.get('PUSHPLUS_TOKEN', '')
        self.api_url = "http://www.pushplus.plus/send"
    
    def send_notification(self, tasks: List[Dict], is_done: bool = False) -> Dict:
        """发送推送通知"""
        try:
            if not self.token or len(self.token.strip()) < 8:
                return {
                    'success': False,
                    'error': 'PushPlus token not configured'
                }
            
            # 生成消息
            title, html_content = self._generate_html_message(tasks, is_done)
            
            # 添加唯一标识避免重复
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            random_str = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8))
            unique_suffix = f"\n\n<!-- {timestamp}-{random_str} -->"
            
            data = {
                "token": self.token,
                "title": f"{title} [{random_str[:4]}]",
                "content": html_content + unique_suffix,
                "template": "html"
            }
            
            response = requests.post(self.api_url, json=data, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("code") == 200:
                    return {
                        'success': True,
                        'message': 'PushPlus notification sent successfully',
                        'data': result.get('data')
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('msg', 'Unknown error')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_html_message(self, tasks: List[Dict], is_done: bool) -> tuple:
        """生成增强的 HTML 消息"""
        
        # 按负责人分组
        tasks_by_assignee = {}
        for task in tasks:
            assignee = task.get('assignee', '未分配')
            if assignee not in tasks_by_assignee:
                tasks_by_assignee[assignee] = []
            tasks_by_assignee[assignee].append(task)
        
        if is_done:
            title = "✅ 今日完成任务"
            header_gradient = "linear-gradient(135deg, #10b981 0%, #059669 100%)"
            emoji = "✅"
        else:
            title = "📋 今日待办任务"
            header_gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            emoji = "📋"
        
        # 生成 HTML
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: {header_gradient};
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .header p {{
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }}
        .content {{
            padding: 20px;
        }}
        .assignee-section {{
            margin-bottom: 30px;
        }}
        .assignee-header {{
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }}
        .task-card {{
            background: #f9fafb;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            transition: transform 0.2s;
        }}
        .task-card:hover {{
            transform: translateX(5px);
        }}
        .task-card.priority-p0 {{
            border-left-color: #ef4444;
            background: #fef2f2;
        }}
        .task-card.priority-p1 {{
            border-left-color: #f59e0b;
            background: #fffbeb;
        }}
        .task-card.priority-p2 {{
            border-left-color: #8b5cf6;
            background: #faf5ff;
        }}
        .task-card.priority-p3 {{
            border-left-color: #6b7280;
            background: #f9fafb;
        }}
        .task-title {{
            font-size: 16px;
            font-weight: 500;
            color: #111827;
            margin-bottom: 8px;
        }}
        .task-meta {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }}
        .badge-status {{
            background: #dbeafe;
            color: #1e40af;
        }}
        .badge-status.doing {{
            background: #dbeafe;
            color: #1e40af;
        }}
        .badge-status.inbox {{
            background: #f3f4f6;
            color: #4b5563;
        }}
        .badge-status.done {{
            background: #d1fae5;
            color: #065f46;
        }}
        .badge-type {{
            background: #d1fae5;
            color: #065f46;
        }}
        .badge-priority {{
            background: #fee2e2;
            color: #991b1b;
        }}
        .badge-priority.p0 {{
            background: #fee2e2;
            color: #991b1b;
        }}
        .badge-priority.p1 {{
            background: #fef3c7;
            color: #92400e;
        }}
        .badge-priority.p2 {{
            background: #ede9fe;
            color: #5b21b6;
        }}
        .badge-priority.p3 {{
            background: #f3f4f6;
            color: #4b5563;
        }}
        .stats {{
            background: #f0f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }}
        .stats h3 {{
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #1e40af;
        }}
        .stats p {{
            margin: 5px 0;
            font-size: 14px;
            color: #1f2937;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
        }}
        .empty-state {{
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }}
        .empty-state svg {{
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{emoji} {title}</h1>
            <p>{datetime.now().strftime('%Y年%m月%d日 %A')}</p>
        </div>
        <div class="content">
"""
        
        if not tasks:
            html += """
            <div class="empty-state">
                <p style="font-size: 18px;">🎉 暂无任务</p>
                <p>好好休息一下吧！</p>
            </div>
"""
        else:
            # 按负责人生成任务卡片
            for assignee, assignee_tasks in tasks_by_assignee.items():
                html += f"""
            <div class="assignee-section">
                <div class="assignee-header">
                    👤 {assignee} <span style="color: #6b7280; font-size: 14px; font-weight: 400;">(共 {len(assignee_tasks)} 条)</span>
                </div>
"""
                
                # 排序任务
                priority_order = {'P0 重要紧急': 0, 'P1 重要不紧急': 1, 'P2 紧急不重要': 2, 'P3 不重要不紧急': 3}
                assignee_tasks.sort(key=lambda x: priority_order.get(x.get('priority', 'P3'), 999))
                
                for idx, task in enumerate(assignee_tasks, 1):
                    priority = task.get('priority', 'P3 不重要不紧急')
                    priority_key = priority.split()[0].lower() if ' ' in priority else 'p3'
                    
                    status = task.get('status', 'unknown')
                    task_type = task.get('task_type', '未分类')
                    
                    html += f"""
                <div class="task-card priority-{priority_key}">
                    <div class="task-title">{idx}. {task.get('name', '未命名任务')}</div>
                    <div class="task-meta">
                        <span class="badge badge-status {status}">{status}</span>
                        <span class="badge badge-type">{task_type}</span>
                        <span class="badge badge-priority {priority_key}">{priority.split()[0]}</span>
                    </div>
                </div>
"""
                
                html += """
            </div>
"""
            
            # 添加统计信息
            if is_done:
                total_tasks = len(tasks)
                task_types = {}
                priorities = {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0}
                
                for task in tasks:
                    task_type = task.get('task_type', '未分类')
                    task_types[task_type] = task_types.get(task_type, 0) + 1
                    
                    priority = task.get('priority', 'P3')
                    priority_key = priority.split()[0] if ' ' in priority else priority
                    priorities[priority_key] = priorities.get(priority_key, 0) + 1
                
                html += f"""
            <div class="stats">
                <h3>📊 今日统计</h3>
                <p>✅ 完成任务：{total_tasks} 条</p>
                <p>🎯 优先级分布：P0({priorities['P0']}) P1({priorities['P1']}) P2({priorities['P2']}) P3({priorities['P3']})</p>
"""
                
                if task_types:
                    type_list = ' | '.join([f"{k}({v})" for k, v in sorted(task_types.items(), key=lambda x: x[1], reverse=True)])
                    html += f"""
                <p>📁 任务类型：{type_list}</p>
"""
                
                html += """
            </div>
"""
        
        html += f"""
        </div>
        <div class="footer">
            <p>Notion Task Manager · {datetime.now().strftime('%H:%M')}</p>
        </div>
    </div>
</body>
</html>
"""
        
        return title, html
