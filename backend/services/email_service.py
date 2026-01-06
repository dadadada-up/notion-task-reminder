"""
Email Service - 邮件推送服务
支持 HTML 富文本邮件
优化版：使用统一的消息格式化模块
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
import os
import sys
from datetime import datetime
from typing import List, Dict
from pathlib import Path

# 添加 src 目录到路径以导入消息格式化模块
src_path = Path(__file__).parent.parent.parent / 'src'
sys.path.insert(0, str(src_path))

from message_formatter import generate_html_message

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
            
            # 使用统一的消息生成器
            default_title, html_content = generate_html_message(tasks, is_done)
            
            # 使用自定义标题或默认标题
            subject = custom_title if custom_title else default_title
            
            # 如果有自定义消息，添加到内容开头
            if custom_message:
                html_content = f"{custom_message}\n\n{html_content}"
            
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
    
    def send_weekly_summary(self, markdown: str, year: int, week_number: int, 
                           week_start: str, week_end: str) -> Dict:
        """
        发送周记邮件
        
        Args:
            markdown: 周记的Markdown内容
            year: 年份
            week_number: 周数
            week_start: 周开始日期 (MM月DD日)
            week_end: 周结束日期 (MM月DD日)
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
            
            # 生成邮件主题
            subject = f"📝 {year}年第{week_number}周生活总结 ({week_start} - {week_end})"
            
            # 将 Markdown 转换为 HTML
            html_content = self._markdown_to_html(markdown, year, week_number, week_start, week_end)
            
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
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
            
            server.login(self.sender, self.password)
            server.sendmail(self.sender, [self.receiver], message.as_string())
            server.quit()
            
            return {
                'success': True,
                'message': 'Weekly summary email sent successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _markdown_to_html(self, markdown: str, year: int, week_number: int,
                         week_start: str, week_end: str) -> str:
        """将 Markdown 转换为 HTML 邮件格式"""
        
        # 简单的 Markdown 转 HTML（可以后续增强）
        html_body = markdown.replace('\n', '<br>')
        html_body = html_body.replace('# ', '<h1>').replace('\n', '</h1>\n', 1)
        html_body = html_body.replace('## ', '<h2>').replace('<br>', '</h2>', 1)
        html_body = html_body.replace('### ', '<h3>').replace('<br>', '</h3>', 1)
        html_body = html_body.replace('**', '<strong>').replace('**', '</strong>')
        html_body = html_body.replace('- ', '<li>').replace('<br>', '</li><br>')
        
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{year}年第{week_number}周生活总结</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }}
        .header {{
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
            margin-bottom: 30px;
        }}
        .header h1 {{
            color: #1f2937;
            margin: 0 0 10px 0;
        }}
        .header p {{
            color: #6b7280;
            margin: 0;
        }}
        h2 {{
            color: #374151;
            border-left: 4px solid #3b82f6;
            padding-left: 12px;
            margin-top: 30px;
        }}
        h3 {{
            color: #4b5563;
            margin-top: 20px;
        }}
        li {{
            margin: 8px 0;
        }}
        .footer {{
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📝 {year}年第{week_number}周生活总结</h1>
            <p>{week_start} - {week_end}</p>
        </div>
        <div class="content">
            {html_body}
        </div>
        <div class="footer">
            <p><strong>Notion Task Manager</strong></p>
            <p>自动发送于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </div>
</body>
</html>
"""
        return html
    
    def send_email(self, tasks: List[Dict], notification_type: str) -> Dict:
        """
        发送邮件（兼容旧接口）
        
        Args:
            tasks: 任务列表
            notification_type: 通知类型 ('daily_todo' 或 'daily_done')
        """
        is_done = notification_type == 'daily_done'
        return self.send_notification(tasks, is_done)
