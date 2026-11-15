package com.askrepo.backend.config;

import java.util.concurrent.Executor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.client.RestClient;

@Configuration 
@EnableAsync 
public class AppConfig {
    @Bean 
    RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

    @Bean (name = "indexingExecutor")
    Executor indexingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("index-");
        executor.initialize();
        return executor;
    }
}
