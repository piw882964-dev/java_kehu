#!/bin/bash
# 客户管理系统 - 打包JAR脚本

# 设置工作目录
cd "$(dirname "$0")"

echo "=========================================="
echo "正在打包客户管理系统..."
echo "=========================================="

# 清理并打包
mvn clean package -DskipTests

# 检查打包是否成功
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ 打包成功！"
    echo "JAR文件位置: target/customer-system-1.0.0.jar"
    echo "=========================================="
    
    # 显示JAR文件信息
    if [ -f "target/customer-system-1.0.0.jar" ]; then
        JAR_SIZE=$(du -h target/customer-system-1.0.0.jar | cut -f1)
        echo "JAR文件大小: $JAR_SIZE"
    fi
else
    echo ""
    echo "=========================================="
    echo "✗ 打包失败，请检查错误信息"
    echo "=========================================="
    exit 1
fi

