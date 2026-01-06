package com.kehu.config;

import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.servlet.MultipartConfigElement;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor())
                .addPathPatterns("/pages/**", "/api/customers/**")
                .excludePathPatterns("/pages/login.html", "/pages/login", "/api/auth/**", "/css/**", "/js/**");
    }

    /**
     * 文件上传配置优化（宝塔环境）
     * 支持最大1GB文件上传，优化上传速度和处理性能
     */
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory factory = new MultipartConfigFactory();
        // 单个文件最大1GB（支持大文件）
        factory.setMaxFileSize(DataSize.ofGigabytes(1));
        // 总请求大小最大1GB
        factory.setMaxRequestSize(DataSize.ofGigabytes(1));
        // 文件大小阈值：超过50MB才写入磁盘，小于50MB在内存中处理（100M带宽优化，充分利用带宽减少磁盘IO）
        factory.setFileSizeThreshold(DataSize.ofMegabytes(50));
        // 临时文件位置：使用系统临时目录（通常性能更好）
        factory.setLocation(System.getProperty("java.io.tmpdir"));
        return factory.createMultipartConfig();
    }
}

