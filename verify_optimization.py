#!/usr/bin/env python3
"""
验证优化效果脚本
检查新的配置管理系统是否正常工作
"""

import sys
from pathlib import Path

# 添加 backend 目录到路径
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

def test_config_import():
    """测试配置模块导入"""
    print("=" * 60)
    print("1. 测试配置模块导入")
    print("=" * 60)
    
    try:
        from core.config import get_settings, Settings
        print("✅ 成功导入配置模块")
        return True
    except Exception as e:
        print(f"❌ 导入失败: {e}")
        return False

def test_config_loading():
    """测试配置加载"""
    print("\n" + "=" * 60)
    print("2. 测试配置加载")
    print("=" * 60)
    
    try:
        from core.config import get_settings
        
        settings = get_settings()
        print("✅ 成功加载配置")
        
        # 显示配置模块
        print("\n配置模块:")
        print(f"  - Notion: {type(settings.notion).__name__}")
        print(f"  - Push: {type(settings.push).__name__}")
        print(f"  - Email: {type(settings.email).__name__}")
        print(f"  - GitHub: {type(settings.github).__name__}")
        print(f"  - Web: {type(settings.web).__name__}")
        print(f"  - Runtime: {type(settings.runtime).__name__}")
        
        return True
    except Exception as e:
        print(f"❌ 加载失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_config_service():
    """测试配置服务"""
    print("\n" + "=" * 60)
    print("3. 测试配置服务集成")
    print("=" * 60)
    
    try:
        from services.config_service import ConfigService
        
        service = ConfigService()
        print("✅ 成功创建 ConfigService")
        
        # 测试获取配置
        config = service.get_config()
        print("✅ 成功获取配置")
        
        # 显示配置结构
        print("\n配置结构:")
        for key in config.keys():
            print(f"  - {key}")
        
        return True
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_config_features():
    """测试配置功能"""
    print("\n" + "=" * 60)
    print("4. 测试配置功能")
    print("=" * 60)
    
    try:
        from core.config import get_settings
        
        settings = get_settings()
        
        # 测试配置状态检查
        print("\n配置状态:")
        print(f"  - PushPlus 已配置: {settings.push.has_pushplus()}")
        print(f"  - WxPusher 已配置: {settings.push.has_wxpusher()}")
        print(f"  - 邮件已配置: {settings.email.is_configured()}")
        print(f"  - GitHub 已配置: {settings.github.is_configured()}")
        
        # 测试配置转换
        config_dict = settings.to_dict(mask_secrets=True)
        print("\n✅ 成功转换为字典（已脱敏）")
        
        # 显示脱敏后的配置
        if 'notion' in config_dict:
            print(f"\nNotion Token (脱敏): {config_dict['notion']['token']}")
        
        return True
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_file_structure():
    """测试文件结构"""
    print("\n" + "=" * 60)
    print("5. 测试文件结构")
    print("=" * 60)
    
    # 检查新增文件
    files_to_check = [
        'backend/core/__init__.py',
        'backend/core/config.py',
        'tests/run_tests.sh',
        'tests/integration/test_notification.py',
        'tests/integration/test_schedule_api.py',
        'tests/scripts/test_github_actions_mode.sh',
        'OPTIMIZATION_SUMMARY.md'
    ]
    
    all_exist = True
    for file_path in files_to_check:
        full_path = Path(__file__).parent / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} (不存在)")
            all_exist = False
    
    # 检查已移除的文件
    removed_files = [
        'test_notification.py',
        'test_schedule_api.py',
        'test_github_actions_mode.sh',
        'test_new_features.sh',
        'test_notify_fix.sh'
    ]
    
    print("\n已移除的根目录测试文件:")
    for file_path in removed_files:
        full_path = Path(__file__).parent / file_path
        if not full_path.exists():
            print(f"✅ {file_path} (已移除)")
        else:
            print(f"⚠️  {file_path} (仍存在)")
    
    return all_exist

def main():
    """主函数"""
    print("\n" + "╔" + "=" * 58 + "╗")
    print("║" + " " * 58 + "║")
    print("║" + "  🔍 验证项目优化效果".center(58) + "║")
    print("║" + " " * 58 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    results = []
    
    # 运行测试
    results.append(("配置模块导入", test_config_import()))
    results.append(("配置加载", test_config_loading()))
    results.append(("配置服务集成", test_config_service()))
    results.append(("配置功能", test_config_features()))
    results.append(("文件结构", test_file_structure()))
    
    # 显示总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{status} - {name}")
    
    print("\n" + "=" * 60)
    print(f"总计: {passed}/{total} 测试通过")
    print("=" * 60)
    
    if passed == total:
        print("\n🎉 所有测试通过！优化成功！")
        return 0
    else:
        print(f"\n⚠️  有 {total - passed} 个测试失败，请检查")
        return 1

if __name__ == "__main__":
    sys.exit(main())
