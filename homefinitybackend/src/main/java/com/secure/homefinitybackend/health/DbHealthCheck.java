package com.secure.homefinitybackend.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

@Component
@Slf4j
@Order(1)
public class DbHealthCheck implements ApplicationRunner {

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${spring.datasource.username:}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    private static final String SEPARATOR = "=".repeat(100);

    @Override
    public void run(ApplicationArguments args) {

        log.debug(SEPARATOR);
        log.debug("DATABASE STARTUP VALIDATION");
        log.debug(SEPARATOR);
        log.debug("Datasource URL: {}", maskPassword(datasourceUrl));
        log.debug("Username: {}", username);
        log.debug("Database Name: {}", extractDatabaseName(datasourceUrl));
        log.debug(SEPARATOR);

        validateConnection();
    }

    private void validateConnection() {

        try (Connection connection =
                     DriverManager.getConnection(datasourceUrl, username, password)) {

            if (connection.isValid(5)) {
                log.debug("✅ DATABASE CONNECTION SUCCESSFUL");
                log.debug(SEPARATOR);
            } else {
                log.error("❌ DATABASE CONNECTION INVALID");
                shutdown();
            }

        } catch (SQLException e) {
            logDatabaseError(e);
            shutdown();
        }
    }

    private void logDatabaseError(SQLException e) {

        log.error(SEPARATOR);

        String message = e.getMessage().toLowerCase();
        int errorCode = e.getErrorCode();

        if (message.contains("unknown database") || errorCode == 1049) {
            log.error("❌ DATABASE DOES NOT EXIST");
            log.debug("❌ DATABASE '{}' DOES NOT EXIST",
                    extractDatabaseName(datasourceUrl));

        } else if (message.contains("access denied") || message.contains("mysql_native_password")|| errorCode == 1045) {
            log.error("❌ DB USERNAME or PASSWORD is incorrect");

        } else if (message.contains("communications link failure")
                || message.contains("connection refused")
                || errorCode == 2002
                || errorCode == 2003) {

            log.error("❌ MYSQL SERVER IS NOT RUNNING OR NOT REACHABLE");

        } else if (message.contains("timeout")) {
            log.error("❌ DATABASE CONNECTION TIMEOUT");

        } else {
            log.error("❌ UNKNOWN DATABASE ERROR: {}", e.getMessage());
        }

        log.debug("SQL Error Code: {}", errorCode);
        log.debug("SQL State: {}", e.getSQLState());
        log.error(SEPARATOR);
    }

    private void shutdown() {
        log.error("⛔ APPLICATION SHUTTING DOWN DUE TO DATABASE FAILURE");
        log.error(SEPARATOR);
        System.exit(1);
    }

    private String extractDatabaseName(String url) {
        try {
            if (url != null && url.contains("/")) {
                String[] parts = url.split("/");
                String lastPart = parts[parts.length - 1];
                return lastPart.split("\\?")[0];
            }
        } catch (Exception ignored) {}
        return "unknown";
    }

    private String maskPassword(String url) {
        if (url == null) return "Not configured";
        return url.replaceAll("password=[^&]*", "password=****");
    }
}