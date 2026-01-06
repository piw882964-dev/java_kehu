package com.kehu.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 异步任务线程池配置（8核32G服务器优化）
 * 用于文件上传和处理等异步任务
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * 配置异步任务执行器
     * 8核CPU：核心线程数设为8，最大线程数设为16
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        
        // 核心线程数：8核CPU，设为8（充分利用CPU）
        executor.setCorePoolSize(8);
        
        // 最大线程数：8核CPU，设为16（2倍核心数，处理突发任务）
        executor.setMaxPoolSize(16);
        
        // 队列容量：500（足够处理大量文件上传任务）
        executor.setQueueCapacity(500);
        
        // 线程名前缀
        executor.setThreadNamePrefix("async-task-");
        
        // 线程空闲时间：60秒
        executor.setKeepAliveSeconds(60);
        
        // 拒绝策略：调用者运行（当线程池和队列都满时，由调用线程执行）
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        // 等待所有任务结束后再关闭线程池
        executor.setWaitForTasksToCompleteOnShutdown(true);
        
        // 等待时间：30秒
        executor.setAwaitTerminationSeconds(30);
        
        executor.initialize();
        return executor;
    }
}

