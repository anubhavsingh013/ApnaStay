package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.LeasePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeasePaymentRepository extends JpaRepository<LeasePayment, Long> {

    List<LeasePayment> findByLease_IdOrderByDueDateAsc(Long leaseId);
}

