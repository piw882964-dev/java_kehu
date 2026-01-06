-- 客户管理系统初始数据脚本
-- 注意：此文件包含示例数据，可根据需要修改或删除

USE `customer_db`;

-- 插入默认管理员账号
-- 用户名: admin, 密码: admin123
INSERT INTO `users` (`username`, `password`, `real_name`, `create_time`, `update_time`) VALUES
('admin', 'admin123', '系统管理员', NOW(), NOW())
ON DUPLICATE KEY UPDATE `username`=`username`;

-- 插入示例客户数据（可选，用于测试）
-- 如需大量测试数据，可以使用存储过程批量生成

-- 示例数据
INSERT INTO `customers` (`name`, `phone`, `email`, `address`, `create_time`, `update_time`) VALUES
('张三', '13800138001', 'zhangsan@example.com', '北京市朝阳区xxx街道xxx号', NOW(), NOW()),
('李四', '13800138002', 'lisi@example.com', '上海市浦东新区xxx路xxx号', NOW(), NOW()),
('王五', '13800138003', 'wangwu@example.com', '广州市天河区xxx大道xxx号', NOW(), NOW()),
('赵六', '13800138004', 'zhaoliu@example.com', '深圳市南山区xxx街xxx号', NOW(), NOW()),
('钱七', '13800138005', 'qianqi@example.com', '杭州市西湖区xxx路xxx号', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name`=`name`;

