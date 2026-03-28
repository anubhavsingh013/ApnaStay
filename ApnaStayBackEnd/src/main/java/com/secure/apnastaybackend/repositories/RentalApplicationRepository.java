package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.RentalApplication;
import com.secure.apnastaybackend.entity.RentalApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RentalApplicationRepository extends JpaRepository<RentalApplication, Long> {

    List<RentalApplication> findByTenant_UserIdOrderByCreatedAtDesc(Long tenantId);

    List<RentalApplication> findByOwner_UserIdOrderByCreatedAtDesc(Long ownerId);

    List<RentalApplication> findAllByOrderByCreatedAtDesc();

    Optional<RentalApplication> findByIdAndOwner_UserId(Long id, Long ownerId);

    Optional<RentalApplication> findByIdAndTenant_UserId(Long id, Long tenantId);

    boolean existsByProperty_IdAndTenant_UserIdAndStatusIn(Long propertyId, Long tenantId, List<RentalApplicationStatus> statuses);
}

