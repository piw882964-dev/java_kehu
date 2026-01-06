#!/bin/bash
# 500错误快速排查脚本

echo "=========================================="
echo "  500错误快速排查"
echo "=========================================="
echo ""

echo "【1. 系统资源检查】"
echo "----------------------------------------"
echo "内存使用情况："
free -h
echo ""
echo "磁盘空间："
df -h | head -2
echo ""

echo "【2. Java进程检查】"
echo "----------------------------------------"
JAVA_PROCESS=$(ps aux | grep java | grep -v grep)
if [ -z "$JAVA_PROCESS" ]; then
    echo "❌ Java进程未运行！"
else
    echo "✅ Java进程运行中："
    echo "$JAVA_PROCESS" | head -1
    echo ""
    echo "JVM内存参数："
    echo "$JAVA_PROCESS" | grep -oE "-Xmx[0-9]+[mg]" || echo "未找到内存参数"
fi
echo ""

echo "【3. 最新错误日志（最后50行）】"
echo "----------------------------------------"
cd /www/wwwroot/customer-system/ 2>/dev/null || cd "$(dirname "$0")"

if [ -f "logs/application.log" ]; then
    echo "从 logs/application.log 读取："
    tail -n 50 logs/application.log | grep -i "error\|exception" | tail -n 20
elif [ -f "nohup.out" ]; then
    echo "从 nohup.out 读取："
    tail -n 50 nohup.out | grep -i "error\|exception" | tail -n 20
else
    echo "⚠️  未找到日志文件（logs/application.log 或 nohup.out）"
fi
echo ""

echo "【4. 完整异常堆栈（最后100行）】"
echo "----------------------------------------"
if [ -f "logs/application.log" ]; then
    tail -n 100 logs/application.log | grep -B 2 -A 30 "Exception\|Error" | tail -n 50
elif [ -f "nohup.out" ]; then
    tail -n 100 nohup.out | grep -B 2 -A 30 "Exception\|Error" | tail -n 50
fi
echo ""

echo "【5. Nginx错误日志】"
echo "----------------------------------------"
if [ -f "/www/wwwlogs/nginx_error.log" ]; then
    echo "最近的错误（最后20行）："
    tail -n 20 /www/wwwlogs/nginx_error.log | grep -i "error" | tail -n 10
else
    echo "⚠️  Nginx错误日志文件不存在"
fi
echo ""

echo "【6. 数据库连接检查】"
echo "----------------------------------------"
if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
    echo "✅ MySQL服务运行中"
else
    echo "❌ MySQL服务未运行"
fi
echo ""

echo "=========================================="
echo "  排查完成"
echo "=========================================="
echo ""
echo "提示："
echo "- 如果看到 OutOfMemoryError，是内存不足问题"
echo "- 如果看到 SQLException，是数据库问题"
echo "- 如果看到 IOException，可能是文件或磁盘问题"
echo "- 请将上面的错误信息提供给技术支持"

