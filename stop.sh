#!/bin/bash
# 客户管理系统停止脚本

# 设置工作目录
cd "$(dirname "$0")"

# 读取PID文件
if [ -f "application.pid" ]; then
    PID=$(cat application.pid)
    echo "正在停止应用，PID: $PID"
    kill $PID
    
    # 等待进程结束
    sleep 3
    
    # 检查进程是否还在运行
    if ps -p $PID > /dev/null; then
        echo "强制停止应用..."
        kill -9 $PID
    fi
    
    # 删除PID文件
    rm -f application.pid
    echo "应用已停止"
else
    echo "未找到PID文件，尝试查找Java进程..."
    pkill -f "customer-system-1.0.0.jar"
    echo "已尝试停止所有相关进程"
fi

