package com.kehu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync  // 启用异步处理，支持后台任务
public class CustomerSystemApplication {
    public static void main(String[] args) {
        SpringApplication.run(CustomerSystemApplication.class, args);
    }
}

