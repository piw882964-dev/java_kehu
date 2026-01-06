-- ============================================
-- 客户管理系统完整数据库初始化脚本
-- 适用于Navicat直接执行
-- 数据库名称: customer_db
-- 密码: 123456
-- ============================================
-- 注意：此脚本会删除并重新创建所有表，请谨慎使用！
-- ============================================

-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `customer_db` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `customer_db`;

-- 2. 删除已存在的表（按依赖关系顺序删除，避免外键约束错误）
DROP TABLE IF EXISTS `upload_tasks`;
DROP TABLE IF EXISTS `customer_remarks`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;

-- ============================================
-- 3. 创建表结构
-- ============================================

-- 3.1 创建用户表
CREATE TABLE `users` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(100) NOT NULL COMMENT '密码',
  `real_name` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `role` VARCHAR(20) NOT NULL DEFAULT 'VIEWER' COMMENT '角色：ADMIN（管理员）或VIEWER（查看者）',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 3.2 创建客户表
CREATE TABLE `customers` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '客户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '客户姓名',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(100) DEFAULT NULL COMMENT '邮箱地址',
  `address` VARCHAR(200) DEFAULT NULL COMMENT '详细地址',
  `upload_task_id` BIGINT(20) DEFAULT NULL COMMENT '关联的上传任务ID',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_phone` (`phone`),
  KEY `idx_email` (`email`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户信息表';

-- 3.3 创建客户备注表
CREATE TABLE `customer_remarks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '备注ID',
  `customer_id` BIGINT(20) NOT NULL COMMENT '客户ID',
  `remarks` TEXT COMMENT '备注内容',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `fk_remarks_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户备注表';

-- 3.4 创建上传任务表
CREATE TABLE `upload_tasks` (
  `id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '文件名',
  `total_count` INT(11) NOT NULL DEFAULT 0 COMMENT '总数目',
  `added_count` INT(11) NOT NULL DEFAULT 0 COMMENT '添加数目',
  `existing_count` INT(11) NOT NULL DEFAULT 0 COMMENT '存在数目',
  `status` VARCHAR(50) DEFAULT '处理中' COMMENT '状态：处理中、添加完成、处理失败',
  `upload_time` DATETIME NOT NULL COMMENT '上传时间',
  `complete_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `remarks` TEXT COMMENT '备注',
  PRIMARY KEY (`id`),
  KEY `idx_upload_time` (`upload_time`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上传任务表';

-- ============================================
-- 4. 插入初始数据
-- ============================================

-- 4.1 插入默认管理员账号
-- 用户名: admin, 密码: admin123, 角色: ADMIN
INSERT INTO `users` (`username`, `password`, `real_name`, `role`, `create_time`, `update_time`) VALUES
('admin', 'admin123', '系统管理员', 'ADMIN', NOW(), NOW());

-- 4.2 插入默认查看者账号
-- 用户名: viewer, 密码: viewer123, 角色: VIEWER
INSERT INTO `users` (`username`, `password`, `real_name`, `role`, `create_time`, `update_time`) VALUES
('viewer', 'viewer123', '查看者', 'VIEWER', NOW(), NOW());

-- 4.3 插入示例客户数据（5条）
INSERT INTO `customers` (`name`, `phone`, `email`, `address`, `create_time`, `update_time`) VALUES
('张三', '13800138001', 'zhangsan@example.com', '北京市朝阳区xxx街道xxx号', NOW(), NOW()),
('李四', '13800138002', 'lisi@example.com', '上海市浦东新区xxx路xxx号', NOW(), NOW()),
('王五', '13800138003', 'wangwu@example.com', '广州市天河区xxx大道xxx号', NOW(), NOW()),
('赵六', '13800138004', 'zhaoliu@example.com', '深圳市南山区xxx街xxx号', NOW(), NOW()),
('钱七', '13800138005', 'qianqi@example.com', '杭州市西湖区xxx路xxx号', NOW(), NOW());

-- ============================================
-- 5. 验证数据
-- ============================================
SELECT '数据库初始化完成！' AS message;
SELECT COUNT(*) AS user_count FROM `users`;
SELECT COUNT(*) AS customer_count FROM `customers`;
SELECT '管理员账号: admin / admin123 (ADMIN)' AS admin_info;
SELECT '查看者账号: viewer / viewer123 (VIEWER)' AS viewer_info;
