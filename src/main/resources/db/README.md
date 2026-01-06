# 数据库初始化说明

## 数据库配置

### MySQL数据库要求
- MySQL版本: 5.7+ 或 8.0+
- 字符集: utf8mb4
- 排序规则: utf8mb4_unicode_ci

### 创建数据库

1. **方式一：使用SQL脚本**
   ```sql
   -- 执行 schema.sql 文件
   mysql -u root -p < src/main/resources/db/schema.sql
   ```

2. **方式二：手动创建**
   ```sql
   CREATE DATABASE customer_db 
   DEFAULT CHARACTER SET utf8mb4 
   DEFAULT COLLATE utf8mb4_unicode_ci;
   ```

### 配置数据库连接

编辑 `src/main/resources/application.yml` 文件，修改数据库连接信息：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/customer_db?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai&allowPublicKeyRetrieval=true
    username: root
    password: your_password  # 修改为你的MySQL密码
```

## 初始化步骤

### 1. 创建数据库和表结构

```bash
# 登录MySQL
mysql -u root -p

# 执行schema.sql
source /path/to/project/src/main/resources/db/schema.sql
```

或者直接执行：
```bash
mysql -u root -p < src/main/resources/db/schema.sql
```

### 2. 插入初始数据（可选）

```bash
mysql -u root -p customer_db < src/main/resources/db/data.sql
```

### 3. 生成大量测试数据（可选）

如果需要生成大量测试数据：

```bash
# 登录MySQL
mysql -u root -p customer_db

# 执行存储过程脚本
source /path/to/project/src/main/resources/db/generate_test_data.sql

# 生成10万条测试数据
CALL generate_customers(100000);

# 生成100万条测试数据（需要较长时间）
CALL generate_customers(1000000);
```

## 数据库优化建议

### 1. 索引优化
- 已为常用查询字段创建索引：name, phone, email, create_time
- 根据实际查询需求可添加组合索引

### 2. 连接池配置
已在 `application.yml` 中配置HikariCP连接池：
- 最小连接数: 5
- 最大连接数: 20
- 可根据实际负载调整

### 3. 批量操作优化
- JPA批量插入/更新已启用
- 批量大小: 50
- 适合大数据量操作

### 4. 分页查询
对于大数据量查询，建议使用分页：
```java
Pageable pageable = PageRequest.of(page, size);
Page<Customer> customers = customerRepository.findAll(pageable);
```

## 数据备份

### 备份数据库
```bash
mysqldump -u root -p customer_db > backup_$(date +%Y%m%d).sql
```

### 恢复数据库
```bash
mysql -u root -p customer_db < backup_20231229.sql
```

## 性能监控

### 查看表大小
```sql
SELECT 
    table_name AS '表名',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS '大小(MB)'
FROM information_schema.TABLES
WHERE table_schema = 'customer_db'
ORDER BY (data_length + index_length) DESC;
```

### 查看索引使用情况
```sql
SHOW INDEX FROM customers;
```

### 分析查询性能
```sql
EXPLAIN SELECT * FROM customers WHERE name LIKE '%客户%';
```

## 注意事项

1. **生产环境配置**
   - 将 `ddl-auto` 改为 `validate` 或 `none`
   - 关闭 `show-sql` 日志
   - 使用强密码
   - 启用SSL连接

2. **大数据量处理**
   - 使用分页查询
   - 避免全表扫描
   - 合理使用索引
   - 考虑数据归档策略

3. **定期维护**
   - 定期备份数据
   - 监控数据库性能
   - 优化慢查询
   - 清理历史数据

