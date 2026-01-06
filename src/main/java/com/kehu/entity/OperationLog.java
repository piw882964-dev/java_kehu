package com.kehu.entity;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "operation_logs", indexes = {
    @Index(name = "idx_username", columnList = "username"),
    @Index(name = "idx_operation", columnList = "operation"),
    @Index(name = "idx_operation_time", columnList = "operation_time")
})
public class OperationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", length = 50, nullable = false)
    private String username;

    @Column(name = "operation", length = 50, nullable = false)
    private String operation; // CREATE, UPDATE, DELETE, IMPORT, EXPORT, SEARCH, LOGIN, LOGOUT

    @Column(name = "module", length = 50)
    private String module; // CUSTOMER, USER, etc.

    @Column(name = "description", length = 500)
    private String description; // 操作描述

    @Column(name = "ip_address", length = 50)
    private String ipAddress; // IP地址

    @Column(name = "operation_time", nullable = false)
    private LocalDateTime operationTime;

    @Column(name = "target_id")
    private Long targetId; // 操作的目标ID（如客户ID）

    @Column(name = "result", length = 20)
    private String result; // SUCCESS, FAILURE

    @Column(name = "error_message", length = 1000)
    private String errorMessage; // 错误信息

    @PrePersist
    protected void onCreate() {
        if (operationTime == null) {
            operationTime = LocalDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public LocalDateTime getOperationTime() {
        return operationTime;
    }

    public void setOperationTime(LocalDateTime operationTime) {
        this.operationTime = operationTime;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}

