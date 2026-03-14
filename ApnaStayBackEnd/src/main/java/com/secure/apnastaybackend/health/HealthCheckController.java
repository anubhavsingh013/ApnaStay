package com.secure.apnastaybackend.health;

import com.secure.apnastaybackend.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@Slf4j
@RequestMapping("/api")
public class HealthCheckController {
    @GetMapping("/health-check")
    public ApiResponse<LocalDateTime> healthCheck() {
        log.info("Health check accessed /api/health-check");
        return ApiResponse.success("health check successful", LocalDateTime.now());
    }
}

