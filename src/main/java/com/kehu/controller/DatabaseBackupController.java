package com.kehu.controller;

import com.kehu.entity.User;
import com.kehu.service.DatabaseBackupService;
import com.kehu.service.OperationLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/backup")
public class DatabaseBackupController {

    @Autowired
    private DatabaseBackupService databaseBackupService;

    @Autowired
    private OperationLogService operationLogService;

    private static final Logger logger = LoggerFactory.getLogger(DatabaseBackupController.class);

    /**
     * 创建数据库备份
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createBackup(HttpSession session, HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以备份
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以备份数据库");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            String backupFilePath = databaseBackupService.backupDatabase();
            String fileName = Paths.get(backupFilePath).getFileName().toString();
            
            // 记录操作日志
            User user = (User) session.getAttribute("user");
            operationLogService.logSuccess(
                user.getUsername(),
                "BACKUP",
                "DATABASE",
                "创建数据库备份: " + fileName,
                getClientIpAddress(request),
                null
            );
            
            response.put("success", true);
            response.put("message", "备份成功");
            response.put("fileName", fileName);
            response.put("filePath", backupFilePath);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("创建备份失败", e);
            
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            operationLogService.logFailure(
                user.getUsername(),
                "BACKUP",
                "DATABASE",
                "创建数据库备份失败",
                getClientIpAddress(request),
                null,
                e.getMessage()
            );
            
            response.put("success", false);
            response.put("message", "备份失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 下载备份文件
     */
    @GetMapping("/download/{fileName}")
    public ResponseEntity<Resource> downloadBackup(
            @PathVariable String fileName,
            HttpSession session) {
        
        // 权限检查：只有ADMIN可以下载备份
        if (!hasAdminRole(session)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        try {
            Path backupFile = Paths.get("backups", fileName);
            Resource resource = new FileSystemResource(backupFile.toFile());
            
            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"");
            headers.add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_OCTET_STREAM_VALUE);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(resource.contentLength())
                    .body(resource);
        } catch (Exception e) {
            logger.error("下载备份文件失败: {}", fileName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取备份文件列表
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getBackupList(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以查看备份列表
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以查看备份列表");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            List<String> fileList = databaseBackupService.getBackupFileList();
            response.put("success", true);
            response.put("data", fileList);
            response.put("message", "查询成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 恢复数据库
     */
    @PostMapping("/restore")
    public ResponseEntity<Map<String, Object>> restoreDatabase(
            @RequestParam("file") MultipartFile file,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以恢复
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以恢复数据库");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            if (file == null || file.isEmpty()) {
                response.put("success", false);
                response.put("message", "请选择要恢复的备份文件");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 保存上传的文件到临时目录
            String uploadDir = "backups/restore";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            Path tempFile = uploadPath.resolve(file.getOriginalFilename());
            Files.copy(file.getInputStream(), tempFile, StandardCopyOption.REPLACE_EXISTING);
            
            // 执行恢复
            databaseBackupService.restoreDatabase(tempFile.toString());
            
            // 删除临时文件
            Files.deleteIfExists(tempFile);
            
            // 记录操作日志
            User user = (User) session.getAttribute("user");
            operationLogService.logSuccess(
                user.getUsername(),
                "RESTORE",
                "DATABASE",
                "恢复数据库: " + file.getOriginalFilename(),
                getClientIpAddress(request),
                null
            );
            
            response.put("success", true);
            response.put("message", "恢复成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("恢复数据库失败", e);
            
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            operationLogService.logFailure(
                user.getUsername(),
                "RESTORE",
                "DATABASE",
                "恢复数据库失败: " + file.getOriginalFilename(),
                getClientIpAddress(request),
                null,
                e.getMessage()
            );
            
            response.put("success", false);
            response.put("message", "恢复失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 删除备份文件
     */
    @DeleteMapping("/{fileName}")
    public ResponseEntity<Map<String, Object>> deleteBackup(
            @PathVariable String fileName,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以删除备份
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以删除备份");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            boolean deleted = databaseBackupService.deleteBackupFile(fileName);
            if (deleted) {
                // 记录操作日志
                User user = (User) session.getAttribute("user");
                operationLogService.logSuccess(
                    user.getUsername(),
                    "DELETE",
                    "BACKUP",
                    "删除备份文件: " + fileName,
                    getClientIpAddress(request),
                    null
                );
                
                response.put("success", true);
                response.put("message", "删除成功");
            } else {
                response.put("success", false);
                response.put("message", "文件不存在或删除失败");
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取客户端IP地址
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    /**
     * 检查当前用户是否有管理员权限
     */
    private boolean hasAdminRole(HttpSession session) {
        if (session == null) {
            return false;
        }
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return false;
        }
        String role = user.getRole();
        return "ADMIN".equals(role);
    }
}

