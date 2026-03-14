package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByPropertyId(Long PropertyId);
}

