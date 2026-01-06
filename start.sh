#!/bin/bash
# 客户管理系统启动脚本

# 设置工作目录
cd "$(dirname "$0")"

# JVM参数配置（8核32G服务器优化配置）
# 优化说明：
# -Xms8g -Xmx16g: 初始8GB，最大16GB（充分利用32G服务器，预留16G给系统）
# -XX:+UseG1GC: 使用G1垃圾回收器（适合大内存和低延迟）
# -XX:MaxGCPauseMillis=200: 最大GC暂停时间200ms（保证响应速度）
# -XX:ConcGCThreads=4: 并发GC线程数（8核CPU，设为4，充分利用多核）
# -XX:ParallelGCThreads=8: 并行GC线程数（8核CPU，设为8）
# -XX:G1HeapRegionSize=16m: G1堆区域大小（大内存推荐16MB）
# -XX:+ExplicitGCInvokesConcurrent: 显式GC使用并发模式
# -XX:+HeapDumpOnOutOfMemoryError: 内存溢出时自动生成dump文件
# -XX:HeapDumpPath=logs/: dump文件保存位置
# -XX:MetaspaceSize=512m: 元空间初始大小（增加以支持更多类）
# -XX:MaxMetaspaceSize=1024m: 元空间最大大小（1GB）
# -XX:+UseStringDeduplication: 字符串去重（减少内存占用）
JVM_OPTS="-Xms8g -Xmx16g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:ConcGCThreads=4 -XX:ParallelGCThreads=8 -XX:G1HeapRegionSize=16m -XX:+ExplicitGCInvokesConcurrent -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=logs/heapdump.hprof -XX:MetaspaceSize=512m -XX:MaxMetaspaceSize=1024m -XX:+UseStringDeduplication"

# 应用jar包路径（优先使用target目录，如果不存在则使用当前目录）
if [ -f "target/customer-system-1.0.0.jar" ]; then
    JAR_FILE="target/customer-system-1.0.0.jar"
elif [ -f "customer-system-1.0.0.jar" ]; then
    JAR_FILE="customer-system-1.0.0.jar"
else
    echo "错误: 未找到JAR文件，请先执行 ./build.sh 打包"
    exit 1
fi

# 日志文件
LOG_FILE="logs/application.log"

# 创建日志目录
mkdir -p logs

# 检查是否已有进程在运行，如果有则先停止
if [ -f "application.pid" ]; then
    OLD_PID=$(cat application.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "检测到已有进程运行中（PID: $OLD_PID），正在停止..."
        kill $OLD_PID 2>/dev/null
        sleep 2
        if ps -p $OLD_PID > /dev/null 2>&1; then
            kill -9 $OLD_PID 2>/dev/null
        fi
        rm -f application.pid
    else
        rm -f application.pid
    fi
fi

# 额外检查：如果端口8080被占用，尝试停止相关进程
if command -v lsof > /dev/null 2>&1; then
    PORT_PID=$(lsof -ti:8080 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "检测到8080端口被占用（PID: $PORT_PID），正在停止..."
        kill $PORT_PID 2>/dev/null
        sleep 2
        if ps -p $PORT_PID > /dev/null 2>&1; then
            kill -9 $PORT_PID 2>/dev/null
        fi
    fi
fi

# 或者使用pkill查找并停止所有相关Java进程
pkill -f "customer-system-1.0.0.jar" 2>/dev/null
sleep 1

# 启动应用
echo "正在启动客户管理系统（8核32G服务器优化配置）..."
echo "JVM内存配置: 初始8GB，最大16GB"
nohup java $JVM_OPTS -jar $JAR_FILE > $LOG_FILE 2>&1 &

# 获取进程ID
PID=$!

# 保存PID到文件
echo $PID > application.pid

echo "应用已启动，PID: $PID"
echo "日志文件: $LOG_FILE"
echo "查看日志: tail -f $LOG_FILE"

