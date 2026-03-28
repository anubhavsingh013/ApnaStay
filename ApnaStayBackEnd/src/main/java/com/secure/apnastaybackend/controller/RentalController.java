package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.LeasePaymentRecordRequest;
import com.secure.apnastaybackend.dto.request.RentalApplicationCreateRequest;
import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.LeaseDTO;
import com.secure.apnastaybackend.dto.response.LeaseDashboardDTO;
import com.secure.apnastaybackend.dto.response.LeasePaymentDTO;
import com.secure.apnastaybackend.dto.response.RentalApplicationTimelineEventDTO;
import com.secure.apnastaybackend.dto.response.RentalApplicationDTO;
import com.secure.apnastaybackend.services.RentalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RentalController {

    private final RentalService rentalService;

    @PostMapping("/rentals/applications")
    public ResponseEntity<ApiResponse<RentalApplicationDTO>> createApplication(
            @Valid @RequestBody RentalApplicationCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        RentalApplicationDTO dto = rentalService.createApplication(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Rental application submitted", dto));
    }

    @GetMapping("/rental/my-application")
    public ResponseEntity<ApiResponse<List<RentalApplicationDTO>>> listMyApplications(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<RentalApplicationDTO> list = rentalService.listMyApplications(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Rental applications retrieved", list));
    }

    @GetMapping("/rentals/applications/incoming")
    public ResponseEntity<ApiResponse<List<RentalApplicationDTO>>> listIncomingApplications(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<RentalApplicationDTO> list = rentalService.listIncomingApplications(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Incoming rental applications retrieved", list));
    }

    @PutMapping("/rentals/applications/{applicationId}/approve")
    public ResponseEntity<ApiResponse<RentalApplicationDTO>> approveApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        RentalApplicationDTO dto = rentalService.approveApplication(userDetails.getUsername(), applicationId);
        return ResponseEntity.ok(ApiResponse.success("Application approved", dto));
    }

    @PutMapping("/rentals/applications/{applicationId}/reject")
    public ResponseEntity<ApiResponse<RentalApplicationDTO>> rejectApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        RentalApplicationDTO dto = rentalService.rejectApplication(userDetails.getUsername(), applicationId);
        return ResponseEntity.ok(ApiResponse.success("Application rejected", dto));
    }

    @PutMapping("/rentals/applications/{applicationId}/cancel")
    public ResponseEntity<ApiResponse<RentalApplicationDTO>> cancelApplication(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        RentalApplicationDTO dto = rentalService.cancelApplication(userDetails.getUsername(), applicationId);
        return ResponseEntity.ok(ApiResponse.success("Application cancelled", dto));
    }

    @GetMapping("/rentals/rented")
    public ResponseEntity<ApiResponse<List<LeaseDTO>>> listMyLeases(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<LeaseDTO> list = rentalService.listMyLeases(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Leases retrieved", list));
    }

    @GetMapping("/rentals/leases/{leaseId}")
    public ResponseEntity<ApiResponse<LeaseDTO>> getLease(
            @PathVariable Long leaseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        LeaseDTO lease = rentalService.getLease(userDetails.getUsername(), leaseId);
        return ResponseEntity.ok(ApiResponse.success("Lease retrieved", lease));
    }

    @GetMapping("/rentals/leases/{leaseId}/payments")
    public ResponseEntity<ApiResponse<List<LeasePaymentDTO>>> listLeasePayments(
            @PathVariable Long leaseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<LeasePaymentDTO> list = rentalService.listLeasePayments(userDetails.getUsername(), leaseId);
        return ResponseEntity.ok(ApiResponse.success("Lease payments retrieved", list));
    }

    @PostMapping("/rentals/leases/{leaseId}/payments")
    public ResponseEntity<ApiResponse<LeasePaymentDTO>> recordLeasePayment(
            @PathVariable Long leaseId,
            @Valid @RequestBody LeasePaymentRecordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        LeasePaymentDTO dto = rentalService.recordPayment(userDetails.getUsername(), leaseId, request);
        return ResponseEntity.ok(ApiResponse.success("Lease payment recorded", dto));
    }

    @GetMapping("/rentals/applications/{applicationId}/timeline")
    public ResponseEntity<ApiResponse<List<RentalApplicationTimelineEventDTO>>> getApplicationTimeline(
            @PathVariable Long applicationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<RentalApplicationTimelineEventDTO> timeline = rentalService.getApplicationTimeline(userDetails.getUsername(), applicationId);
        return ResponseEntity.ok(ApiResponse.success("Application timeline retrieved", timeline));
    }

    @GetMapping("/rentals/leases/{leaseId}/dashboard")
    public ResponseEntity<ApiResponse<LeaseDashboardDTO>> getLeaseDashboard(
            @PathVariable Long leaseId,
            @AuthenticationPrincipal UserDetails userDetails) {
        LeaseDashboardDTO dashboard = rentalService.getLeaseDashboard(userDetails.getUsername(), leaseId);
        return ResponseEntity.ok(ApiResponse.success("Lease dashboard retrieved", dashboard));
    }
}

