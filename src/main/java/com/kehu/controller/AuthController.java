package com.kehu.controller;

import com.kehu.entity.User;
import com.kehu.service.OperationLogService;
import com.kehu.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private OperationLogService operationLogService;

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginData, HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String username = loginData.get("username");
            String password = loginData.get("password");

            if (username == null || username.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "用户名不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            if (password == null || password.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "密码不能为空");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userService.validateUser(username, password);
            if (user != null) {
                // 登录成功，先使旧Session失效（如果有）
                HttpSession oldSession = request.getSession(false);
                if (oldSession != null) {
                    try {
                        oldSession.invalidate();
                    } catch (Exception e) {
                        // 忽略错误
                    }
                }
                
                // 创建新Session
                HttpSession session = request.getSession(true);
                
                // 保存用户信息到Session
                session.setAttribute("user", user);
                session.setAttribute("username", user.getUsername());
                session.setAttribute("realName", user.getRealName() != null ? user.getRealName() : user.getUsername());
                session.setAttribute("role", user.getRole() != null ? user.getRole() : "VIEWER");
                session.setAttribute("loginTime", System.currentTimeMillis()); // 记录登录时间
                
                // 取消登录限时：设置Session永不超时（-1表示永不超时）
                session.setMaxInactiveInterval(-1);
                
                Map<String, String> userData = new HashMap<>();
                userData.put("username", user.getUsername());
                userData.put("realName", user.getRealName() != null ? user.getRealName() : user.getUsername());
                userData.put("role", user.getRole() != null ? user.getRole() : "VIEWER");
                
                logger.info("用户登录成功: username={}, role={}, sessionId={}", username, user.getRole(), session.getId());
                
                // 记录登录日志
                operationLogService.logSuccess(
                    username,
                    "LOGIN",
                    "AUTH",
                    "用户登录",
                    getClientIpAddress(request),
                    user.getId()
                );
                
                response.put("success", true);
                response.put("message", "登录成功");
                response.put("data", userData);
                return ResponseEntity.ok(response);
            } else {
                logger.warn("登录失败: 用户名或密码错误 - username={}", username);
                
                // 记录登录失败日志
                operationLogService.logFailure(
                    username,
                    "LOGIN",
                    "AUTH",
                    "登录失败：用户名或密码错误",
                    getClientIpAddress(request),
                    null,
                    "用户名或密码错误"
                );
                
                response.put("success", false);
                response.put("message", "用户名或密码错误，请检查数据库中的用户信息");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "登录失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 用户登出
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpSession session, HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            User user = (User) session.getAttribute("user");
            String username = user != null ? user.getUsername() : "unknown";
            
            session.invalidate();
            
            // 记录登出日志
            if (user != null) {
                operationLogService.logSuccess(
                    username,
                    "LOGOUT",
                    "AUTH",
                    "用户登出",
                    getClientIpAddress(request),
                    user.getId()
                );
            }
            
            response.put("success", true);
            response.put("message", "登出成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "登出失败: " + e.getMessage());
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
     * 获取用户总数
     */
    @GetMapping("/users/count")
    public ResponseEntity<Map<String, Object>> getUserCount() {
        Map<String, Object> response = new HashMap<>();
        try {
            long count = userService.getTotalCount();
            response.put("success", true);
            response.put("total", count);
            response.put("message", "查询成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取当前登录用户信息（同时刷新Session缓存）
     */
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentUser(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            User user = (User) session.getAttribute("user");
            if (user != null) {
                // Session已设置为永不超时，无需刷新
                
                Map<String, Object> userData = new HashMap<>();
                userData.put("username", user.getUsername());
                userData.put("realName", user.getRealName() != null ? user.getRealName() : user.getUsername());
                userData.put("role", user.getRole() != null ? user.getRole() : "VIEWER");
                // 已取消登录限时，不再返回剩余时间
                
                response.put("success", true);
                response.put("data", userData);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "未登录或Session已过期");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "获取用户信息失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

