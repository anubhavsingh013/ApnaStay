package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.ComplaintThreadRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComplaintThreadReadRepository extends JpaRepository<ComplaintThreadRead, Long> {

    Optional<ComplaintThreadRead> findByComplaint_IdAndUser_UserId(Long complaintId, Long userId);

    List<ComplaintThreadRead> findByComplaint_Id(Long complaintId);
}
