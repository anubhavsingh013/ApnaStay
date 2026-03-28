package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.response.PropertyDTO;
import com.secure.apnastaybackend.entity.AuditLog;

import java.util.List;

public interface AuditLogService {
    void logPropertyCreation(String username, PropertyDTO property);

    void logPropertyUpdate(String username, PropertyDTO property);

    void logPropertyDeletion(String username, Long Propertyid);

    List<AuditLog> getAllAuditLogs();

    List<AuditLog> getAuditLogsForPropertyId(Long id);

    void logAction(String action, String username, Long propertyId, String content);

}

