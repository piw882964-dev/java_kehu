#!/bin/bash

echo "========================================="
echo "   更新代码到 GitHub"
echo "========================================="
echo ""

# 切换到 HTTPS（如果之前用的是 SSH）
git remote set-url origin https://github.com/piw882964-dev/java_kehu.git

echo "步骤 1: 添加所有更改..."
git add -A
echo "✅ 完成"
echo ""

echo "步骤 2: 查看将要提交的更改..."
git status --short
echo ""

read -p "是否继续提交？(y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "步骤 3: 提交更改..."
git commit -m "更新系统: 修改系统名称为'进粉系统'，创建图片目录，添加favicon图标"
echo ""

if [ $? -eq 0 ]; then
    echo "✅ 提交成功"
    echo ""
    echo "步骤 4: 推送到 GitHub..."
    echo ""
    echo "⚠️  提示：系统会要求输入用户名和密码"
    echo "   Username: piw882964-dev"
    echo "   Password: 粘贴你的 Personal Access Token"
    echo ""
    echo "========================================="
    echo ""
    
    git push origin master
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "========================================="
        echo "✅ 更新成功！"
        echo ""
        echo "查看更新："
        echo "https://github.com/piw882964-dev/java_kehu"
        echo "========================================="
    else
        echo ""
        echo "========================================="
        echo "❌ 推送失败"
        echo ""
        echo "如果提示需要 Token，请："
        echo "1. 访问 https://github.com/settings/tokens"
        echo "2. 生成新 Token（勾选 repo 权限）"
        echo "3. 重新执行此脚本"
        echo "========================================="
    fi
else
    echo "❌ 提交失败"
fi

