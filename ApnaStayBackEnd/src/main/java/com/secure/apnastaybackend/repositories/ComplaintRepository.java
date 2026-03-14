package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.Complaint;
import com.secure.apnastaybackend.entity.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByStatus(ComplaintStatus status);

    List<Complaint> findByRaisedByUserIdOrAssignedToUserIdOrRelatedUserUserId(Long raisedBy, Long assignedTo, Long relatedUser);

    @Query("SELECT DISTINCT c FROM Complaint c LEFT JOIN FETCH c.messages WHERE c.id = :id")
    Optional<Complaint> findByIdWithMessages(@Param("id") Long id);
}

