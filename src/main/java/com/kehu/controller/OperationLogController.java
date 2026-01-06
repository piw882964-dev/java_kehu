package com.kehu.controller;

import com.kehu.entity.OperationLog;
import com.kehu.entity.User;
import com.kehu.service.OperationLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/operation-logs")
public class OperationLogController {

    @Autowired
    private OperationLogService operationLogService;

    /**
     * 分页查询操作日志
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以查看日志
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以查看操作日志");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            Page<OperationLog> logPage = operationLogService.getLogs(page, size);
            
            response.put("success", true);
            response.put("data", logPage.getContent());
            response.put("total", logPage.getTotalElements());
            response.put("totalPages", logPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("message", "查询成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 高级搜索操作日志
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以查看日志
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以查看操作日志");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            Page<OperationLog> logPage = operationLogService.searchLogs(
                username, operation, module, startTime, endTime, page, size);
            
            response.put("success", true);
            response.put("data", logPage.getContent());
            response.put("total", logPage.getTotalElements());
            response.put("totalPages", logPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("message", "查询成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
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

