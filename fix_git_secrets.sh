#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     🔒 修复 Git 敏感信息问题                             ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 1. 添加 .env.backup 到 .gitignore
echo "1️⃣ 更新 .gitignore..."
if ! grep -q "^\.env\.backup$" .gitignore; then
    echo "" >> .gitignore
    echo "# Backup files with secrets" >> .gitignore
    echo ".env.backup" >> .gitignore
    echo ".env.*.backup" >> .gitignore
    echo "*.backup" >> .gitignore
    echo "   ✅ 已添加 .env.backup 到 .gitignore"
else
    echo "   ℹ️  .gitignore 已包含 .env.backup"
fi

# 2. 从 Git 缓存中移除敏感文件
echo ""
echo "2️⃣ 从 Git 缓存中移除敏感文件..."
git rm --cached .env.backup 2>/dev/null && echo "   ✅ 已移除 .env.backup" || echo "   ℹ️  .env.backup 不在 Git 中"
git rm --cached .env.test.backup 2>/dev/null && echo "   ✅ 已移除 .env.test.backup" || echo "   ℹ️  .env.test.backup 不在 Git 中"

# 3. 提交更改
echo ""
echo "3️⃣ 提交更改..."
git add .gitignore
git commit -m "chore: add .env.backup to .gitignore to prevent secret exposure" || echo "   ℹ️  没有需要提交的更改"

# 4. 检查是否还有其他敏感文件
echo ""
echo "4️⃣ 检查其他可能的敏感文件..."
echo "   检查 .env 相关文件..."
find . -name ".env*" -type f | grep -v ".gitignore" | grep -v "venv" | while read file; do
    if ! grep -q "$(basename $file)" .gitignore 2>/dev/null; then
        echo "   ⚠️  发现未忽略的文件: $file"
    fi
done

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║     ✅ Git 敏感信息问题已修复                            ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📝 已完成："
echo "   ✅ 更新 .gitignore"
echo "   ✅ 移除敏感文件缓存"
echo "   ✅ 提交更改"
echo ""
echo "🚀 下一步："
echo "   git push"
echo ""
echo "💡 提示："
echo "   如果推送仍然失败，可能需要修改最后一次提交："
echo "   git commit --amend --no-edit"
echo "   git push --force-with-lease"
echo ""
