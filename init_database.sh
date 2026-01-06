#!/bin/bash

# ============================================
# 客户管理系统数据库初始化脚本
# 使用终端执行此脚本即可完成数据库初始化
# ============================================

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 数据库配置
DB_HOST="localhost"
DB_USER="root"
DB_PASSWORD="123456"
DB_NAME="customer_db"
SQL_FILE="src/main/resources/db/init_database_complete.sql"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}客户管理系统数据库初始化${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 检查 MySQL 是否安装
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}错误: 未找到 mysql 命令，请先安装 MySQL${NC}"
    exit 1
fi

# 检查 SQL 文件是否存在
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}错误: SQL 文件不存在: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ MySQL 已安装${NC}"
echo -e "${GREEN}✓ SQL 文件存在${NC}"
echo ""

# 提示信息
echo -e "${YELLOW}数据库配置信息:${NC}"
echo "  主机: $DB_HOST"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo "  SQL文件: $SQL_FILE"
echo ""

# 确认执行
read -p "是否继续执行数据库初始化？(y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消执行${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}正在执行数据库初始化...${NC}"
echo ""

# 执行 SQL 脚本
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < "$SQL_FILE"

# 检查执行结果
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}数据库初始化成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}默认账号信息:${NC}"
    echo "  管理员: admin / admin123 (ADMIN)"
    echo "  查看者: viewer / viewer123 (VIEWER)"
    echo ""
    echo -e "${GREEN}已创建 5 条示例客户数据${NC}"
    echo ""
    
    # 验证数据
    echo -e "${YELLOW}正在验证数据...${NC}"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
        SELECT '用户数量' AS '类型', COUNT(*) AS '数量' FROM users
        UNION ALL
        SELECT '客户数量', COUNT(*) FROM customers;
    "
    
    echo ""
    echo -e "${GREEN}数据库初始化完成！可以启动应用程序了。${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}数据库初始化失败！${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}请检查:${NC}"
    echo "  1. MySQL 服务是否正在运行"
    echo "  2. 数据库用户名和密码是否正确"
    echo "  3. 是否有足够的权限创建数据库"
    exit 1
fi
