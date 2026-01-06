#!/bin/bash
# 客户管理系统重启脚本

# 设置工作目录
cd "$(dirname "$0")"

echo "正在重启应用..."

# 停止应用
./stop.sh

# 等待2秒
sleep 2

# 启动应用
./start.sh

echo "应用重启完成"

