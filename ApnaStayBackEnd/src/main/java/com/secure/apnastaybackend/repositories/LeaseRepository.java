package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.Lease;
import com.secure.apnastaybackend.entity.LeaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LeaseRepository extends JpaRepository<Lease, Long> {

    boolean existsByProperty_IdAndStatus(Long propertyId, LeaseStatus status);
    boolean existsByProperty_IdAndTenant_UserIdAndStatus(Long propertyId, Long tenantId, LeaseStatus status);

    List<Lease> findByTenant_UserIdOrderByCreatedAtDesc(Long tenantId);

    List<Lease> findByOwner_UserIdOrderByCreatedAtDesc(Long ownerId);

    List<Lease> findByOwner_UserIdOrTenant_UserIdOrderByCreatedAtDesc(Long ownerId, Long tenantId);

    List<Lease> findAllByOrderByCreatedAtDesc();
}

