package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.ComplaintMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ComplaintMessageRepository extends JpaRepository<ComplaintMessage, Long> {

    Optional<ComplaintMessage> findByIdAndComplaint_Id(Long messageId, Long complaintId);
}
