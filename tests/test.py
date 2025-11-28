#!/usr/bin/env python3
"""
测试脚本 - 验证 Notion 连接和消息格式
使用方法: 
1. 复制 .env.example 为 .env.test
2. 填写你的配置信息
3. 运行: python3 test.py
"""

import os
import sys
from pathlib import Path

# 添加 src 目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# 从 .env.test 加载环境变量
def load_env_file(env_file='.env.test'):
    """加载环境变量文件"""
    env_path = Path(__file__).parent / env_file
    if not env_path.exists():
        print(f"⚠️  环境配置文件不存在: {env_file}")
        print(f"请复制 .env.example 为 {env_file} 并填写配置")
        return False
    
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # 移除引号
                value = value.strip().strip('"').strip("'")
                if value:  # 只设置非空值
                    os.environ[key] = value
    return True

# 加载环境变量
if not load_env_file():
    sys.exit(1)

# 设置测试默认值
os.environ.setdefault('DEBUG_MODE', 'true')
os.environ.setdefault('EMAIL_ENABLED', 'false')

def test_notion_connection():
    """测试 Notion 连接"""
    print("\n" + "="*60)
    print("测试 1: Notion 数据库连接")
    print("="*60)
    
    from main import get_notion_tasks
    
    print("\n正在连接 Notion...")
    print(f"Database ID: {os.environ.get('DATABASE_ID', 'Not set')[:20]}...")
    
    try:
        tasks = get_notion_tasks(is_done=False)
        
        if not tasks:
            print("❌ 未获取到数据")
            return False
        
        results = tasks.get('results', [])
        print(f"\n✅ 连接成功！")
        print(f"📊 获取到 {len(results)} 个任务")
        
        # 显示前3个任务
        if results:
            print("\n前3个任务预览:")
            for i, task in enumerate(results[:3], 1):
                props = task.get('properties', {})
                title = props.get('任务名称', {}).get('title', [])
                name = title[0].get('plain_text', '未命名') if title else '未命名'
                
                status_obj = props.get('状态', {})
                status = status_obj.get('status', {}).get('name', 'unknown') if status_obj else 'unknown'
                
                assignee_obj = props.get('负责人', {})
                assignee = assignee_obj.get('select', {}).get('name', '未分配') if assignee_obj else '未分配'
                
                print(f"  {i}. {name} | {status} | {assignee}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 连接失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_markdown_format():
    """测试 Markdown 格式"""
    print("\n" + "="*60)
    print("测试 2: Markdown 消息格式")
    print("="*60)
    
    from main import get_notion_tasks, format_message_enhanced
    
    print("\n正在获取任务并生成消息...")
    
    try:
        tasks = get_notion_tasks(is_done=False)
        
        if not tasks or not tasks.get('results'):
            print("❌ 未获取到任务数据")
            return False
        
        message = format_message_enhanced(tasks)
        
        if not message:
            print("❌ 消息生成失败")
            return False
        
        print("✅ 消息生成成功！")
        print(f"📏 消息长度: {len(message)} 字符")
        
        # 保存到文件
        output_file = 'test_output_markdown.md'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(message)
        
        print(f"💾 已保存到: {output_file}")
        
        # 显示前500字符
        print("\n" + "-"*60)
        print("消息预览（前500字符）:")
        print("-"*60)
        print(message[:500])
        if len(message) > 500:
            print("\n... (更多内容请查看文件)")
        print("-"*60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ 生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_html_format():
    """测试 HTML 格式"""
    print("\n" + "="*60)
    print("测试 3: HTML 邮件格式")
    print("="*60)
    
    from main import get_notion_tasks, format_html_message
    
    print("\n正在生成 HTML 邮件...")
    
    try:
        tasks = get_notion_tasks(is_done=False)
        
        if not tasks or not tasks.get('results'):
            print("❌ 未获取到任务数据")
            return False
        
        html = format_html_message(tasks)
        
        if not html:
            print("❌ HTML 生成失败")
            return False
        
        print("✅ HTML 生成成功！")
        print(f"📏 HTML 长度: {len(html)} 字符")
        
        # 保存到文件
        output_file = 'test_output_email.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"💾 已保存到: {output_file}")
        print("💡 用浏览器打开查看效果")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("🧪 Notion 任务提醒 - 功能测试")
    print("="*60)
    
    results = {
        'Notion 连接': test_notion_connection(),
        'Markdown 格式': test_markdown_format(),
        'HTML 格式': test_html_format()
    }
    
    # 测试结果汇总
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)
    
    all_passed = True
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")
        if not result:
            all_passed = False
    
    print("\n" + "="*60)
    
    if all_passed:
        print("🎉 所有测试通过！")
        print("\n📁 生成的文件:")
        print("  - test_output_markdown.md (Markdown 格式)")
        print("  - test_output_email.html (HTML 格式，用浏览器打开)")
    else:
        print("⚠️  部分测试失败，请检查错误信息")
    
    print("="*60 + "\n")
    
    return all_passed

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ 测试出错: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
