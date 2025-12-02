"""
消息格式化模块
统一的消息生成逻辑，供 GitHub Actions 和后端 API 共同使用
"""

from datetime import datetime, timezone
import pytz
from typing import List, Dict, Tuple


def generate_html_message(tasks: List[Dict], is_done: bool = False) -> Tuple[str, str]:
    """
    生成 HTML 格式的消息
    
    Args:
        tasks: 任务列表
        is_done: 是否为已完成任务
        
    Returns:
        (title, html_content): 标题和 HTML 内容
    """
    
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
    
    # 获取当前时间
    beijing_tz = pytz.timezone('Asia/Shanghai')
    now = datetime.now(timezone.utc).astimezone(beijing_tz)
    time_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    # 生成任务卡片
    content_html = ""
    
    for assignee, assignee_tasks in tasks_by_assignee.items():
        task_count = len(assignee_tasks)
        content_html += f'<div class="assignee-section">'
        content_html += f'<div class="assignee-header">{emoji} {assignee} (共{task_count}条)</div>'
        
        # 按优先级排序
        priority_order = {"P0 重要紧急": 0, "P1 重要不紧急": 1, "P2 紧急不重要": 2, "P3 不重要不紧急": 3}
        sorted_tasks = sorted(assignee_tasks, key=lambda t: priority_order.get(t.get('priority', 'P3'), 99))
        
        for task in sorted_tasks:
            task_name = task.get('name', '未命名任务')
            status = task.get('status', '未知')
            priority = task.get('priority', 'P3')
            task_type = task.get('task_type', '未分类')
            
            # 优先级颜色
            priority_colors = {
                "P0 重要紧急": "#ef4444",
                "P1 重要不紧急": "#f59e0b",
                "P2 紧急不重要": "#3b82f6",
                "P3 不重要不紧急": "#6b7280"
            }
            priority_color = priority_colors.get(priority, "#6b7280")
            
            content_html += f'''
            <div class="task-card" style="border-left-color: {priority_color};">
                <div class="task-title">{task_name}</div>
                <div class="task-meta">
                    <span class="task-status">{status}</span>
                    <span class="task-priority" style="color: {priority_color};">{priority}</span>
                    <span class="task-type">{task_type}</span>
                </div>
            </div>
            '''
        
        content_html += '</div>'
    
    # 生成完整的 HTML
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 12px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }}
        .header {{
            background: {header_gradient};
            color: white;
            padding: 24px 16px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            line-height: 1.3;
        }}
        .header p {{
            margin: 8px 0 0 0;
            opacity: 0.95;
            font-size: 13px;
        }}
        .content {{
            padding: 16px;
        }}
        .assignee-section {{
            margin-bottom: 24px;
        }}
        .assignee-header {{
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            padding: 10px 12px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 3px solid {header_gradient.split('(')[1].split(' ')[1]};
        }}
        .task-card {{
            background: #ffffff;
            padding: 12px;
            margin: 8px 0;
            border-radius: 8px;
            border-left: 3px solid #667eea;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }}
        .task-title {{
            font-size: 15px;
            font-weight: 500;
            color: #1f2937;
            margin-bottom: 8px;
            line-height: 1.4;
            word-break: break-word;
        }}
        .task-meta {{
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            font-size: 11px;
        }}
        .task-meta span {{
            padding: 3px 8px;
            border-radius: 12px;
            background: #e5e7eb;
            color: #4b5563;
            white-space: nowrap;
        }}
        .task-status {{
            background: #dbeafe;
            color: #1e40af;
        }}
        .task-priority {{
            font-weight: 600;
        }}
        .task-type {{
            background: #f3e8ff;
            color: #6b21a8;
        }}
        .footer {{
            padding: 16px;
            text-align: center;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 11px;
        }}
        
        /* 移动端优化 */
        @media (max-width: 480px) {{
            body {{
                padding: 8px;
            }}
            .header {{
                padding: 20px 12px;
            }}
            .header h1 {{
                font-size: 18px;
            }}
            .content {{
                padding: 12px;
            }}
            .assignee-header {{
                font-size: 15px;
                padding: 8px 10px;
            }}
            .task-card {{
                padding: 10px;
            }}
            .task-title {{
                font-size: 14px;
            }}
            .task-meta {{
                font-size: 10px;
                gap: 4px;
            }}
            .task-meta span {{
                padding: 2px 6px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{title}</h1>
            <p>{time_str}</p>
        </div>
        <div class="content">
            {content_html if content_html else '<p style="text-align: center; color: #6b7280;">暂无任务</p>'}
        </div>
        <div class="footer">
            Notion Task Manager · 自动提醒
        </div>
    </div>
</body>
</html>
"""
    
    return title, html


def convert_text_to_html_simple(title: str, text_content: str) -> str:
    """
    简单的文本转 HTML（用于兼容旧的纯文本消息）
    
    Args:
        title: 消息标题
        text_content: 纯文本内容
        
    Returns:
        HTML 内容
    """
    
    # 判断消息类型
    is_done = "完成" in title or "✅" in title
    
    if is_done:
        header_gradient = "linear-gradient(135deg, #10b981 0%, #059669 100%)"
        card_border_color = "#10b981"
    else:
        header_gradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        card_border_color = "#667eea"
    
    # 将文本内容转换为 HTML
    lines = text_content.strip().split('\n')
    html_lines = []
    
    for line in lines:
        if not line.strip():
            continue
        
        # 处理不同类型的行
        if line.startswith('📋') or line.startswith('✅'):
            # 标题行 - 跳过，已经在 header 中
            continue
        elif '|' in line and ('共' in line or '条' in line):
            # 负责人和任务数量行
            html_lines.append(f'<div class="assignee-header">{line.strip()}</div>')
        elif line.strip().startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
            # 主任务
            html_lines.append(f'<div class="task-card">{line.strip()}</div>')
        elif line.strip().startswith('└─'):
            # 子任务
            html_lines.append(f'<div class="task-card subtask">{line.strip()}</div>')
        elif line.startswith('消息ID:'):
            # 消息ID - 放在footer
            continue
        else:
            # 其他内容
            html_lines.append(f'<p>{line.strip()}</p>')
    
    # 获取当前时间
    beijing_tz = pytz.timezone('Asia/Shanghai')
    now = datetime.now(timezone.utc).astimezone(beijing_tz)
    time_str = now.strftime('%Y-%m-%d %H:%M:%S')
    
    # 生成完整的 HTML
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
        .assignee-header {{
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 20px 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
        }}
        .task-card {{
            background: #f9fafb;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid {card_border_color};
            transition: transform 0.2s;
        }}
        .task-card.subtask {{
            margin-left: 30px;
            background: #f3f4f6;
            border-left-color: #9ca3af;
        }}
        .footer {{
            padding: 20px;
            text-align: center;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{title}</h1>
            <p>{time_str}</p>
        </div>
        <div class="content">
            {''.join(html_lines)}
        </div>
        <div class="footer">
            Notion Task Manager · 自动提醒
        </div>
    </div>
</body>
</html>
"""
    
    return html
