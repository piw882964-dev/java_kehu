package com.kehu.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class DatabaseBackupService {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseBackupService.class);

    @Autowired
    private DataSource dataSource;

    @Value("${spring.datasource.url:jdbc:mysql://localhost:3306/customer_db}")
    private String jdbcUrl;

    @Value("${spring.datasource.username:root}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    /**
     * 备份数据库到SQL文件
     * @return 备份文件路径
     */
    public String backupDatabase() throws Exception {
        // 从JDBC URL中提取数据库名
        String databaseName = extractDatabaseName(jdbcUrl);
        
        // 创建备份目录
        String backupDir = "backups";
        Path backupPath = Paths.get(backupDir);
        if (!Files.exists(backupPath)) {
            Files.createDirectories(backupPath);
        }
        
        // 生成备份文件名
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String backupFileName = String.format("customer_db_backup_%s.sql", timestamp);
        Path backupFile = backupPath.resolve(backupFileName);
        
        try (Connection connection = dataSource.getConnection();
             PrintWriter writer = new PrintWriter(
                 new BufferedWriter(
                     new OutputStreamWriter(
                         Files.newOutputStream(backupFile),
                         StandardCharsets.UTF_8
                     )
                 )
             )) {
            
            writer.println("-- 客户管理系统数据库备份");
            writer.println("-- 备份时间: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
            writer.println("-- 数据库: " + databaseName);
            writer.println("");
            writer.println("SET FOREIGN_KEY_CHECKS=0;");
            writer.println("");
            
            // 获取所有表名
            List<String> tables = getTableNames(connection);
            
            // 备份每个表的数据
            for (String tableName : tables) {
                backupTable(connection, writer, tableName);
            }
            
            writer.println("SET FOREIGN_KEY_CHECKS=1;");
            writer.flush();
        }
        
        return backupFile.toString();
    }

    /**
     * 从SQL文件恢复数据库
     */
    public void restoreDatabase(String sqlFilePath) throws Exception {
        Path sqlFile = Paths.get(sqlFilePath);
        if (!Files.exists(sqlFile)) {
            throw new FileNotFoundException("备份文件不存在: " + sqlFilePath);
        }
        
        try (Connection connection = dataSource.getConnection();
             BufferedReader reader = Files.newBufferedReader(sqlFile, StandardCharsets.UTF_8);
             Statement statement = connection.createStatement()) {
            
            StringBuilder sql = new StringBuilder();
            String line;
            
            while ((line = reader.readLine()) != null) {
                // 跳过注释和空行
                if (line.trim().startsWith("--") || line.trim().isEmpty()) {
                    continue;
                }
                
                sql.append(line);
                
                // 如果遇到分号，执行SQL
                if (line.trim().endsWith(";")) {
                    String sqlStatement = sql.toString().trim();
                    if (!sqlStatement.isEmpty()) {
                        try {
                            statement.execute(sqlStatement);
                        } catch (Exception e) {
                            // 忽略某些错误（如表不存在等），继续执行
                            logger.warn("执行SQL失败: {}... 错误: {}", 
                                sqlStatement.substring(0, Math.min(100, sqlStatement.length())), e.getMessage());
                        }
                    }
                    sql.setLength(0);
                }
            }
        }
    }

    /**
     * 从JDBC URL中提取数据库名
     */
    private String extractDatabaseName(String jdbcUrl) {
        // jdbc:mysql://localhost:3306/customer_db?...
        int dbNameStart = jdbcUrl.lastIndexOf('/') + 1;
        int dbNameEnd = jdbcUrl.indexOf('?', dbNameStart);
        if (dbNameEnd == -1) {
            dbNameEnd = jdbcUrl.length();
        }
        return jdbcUrl.substring(dbNameStart, dbNameEnd);
    }

    /**
     * 获取所有表名
     */
    private List<String> getTableNames(Connection connection) throws Exception {
        List<String> tables = new ArrayList<>();
        DatabaseMetaData metaData = connection.getMetaData();
        
        try (ResultSet rs = metaData.getTables(null, null, null, new String[]{"TABLE"})) {
            while (rs.next()) {
                String tableName = rs.getString("TABLE_NAME");
                tables.add(tableName);
            }
        }
        
        return tables;
    }

    /**
     * 备份单个表的数据
     */
    private void backupTable(Connection connection, PrintWriter writer, String tableName) throws Exception {
        writer.println("-- 备份表: " + tableName);
        writer.println("DELETE FROM `" + tableName + "`;");
        writer.println("");
        
        try (Statement stmt = connection.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM `" + tableName + "`")) {
            
            int columnCount = rs.getMetaData().getColumnCount();
            
            while (rs.next()) {
                StringBuilder insertSql = new StringBuilder("INSERT INTO `" + tableName + "` VALUES (");
                
                for (int i = 1; i <= columnCount; i++) {
                    Object value = rs.getObject(i);
                    
                    if (value == null) {
                        insertSql.append("NULL");
                    } else if (value instanceof String) {
                        // 转义单引号和反斜杠
                        String escapedValue = ((String) value).replace("\\", "\\\\").replace("'", "\\'");
                        insertSql.append("'").append(escapedValue).append("'");
                    } else if (value instanceof java.sql.Timestamp || value instanceof java.time.LocalDateTime) {
                        insertSql.append("'").append(value.toString()).append("'");
                    } else {
                        insertSql.append(value);
                    }
                    
                    if (i < columnCount) {
                        insertSql.append(",");
                    }
                }
                
                insertSql.append(");");
                writer.println(insertSql.toString());
            }
            
            writer.println("");
        }
    }

    /**
     * 获取备份文件列表
     */
    public List<String> getBackupFileList() {
        List<String> fileList = new ArrayList<>();
        try {
            Path backupDir = Paths.get("backups");
            if (Files.exists(backupDir)) {
                Files.list(backupDir)
                    .filter(path -> path.toString().endsWith(".sql"))
                    .sorted((a, b) -> {
                        try {
                            return Files.getLastModifiedTime(b).compareTo(Files.getLastModifiedTime(a));
                        } catch (IOException e) {
                            return 0;
                        }
                    })
                    .forEach(path -> fileList.add(path.getFileName().toString()));
            }
        } catch (Exception e) {
            logger.error("获取备份文件列表失败", e);
        }
        return fileList;
    }

    /**
     * 删除备份文件
     */
    public boolean deleteBackupFile(String fileName) {
        try {
            Path backupFile = Paths.get("backups", fileName);
            if (Files.exists(backupFile)) {
                Files.delete(backupFile);
                return true;
            }
        } catch (Exception e) {
            logger.error("删除备份文件失败: {}", fileName, e);
        }
        return false;
    }
}

