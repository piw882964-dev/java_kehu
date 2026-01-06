-- 数据库性能优化脚本
-- 执行此脚本可以优化数据库查询性能

USE `customer_db`;

-- ============================================
-- 1. 索引优化
-- ============================================

-- 1.1 检查并添加upload_task_id索引（用于关联查询优化）
-- 如果不存在则添加
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = 'customer_db' 
               AND table_name = 'customers' 
               AND index_name = 'idx_upload_task_id');
SET @sqlstmt := IF(@exist = 0, 
    'ALTER TABLE `customers` ADD INDEX `idx_upload_task_id` (`upload_task_id`)', 
    'SELECT "索引 idx_upload_task_id 已存在" AS result');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.2 添加复合索引优化常见查询组合
-- 姓名+创建时间复合索引（用于搜索+排序）
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = 'customer_db' 
               AND table_name = 'customers' 
               AND index_name = 'idx_name_create_time');
SET @sqlstmt := IF(@exist = 0, 
    'ALTER TABLE `customers` ADD INDEX `idx_name_create_time` (`name`, `create_time`)', 
    'SELECT "索引 idx_name_create_time 已存在" AS result');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 1.3 优化分页查询：ID+创建时间复合索引
-- 如果查询经常按ID排序，这个索引很有用
-- 由于主键已经是ID，这个索引可能不太需要，但如果有按ID范围查询的需求可以添加

-- 1.4 确保电话索引是唯一索引（如果需要）
-- 注意：如果业务允许重复电话，不要执行这个
-- ALTER TABLE `customers` ADD UNIQUE INDEX `uk_phone` (`phone`);

-- ============================================
-- 2. 表结构优化建议（可选，需要停机维护）
-- ============================================

-- 2.1 分析表（更新统计信息，帮助优化器选择更好的执行计划）
ANALYZE TABLE `customers`;
ANALYZE TABLE `users`;
ANALYZE TABLE `customer_remarks`;
ANALYZE TABLE `upload_tasks`;

-- 2.2 优化表（整理碎片，回收空间，优化索引）
-- 注意：对于InnoDB表，这个操作会重建表，可能需要较长时间
-- OPTIMIZE TABLE `customers`;
-- OPTIMIZE TABLE `users`;
-- OPTIMIZE TABLE `customer_remarks`;
-- OPTIMIZE TABLE `upload_tasks`;

-- ============================================
-- 3. 查询优化建议
-- ============================================

-- 3.1 对于COUNT(*)查询，如果数据量非常大，可以考虑：
--     方案1：使用缓存（已在代码中实现）
--     方案2：使用近似值查询（从information_schema获取，不准确但很快）
--     方案3：维护一个统计表，每次增删改时更新

-- 3.2 对于模糊查询（LIKE %xxx%），注意：
--     - 前缀匹配（LIKE 'xxx%'）可以使用索引
--     - 后缀匹配（LIKE '%xxx'）不能使用索引
--     - 两端匹配（LIKE '%xxx%'）不能使用索引，建议限制结果数量

-- ============================================
-- 4. MySQL配置优化建议（需要在my.cnf或my.ini中配置）
-- ============================================

/*
[mysqld]
# InnoDB缓冲池大小（建议设置为物理内存的50-70%）
innodb_buffer_pool_size = 1G

# 查询缓存（MySQL 5.7及以下，MySQL 8.0已移除）
# query_cache_size = 64M
# query_cache_type = 1

# 连接数
max_connections = 200

# 排序缓冲区大小
sort_buffer_size = 2M
read_buffer_size = 2M
read_rnd_buffer_size = 4M

# 临时表大小
tmp_table_size = 64M
max_heap_table_size = 64M

# InnoDB日志文件大小（需要重启MySQL）
# innodb_log_file_size = 256M

# 慢查询日志（用于分析慢查询）
slow_query_log = 1
long_query_time = 2
slow_query_log_file = /var/log/mysql/slow-query.log
*/

-- ============================================
-- 5. 查看当前索引情况
-- ============================================

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS,
    INDEX_TYPE,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'customer_db'
    AND TABLE_NAME = 'customers'
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================
-- 6. 查看表状态和大小
-- ============================================

SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH / 1024 / 1024, 2) AS DATA_SIZE_MB,
    ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS INDEX_SIZE_MB,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS TOTAL_SIZE_MB,
    ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'customer_db'
ORDER BY DATA_LENGTH DESC;

-- ============================================
-- 7. 查看慢查询（需要先启用慢查询日志）
-- ============================================

-- SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

