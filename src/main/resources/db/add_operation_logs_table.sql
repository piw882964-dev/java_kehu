-- 添加操作日志表
-- 执行此脚本以添加操作日志功能支持

USE `customer_db`;

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS `operation_logs` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `operation` VARCHAR(50) NOT NULL COMMENT '操作类型：CREATE, UPDATE, DELETE, IMPORT, EXPORT, SEARCH, LOGIN, LOGOUT, BACKUP, RESTORE等',
  `module` VARCHAR(50) DEFAULT NULL COMMENT '模块：CUSTOMER, USER, AUTH, DATABASE等',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '操作描述',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT 'IP地址',
  `operation_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `target_id` BIGINT(20) DEFAULT NULL COMMENT '操作目标ID（如客户ID）',
  `result` VARCHAR(20) DEFAULT NULL COMMENT '操作结果：SUCCESS, FAILURE',
  `error_message` VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_operation` (`operation`),
  KEY `idx_operation_time` (`operation_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

