-- 登录性能优化SQL脚本
-- 执行此脚本可以优化登录查询性能

USE `customer_db`;

-- ============================================
-- 1. 确保username字段有唯一索引（登录查询优化）
-- ============================================

-- 检查username索引是否存在
SET @exist := (SELECT COUNT(*) FROM information_schema.statistics 
               WHERE table_schema = 'customer_db' 
               AND table_name = 'users' 
               AND index_name = 'uk_username');
SET @sqlstmt := IF(@exist = 0, 
    'ALTER TABLE `users` ADD UNIQUE INDEX `uk_username` (`username`)', 
    'SELECT "索引 uk_username 已存在" AS result');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. 优化users表结构
-- ============================================

-- 确保role字段有默认值（避免NULL值问题）
ALTER TABLE `users` 
MODIFY COLUMN `role` VARCHAR(20) DEFAULT 'VIEWER' 
COMMENT '角色：ADMIN（管理员）或VIEWER（查看者）';

-- 更新所有role为NULL的用户
UPDATE `users` SET `role` = 'VIEWER' WHERE `role` IS NULL OR `role` = '';

-- 确保admin用户的role为ADMIN
UPDATE `users` SET `role` = 'ADMIN' WHERE `username` = 'admin' AND (`role` IS NULL OR `role` != 'ADMIN');

-- ============================================
-- 3. 分析表（更新统计信息，帮助优化器选择更好的执行计划）
-- ============================================

ANALYZE TABLE `users`;

-- ============================================
-- 4. 查看users表的索引情况
-- ============================================

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS,
    INDEX_TYPE,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'customer_db'
    AND TABLE_NAME = 'users'
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

