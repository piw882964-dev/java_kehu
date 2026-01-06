package com.kehu.common;

import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.io.EOFException;

/**
 * 全局异常处理器
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 处理所有异常
     * 注意：这个处理器应该在所有特定异常处理器之后执行
     */
    @ExceptionHandler(Exception.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleException(Exception e) {
        // 如果是HTTP方法不支持异常，应该由专门的处理器处理，这里不应该捕获
        // 但为了安全起见，这里也检查一下
        if (e instanceof HttpRequestMethodNotSupportedException) {
            return handleHttpRequestMethodNotSupportedException((HttpRequestMethodNotSupportedException) e);
        }
        
        logger.error("系统异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("系统错误: " + e.getMessage(), 500));
    }

    /**
     * 处理非法参数异常
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleIllegalArgumentException(IllegalArgumentException e) {
        logger.warn("参数错误: {}", e.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage(), 400));
    }

    /**
     * 处理空指针异常
     */
    @ExceptionHandler(NullPointerException.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleNullPointerException(NullPointerException e) {
        logger.error("空指针异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("数据不存在或为空", 500));
    }

    /**
     * 处理文件上传大小超限异常
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException e) {
        logger.error("文件上传大小超限异常详情: {}", e.getMessage(), e);
        // 尝试从异常信息中提取实际限制大小
        String errorMsg = "文件上传失败：文件大小超过限制。";
        String exceptionMsg = e.getMessage();
        if (exceptionMsg != null) {
            logger.error("异常详细信息: {}", exceptionMsg);
            // 尝试提取限制值
            if (exceptionMsg.contains("maximum")) {
                errorMsg += " 提示：当前配置的最大文件大小为500MB。如果您的文件小于500MB，请检查：";
                errorMsg += "1) 应用是否已重启；2) Nginx/反向代理是否有文件大小限制；3) 服务器磁盘空间是否充足。";
            }
        } else {
            errorMsg += " 提示：请检查application.yml中的multipart配置，并确保应用已重启。";
        }
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(errorMsg, 400));
    }

    /**
     * 处理运行时异常
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleRuntimeException(RuntimeException e) {
        logger.error("运行时异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("操作失败: " + e.getMessage(), 500));
    }

    /**
     * 处理HTTP方法不支持异常（如GET请求访问POST接口）
     * 这种情况通常是因为浏览器刷新或直接访问接口，不应该记录为错误
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleHttpRequestMethodNotSupportedException(HttpRequestMethodNotSupportedException e) {
        // 只记录为DEBUG级别，避免日志过多（通常是用户刷新页面导致）
        logger.debug("HTTP方法不支持: {} 请求 {} - {}", e.getMethod(), e.getMessage());
        // 返回405状态码，但使用200避免前端显示错误（因为数据已经在后台处理了）
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiResponse.error("此接口仅支持 " + String.join(", ", e.getSupportedMethods()) + " 请求方法", 405));
    }

    /**
     * 处理客户端中断异常（用户取消上传或网络中断）
     * 这种情况不应该记录为错误，因为这是正常的用户行为或网络问题
     */
    @ExceptionHandler({ClientAbortException.class, EOFException.class})
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleClientAbortException(Exception e) {
        // 只记录为DEBUG级别，不记录为错误
        logger.debug("客户端中断连接: {} - {}", e.getClass().getSimpleName(), e.getMessage());
        // 返回200状态码，避免前端显示错误（客户端已经断开，返回什么客户端都收不到）
        return ResponseEntity.ok()
                .body(ApiResponse.error("上传已取消或网络连接中断", 200));
    }

    /**
     * 处理文件上传异常（包括客户端中断）
     */
    @ExceptionHandler(MultipartException.class)
    @ResponseBody
    public ResponseEntity<ApiResponse<Object>> handleMultipartException(MultipartException e) {
        // 检查是否是客户端中断导致的异常
        Throwable cause = e.getCause();
        if (cause instanceof ClientAbortException || 
            cause instanceof EOFException ||
            (cause != null && cause.getCause() instanceof ClientAbortException) ||
            (cause != null && cause.getCause() instanceof EOFException)) {
            // 客户端中断，只记录DEBUG级别
            logger.debug("文件上传时客户端中断: {}", e.getMessage());
            return ResponseEntity.ok()
                    .body(ApiResponse.error("上传已取消或网络连接中断", 200));
        }
        
        // 其他文件上传异常，记录为错误
        logger.error("文件上传异常", e);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("文件上传失败: " + e.getMessage(), 400));
    }
}

