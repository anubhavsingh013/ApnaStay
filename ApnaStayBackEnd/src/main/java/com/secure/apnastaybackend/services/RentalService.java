package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.LeasePaymentRecordRequest;
import com.secure.apnastaybackend.dto.request.RentalApplicationCreateRequest;
import com.secure.apnastaybackend.dto.response.LeaseDTO;
import com.secure.apnastaybackend.dto.response.LeaseDashboardDTO;
import com.secure.apnastaybackend.dto.response.LeasePaymentDTO;
import com.secure.apnastaybackend.dto.response.RentalApplicationTimelineEventDTO;
import com.secure.apnastaybackend.dto.response.RentalApplicationDTO;

import java.util.List;

public interface RentalService {
    RentalApplicationDTO createApplication(String tenantUserName, RentalApplicationCreateRequest request);

    List<RentalApplicationDTO> listMyApplications(String tenantUserName);

    List<RentalApplicationDTO> listIncomingApplications(String ownerUserName);

    RentalApplicationDTO approveApplication(String ownerUserName, Long applicationId);

    RentalApplicationDTO rejectApplication(String ownerUserName, Long applicationId);

    RentalApplicationDTO cancelApplication(String tenantUserName, Long applicationId);

    List<LeaseDTO> listMyLeases(String userName);

    LeaseDTO getLease(String userName, Long leaseId);

    List<LeasePaymentDTO> listLeasePayments(String userName, Long leaseId);

    LeasePaymentDTO recordPayment(String userName, Long leaseId, LeasePaymentRecordRequest request);

    List<RentalApplicationTimelineEventDTO> getApplicationTimeline(String userName, Long applicationId);

    LeaseDashboardDTO getLeaseDashboard(String userName, Long leaseId);

    int runUpcomingDueReminders();
}

