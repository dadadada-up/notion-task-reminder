"""
Email Service - 邮件推送服务
支持 HTML 富文本邮件
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import os
from datetime import datetime
from typing import List, Dict

class EmailService:
    def __init__(self):
        self.enabled = os.environ.get('EMAIL_ENABLED', 'false').lower() == 'true'
        self.smtp_server = os.environ.get('EMAIL_SMTP_SERVER', 'smtp.163.com')
        self.smtp_port = int(os.environ.get('EMAIL_SMTP_PORT', '465'))
        self.sender = os.environ.get('EMAIL_SENDER', '')
        self.password = os.environ.get('EMAIL_PASSWORD', '')
        self.receiver = os.environ.get('EMAIL_RECEIVER', '')
    
    def send_notification(self, tasks: List[Dict], is_done: bool = False,
                         custom_title: str = '', custom_message: str = '') -> Dict:
        """
        发送邮件通知
        
        Args:
            tasks: 任务列表
            is_done: 是否为已完成任务
            custom_title: 自定义标题
            custom_message: 自定义消息（HTML格式）
        """
        try:
            if not self.enabled:
                return {
                    'success': False,
                    'error': 'Email service not enabled'
                }
            
            if not all([self.sender, self.password, self.receiver]):
                return {
                    'success': False,
                    'error': 'Email configuration incomplete'
                }
            
            # 生成邮件内容
            default_subject, html_content = self._generate_email_content(tasks, is_done)
            
            # 使用自定义标题或默认标题
            subject = custom_title if custom_title else default_subject
            
            # 如果有自定义消息，添加到内容中
            if custom_message:
                # 在 greeting 后插入自定义消息
                custom_html = f'<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 8px;">{custom_message}</div>'
                html_content = html_content.replace('<div class="greeting">', f'<div class="greeting">\n{custom_html}\n', 1)
            
            # 创建邮件
            message = MIMEMultipart('alternative')
            message['From'] = Header(f"Notion Task Manager <{self.sender}>")
            message['To'] = Header(self.receiver)
            message['Subject'] = Header(subject, 'utf-8')
            
            # 添加 HTML 内容
            html_part = MIMEText(html_content, 'html', 'utf-8')
            message.attach(html_part)
            
            # 发送邮件
            if self.smtp_port == 465:
                # SSL
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                # TLS
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            
            server.login(self.sender, self.password)
            server.sendmail(self.sender, [self.receiver], message.as_string())
            server.quit()
            
            return {
                'success': True,
                'message': 'Email sent successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_email_content(self, tasks: List[Dict], is_done: bool) -> tuple:
        """生成邮件内容"""
        
        today = datetime.now().strftime('%Y-%m-%d')
        weekday = datetime.now().strftime('%A')
        weekday_cn = {
            'Monday': '星期一',
            'Tuesday': '星期二',
            'Wednesday': '星期三',
            'Thursday': '星期四',
            'Friday': '星期五',
            'Saturday': '星期六',
            'Sunday': '星期日'
        }.get(weekday, weekday)
        
        if is_done:
            subject = f"✅ 今日完成任务总结 - {today}"
            title = "今日完成任务"
            emoji = "✅"
            color_primary = "#10b981"
            color_gradient = "linear-gradient(135deg, #10b981 0%, #059669 100%)"
        else:
            subject = f"📋 今日待办任务提醒 - {today}"
            title = "今日待办任务"
            emoji = "📋"
            color_primary = "#667eea"
            color_gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        
        # 按负责人分组
        tasks_by_assignee = {}
        for task in tasks:
            assignee = task.get('assignee', '未分配')
            if assignee not in tasks_by_assignee:
                tasks_by_assignee[assignee] = []
            tasks_by_assignee[assignee].append(task)
        
        # 生成 HTML
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            background-color: #f3f4f6;
        }}
        .email-container {{
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }}
        .header {{
            background: {color_gradient};
            color: white;
            padding: 28px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 22px;
            font-weight: 600;
            letter-spacing: -0.3px;
            line-height: 1.3;
        }}
        .header .date {{
            margin: 10px 0 0 0;
            font-size: 14px;
            opacity: 0.95;
        }}
        .content {{
            padding: 20px;
        }}
        .greeting {{
            font-size: 16px;
            color: #1f2937;
            margin-bottom: 20px;
            line-height: 1.6;
        }}
        .assignee-section {{
            margin-bottom: 28px;
        }}
        .assignee-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 12px;
            border-left: 3px solid {color_primary};
        }}
        .assignee-name {{
            font-size: 16px;
            font-weight: 600;
            color: #111827;
        }}
        .assignee-count {{
            font-size: 12px;
            color: #6b7280;
            background: white;
            padding: 3px 10px;
            border-radius: 12px;
        }}
        .task-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .task-item {{
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-left: 3px solid {color_primary};
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }}
        .task-item.priority-p0 {{
            border-left-color: #ef4444;
            background: #fef2f2;
        }}
        .task-item.priority-p1 {{
            border-left-color: #f59e0b;
            background: #fffbeb;
        }}
        .task-item.priority-p2 {{
            border-left-color: #8b5cf6;
            background: #faf5ff;
        }}
        .task-item.priority-p3 {{
            border-left-color: #6b7280;
            background: #f9fafb;
        }}
        .task-number {{
            display: inline-block;
            width: 20px;
            height: 20px;
            line-height: 20px;
            text-align: center;
            background: {color_primary};
            color: white;
            border-radius: 50%;
            font-size: 11px;
            font-weight: 600;
            margin-right: 8px;
            vertical-align: middle;
        }}
        .task-name {{
            font-size: 15px;
            font-weight: 500;
            color: #111827;
            margin-bottom: 8px;
            line-height: 1.4;
            word-break: break-word;
        }}
        .task-tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }}
        .tag {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
        }}
        .tag-status {{
            background: #dbeafe;
            color: #1e40af;
        }}
        .tag-type {{
            background: #d1fae5;
            color: #065f46;
        }}
        .tag-priority {{
            background: #fee2e2;
            color: #991b1b;
        }}
        .stats-box {{
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 10px;
            padding: 18px;
            margin-top: 24px;
        }}
        .stats-title {{
            font-size: 16px;
            font-weight: 600;
            color: #0c4a6e;
            margin: 0 0 12px 0;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }}
        .stat-item {{
            background: white;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
        }}
        .stat-value {{
            font-size: 20px;
            font-weight: 700;
            color: {color_primary};
            margin-bottom: 3px;
        }}
        .stat-label {{
            font-size: 12px;
            color: #6b7280;
        }}
        .footer {{
            background: #f9fafb;
            padding: 18px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }}
        .footer p {{
            margin: 4px 0;
            font-size: 12px;
            color: #6b7280;
        }}
        .footer a {{
            color: {color_primary};
            text-decoration: none;
        }}
        .empty-state {{
            text-align: center;
            padding: 50px 20px;
        }}
        .empty-state-icon {{
            font-size: 56px;
            margin-bottom: 16px;
        }}
        .empty-state-text {{
            font-size: 16px;
            color: #6b7280;
        }}
        
        /* 移动端优化 */
        @media (max-width: 480px) {{
            .email-container {{
                margin: 10px;
                border-radius: 10px;
            }}
            .header {{
                padding: 20px 16px;
            }}
            .header h1 {{
                font-size: 18px;
            }}
            .header .date {{
                font-size: 12px;
            }}
            .content {{
                padding: 16px;
            }}
            .greeting {{
                font-size: 14px;
                margin-bottom: 16px;
            }}
            .assignee-section {{
                margin-bottom: 20px;
            }}
            .assignee-header {{
                padding: 8px 12px;
            }}
            .assignee-name {{
                font-size: 15px;
            }}
            .assignee-count {{
                font-size: 11px;
                padding: 2px 8px;
            }}
            .task-item {{
                padding: 10px;
                margin-bottom: 8px;
            }}
            .task-number {{
                width: 18px;
                height: 18px;
                line-height: 18px;
                font-size: 10px;
                margin-right: 6px;
            }}
            .task-name {{
                font-size: 14px;
            }}
            .task-tags {{
                gap: 4px;
                margin-top: 6px;
            }}
            .tag {{
                padding: 2px 8px;
                font-size: 10px;
            }}
            .stats-box {{
                padding: 14px;
                margin-top: 18px;
            }}
            .stats-title {{
                font-size: 14px;
                margin-bottom: 10px;
            }}
            .stats-grid {{
                gap: 8px;
            }}
            .stat-item {{
                padding: 8px;
            }}
            .stat-value {{
                font-size: 18px;
            }}
            .stat-label {{
                font-size: 11px;
            }}
            .footer {{
                padding: 14px;
            }}
            .footer p {{
                font-size: 11px;
            }}
            .empty-state {{
                padding: 40px 16px;
            }}
            .empty-state-icon {{
                font-size: 48px;
            }}
            .empty-state-text {{
                font-size: 14px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>{emoji} {title}</h1>
            <p class="date">{today} {weekday_cn}</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                {'🎉 今天又是充实的一天！' if is_done else '☀️ 美好的一天，从完成任务开始！'}
            </div>
"""
        
        if not tasks:
            html += """
            <div class="empty-state">
                <div class="empty-state-icon">🎊</div>
                <p class="empty-state-text">暂无任务，好好休息一下吧！</p>
            </div>
"""
        else:
            # 生成任务列表
            for assignee, assignee_tasks in tasks_by_assignee.items():
                html += f"""
            <div class="assignee-section">
                <div class="assignee-header">
                    <span class="assignee-name">👤 {assignee}</span>
                    <span class="assignee-count">共 {len(assignee_tasks)} 条</span>
                </div>
                <ul class="task-list">
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
                    <li class="task-item priority-{priority_key}">
                        <div class="task-name">
                            <span class="task-number">{idx}</span>
                            {task.get('name', '未命名任务')}
                        </div>
                        <div class="task-tags">
                            <span class="tag tag-status">{status}</span>
                            <span class="tag tag-type">{task_type}</span>
                            <span class="tag tag-priority">{priority.split()[0]}</span>
                        </div>
                    </li>
"""
                
                html += """
                </ul>
            </div>
"""
            
            # 添加统计信息
            if is_done:
                total_tasks = len(tasks)
                priorities = {'P0': 0, 'P1': 0, 'P2': 0, 'P3': 0}
                task_types = {}
                
                for task in tasks:
                    priority = task.get('priority', 'P3')
                    priority_key = priority.split()[0] if ' ' in priority else priority
                    priorities[priority_key] = priorities.get(priority_key, 0) + 1
                    
                    task_type = task.get('task_type', '未分类')
                    task_types[task_type] = task_types.get(task_type, 0) + 1
                
                important_count = priorities['P0'] + priorities['P1']
                urgent_count = priorities['P0'] + priorities['P2']
                
                html += f"""
            <div class="stats-box">
                <h3 class="stats-title">📊 今日统计</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">{total_tasks}</div>
                        <div class="stat-label">完成任务</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{important_count}</div>
                        <div class="stat-label">重要任务</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{urgent_count}</div>
                        <div class="stat-label">紧急任务</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{len(task_types)}</div>
                        <div class="stat-label">任务类型</div>
                    </div>
                </div>
            </div>
"""
        
        html += f"""
        </div>
        
        <div class="footer">
            <p><strong>Notion Task Manager</strong></p>
            <p>自动发送于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>
"""
        
        return subject, html
