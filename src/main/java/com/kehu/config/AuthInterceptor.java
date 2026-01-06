package com.kehu.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

public class AuthInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(AuthInterceptor.class);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestURI = request.getRequestURI();
        
        // 静态资源直接放行
        if (requestURI.startsWith("/css/") || 
            requestURI.startsWith("/js/") || 
            requestURI.startsWith("/images/") ||
            requestURI.startsWith("/favicon.ico")) {
            return true;
        }
        
        HttpSession session = request.getSession(false); // 不创建新session，只获取已存在的
        
        if (session != null) {
            Object user = session.getAttribute("user");
            
            if (user != null) {
                // 用户已登录，Session已设置为永不超时，不需要刷新
                try {
                    // Session已设置为永不超时，无需再次设置
                    // 用户已登录，允许访问
                    return true;
                } catch (IllegalStateException e) {
                    // Session已失效，继续执行未授权处理
                    logger.warn("Session已失效: {}", e.getMessage());
                }
            } else {
                logger.debug("Session存在但用户信息为空: {}", requestURI);
            }
        } else {
            logger.debug("Session不存在: {}", requestURI);
        }
        
        // 如果是API请求，返回JSON
        if (requestURI.startsWith("/api/")) {
            logger.debug("API请求未授权: {}", requestURI);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"请先登录\",\"code\":401}");
            return false;
        } else {
            // 如果是页面请求，重定向到登录页
            logger.debug("页面请求未授权，重定向到登录页: {}", requestURI);
            // 保存原始请求URI，登录后可以跳转回来
            String redirectUrl = "/pages/login.html";
            if (!requestURI.equals("/pages/login.html") && !requestURI.equals("/pages/login")) {
                redirectUrl += "?redirect=" + java.net.URLEncoder.encode(requestURI, "UTF-8");
            }
            response.sendRedirect(redirectUrl);
            return false;
        }
    }
}

