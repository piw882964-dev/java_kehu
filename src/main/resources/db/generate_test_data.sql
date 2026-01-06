-- 批量生成测试数据脚本
-- 用于生成大量测试数据，支持大数据量测试

USE `customer_db`;

-- 删除存储过程（如果存在）
DROP PROCEDURE IF EXISTS `generate_customers`;

-- 创建存储过程：批量生成客户数据
DELIMITER $$

CREATE PROCEDURE `generate_customers`(IN count INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE name_prefix VARCHAR(50);
    DECLARE phone_prefix VARCHAR(20);
    DECLARE email_prefix VARCHAR(50);
    DECLARE address_prefix VARCHAR(100);
    
    -- 开始事务
    START TRANSACTION;
    
    WHILE i <= count DO
        SET name_prefix = CONCAT('客户', i);
        SET phone_prefix = CONCAT('138', LPAD(FLOOR(RAND() * 100000000), 8, '0'));
        SET email_prefix = CONCAT('customer', i, '@example.com');
        SET address_prefix = CONCAT('地址', i, '号');
        
        INSERT INTO `customers` (`name`, `phone`, `email`, `address`, `create_time`, `update_time`)
        VALUES (
            name_prefix,
            phone_prefix,
            email_prefix,
            address_prefix,
            DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 365) DAY),
            NOW()
        );
        
        SET i = i + 1;
        
        -- 每1000条提交一次，提高性能
        IF i % 1000 = 0 THEN
            COMMIT;
            START TRANSACTION;
        END IF;
    END WHILE;
    
    COMMIT;
END$$

DELIMITER ;

-- 使用示例：
-- 生成10万条测试数据
-- CALL generate_customers(100000);

-- 生成100万条测试数据（需要较长时间）
-- CALL generate_customers(1000000);

-- 查看数据量
-- SELECT COUNT(*) as total FROM customers;

-- 删除存储过程（使用完毕后）
-- DROP PROCEDURE IF EXISTS `generate_customers`;

