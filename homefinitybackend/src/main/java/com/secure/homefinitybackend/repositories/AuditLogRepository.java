package com.secure.homefinitybackend.repositories;

import com.secure.homefinitybackend.models.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByPropertyId(Long PropertyId);
}
