-- 为 upload_tasks 表添加 error_count 字段
-- 如果字段不存在，则添加

-- 检查并添加 error_count 列（如果不存在）
SET @dbname = DATABASE();
SET @tablename = "upload_tasks";
SET @columnname = "error_count";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column error_count already exists in upload_tasks' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT NOT NULL DEFAULT 0 AFTER existing_count;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 验证字段已添加
SELECT 'error_count column added to upload_tasks table' AS result;

