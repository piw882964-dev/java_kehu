package com.kehu.controller;

import com.kehu.entity.UploadTask;
import com.kehu.service.UploadTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload-tasks")
public class UploadTaskController {

    @Autowired
    private UploadTaskService uploadTaskService;

    /**
     * 获取所有上传任务（分页，按ID倒序）
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Map<String, Object> response = new HashMap<>();
        try {
            Page<UploadTask> tasks = uploadTaskService.getAllTasks(page, size);
            response.put("success", true);
            response.put("data", tasks.getContent());
            response.put("total", tasks.getTotalElements());
            response.put("totalPages", tasks.getTotalPages());
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
     * 根据ID获取任务
     */
    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<Map<String, Object>> getTaskById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            return uploadTaskService.getTaskById(id)
                    .map(task -> {
                        response.put("success", true);
                        response.put("data", task);
                        response.put("message", "查询成功");
                        return ResponseEntity.ok(response);
                    })
                    .orElseGet(() -> {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("success", false);
                        errorResponse.put("message", "任务不存在");
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                    });
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取最新正在处理的任务（用于恢复任务状态）
     */
    @GetMapping("/processing/latest")
    public ResponseEntity<Map<String, Object>> getLatestProcessingTask() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<UploadTask> tasks = uploadTaskService.getTasksByStatus("处理中");
            if (tasks != null && !tasks.isEmpty()) {
                // 返回最新的正在处理的任务（按ID倒序，即最新的）
                UploadTask latestTask = tasks.stream()
                        .max((t1, t2) -> t1.getId().compareTo(t2.getId()))
                        .orElse(null);
                if (latestTask != null) {
                    response.put("success", true);
                    response.put("data", latestTask);
                    response.put("message", "查询成功");
                    return ResponseEntity.ok(response);
                }
            }
            response.put("success", true);
            response.put("data", null);
            response.put("message", "没有正在处理的任务");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 删除任务（仅管理员）
     */
    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<Map<String, Object>> deleteTask(@PathVariable Long id, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以删除
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以删除任务");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            uploadTaskService.deleteTask(id);
            response.put("success", true);
            response.put("message", "删除成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 批量删除任务（仅管理员）
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Map<String, Object>> batchDeleteTasks(@RequestBody List<Long> ids, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以删除
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以删除任务");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            uploadTaskService.deleteTasks(ids);
            response.put("success", true);
            response.put("message", "批量删除成功，共删除 " + ids.size() + " 条任务");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "批量删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 更新任务备注
     */
    @PutMapping("/{id:[0-9]+}/remark")
    public ResponseEntity<Map<String, Object>> updateRemark(
            @PathVariable Long id,
            @RequestBody Map<String, String> remarkData,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以更新
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以更新备注");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            return uploadTaskService.getTaskById(id)
                    .map(task -> {
                        String remarks = remarkData.get("remarks");
                        task.setRemarks(remarks);
                        uploadTaskService.saveTask(task);
                        response.put("success", true);
                        response.put("message", "备注更新成功");
                        return ResponseEntity.ok(response);
                    })
                    .orElseGet(() -> {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("success", false);
                        errorResponse.put("message", "任务不存在");
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                    });
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 检查用户是否为管理员
     */
    private boolean hasAdminRole(HttpSession session) {
        if (session == null) {
            return false;
        }
        String role = (String) session.getAttribute("role");
        return "ADMIN".equals(role);
    }
}

