package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.LeasePaymentRecordRequest;
import com.secure.apnastaybackend.dto.request.RentalApplicationCreateRequest;
import com.secure.apnastaybackend.dto.response.LeaseDTO;
import com.secure.apnastaybackend.dto.response.LeaseDashboardDTO;
import com.secure.apnastaybackend.dto.response.LeasePaymentDTO;
import com.secure.apnastaybackend.dto.response.RentalApplicationTimelineEventDTO;
import com.secure.apnastaybackend.dto.response.RentalApplicationDTO;
import com.secure.apnastaybackend.entity.*;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.LeasePaymentRepository;
import com.secure.apnastaybackend.repositories.LeaseRepository;
import com.secure.apnastaybackend.repositories.PropertyRepository;
import com.secure.apnastaybackend.repositories.RentalApplicationRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.AuditLogService;
import com.secure.apnastaybackend.services.RentalService;
import com.secure.apnastaybackend.utils.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class RentalServiceImpl implements RentalService {

    private final RentalApplicationRepository rentalApplicationRepository;
    private final LeaseRepository leaseRepository;
    private final LeasePaymentRepository leasePaymentRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final EmailService emailService;

    @Override
    @Transactional
    public RentalApplicationDTO createApplication(String tenantUserName, RentalApplicationCreateRequest request) {
        User tenant = userRepository.findByUserName(tenantUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", tenantUserName));
        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", request.getPropertyId()));
        User owner = resolvePropertyOwner(property);
        if (owner.getUserId().equals(tenant.getUserId())) {
            throw new BadRequestException("You cannot apply to your own property");
        }
        if (property.getStatus() == PropertyStatus.RENTED) {
            throw new BadRequestException("This property is already rented");
        }
        if (leaseRepository.existsByProperty_IdAndStatus(property.getId(), LeaseStatus.ACTIVE)) {
            throw new BadRequestException("An active lease already exists for this property");
        }
        boolean duplicateOpen = rentalApplicationRepository.existsByProperty_IdAndTenant_UserIdAndStatusIn(
                property.getId(),
                tenant.getUserId(),
                List.of(RentalApplicationStatus.PENDING, RentalApplicationStatus.APPROVED)
        );
        if (duplicateOpen) {
            throw new BadRequestException("You already have an active application for this property");
        }
        if (request.getLeaseMonths() == null || request.getLeaseMonths() <= 0) {
            throw new BadRequestException("leaseMonths must be greater than zero");
        }
        if (request.getProposedRent() == null || request.getProposedRent().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("proposedRent must be greater than zero");
        }
        if (request.getMoveInDate() == null || request.getMoveInDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("moveInDate must be today or a future date");
        }
        RentalApplication app = new RentalApplication();
        app.setProperty(property);
        app.setTenant(tenant);
        app.setOwner(owner);
        app.setProposedRent(request.getProposedRent());
        app.setMoveInDate(request.getMoveInDate());
        app.setLeaseMonths(request.getLeaseMonths());
        app.setSecurityDeposit(request.getSecurityDeposit());
        app.setMessage(trimToNull(request.getMessage(), 2000));
        app.setStatus(RentalApplicationStatus.PENDING);
        RentalApplication saved = rentalApplicationRepository.save(app);
        auditLogService.logAction(
                "RENTAL_APPLY",
                tenantUserName,
                property.getId(),
                "Applied for rental: " + property.getTitle()
        );
        return toApplicationDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RentalApplicationDTO> listMyApplications(String tenantUserName) {
        User tenant = userRepository.findByUserName(tenantUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", tenantUserName));
        return rentalApplicationRepository.findByTenant_UserIdOrderByCreatedAtDesc(tenant.getUserId())
                .stream().map(this::toApplicationDTO).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RentalApplicationDTO> listIncomingApplications(String ownerUserName) {
        User owner = userRepository.findByUserName(ownerUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", ownerUserName));
        boolean isAdmin = owner.getRole() != null && owner.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        if (isAdmin) {
            return rentalApplicationRepository.findAllByOrderByCreatedAtDesc()
                    .stream().map(this::toApplicationDTO).toList();
        }
        return rentalApplicationRepository.findByOwner_UserIdOrderByCreatedAtDesc(owner.getUserId())
                .stream().map(this::toApplicationDTO).toList();
    }

    @Override
    @Transactional
    public RentalApplicationDTO approveApplication(String ownerUserName, Long applicationId) {
        User owner = userRepository.findByUserName(ownerUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", ownerUserName));
        RentalApplication app = rentalApplicationRepository.findByIdAndOwner_UserId(applicationId, owner.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("RentalApplication", "id", applicationId));
        if (app.getStatus() != RentalApplicationStatus.PENDING) {
            throw new BadRequestException("Only pending applications can be approved");
        }
        if (leaseRepository.existsByProperty_IdAndStatus(app.getProperty().getId(), LeaseStatus.ACTIVE)) {
            throw new BadRequestException("An active lease already exists for this property");
        }

        LocalDate startDate = app.getMoveInDate();
        LocalDate endDate = startDate.plusMonths(app.getLeaseMonths()).minusDays(1);
        Lease lease = new Lease();
        lease.setProperty(app.getProperty());
        lease.setOwner(app.getOwner());
        lease.setTenant(app.getTenant());
        lease.setStartDate(startDate);
        lease.setEndDate(endDate);
        lease.setMonthlyRent(app.getProposedRent());
        lease.setSecurityDeposit(app.getSecurityDeposit());
        lease.setDueDayOfMonth(Math.min(startDate.getDayOfMonth(), 28));
        lease.setStatus(LeaseStatus.ACTIVE);
        leaseRepository.save(lease);
        generateMonthlyPaymentRows(lease, app.getLeaseMonths());

        app.setStatus(RentalApplicationStatus.APPROVED);
        rentalApplicationRepository.save(app);

        Property property = app.getProperty();
        property.setTenantUserName(app.getTenant().getUserName());
        property.setStatus(PropertyStatus.RENTED);
        propertyRepository.save(property);
        auditLogService.logAction(
                "RENTAL_APPROVE",
                ownerUserName,
                property.getId(),
                "Approved application #" + app.getId() + " for tenant " + app.getTenant().getUserName()
        );

        return toApplicationDTO(app);
    }

    @Override
    @Transactional
    public RentalApplicationDTO rejectApplication(String ownerUserName, Long applicationId) {
        User owner = userRepository.findByUserName(ownerUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", ownerUserName));
        RentalApplication app = rentalApplicationRepository.findByIdAndOwner_UserId(applicationId, owner.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("RentalApplication", "id", applicationId));
        if (app.getStatus() != RentalApplicationStatus.PENDING) {
            throw new BadRequestException("Only pending applications can be rejected");
        }
        app.setStatus(RentalApplicationStatus.REJECTED);
        RentalApplication saved = rentalApplicationRepository.save(app);
        auditLogService.logAction(
                "RENTAL_REJECT",
                ownerUserName,
                app.getProperty().getId(),
                "Rejected application #" + app.getId()
        );
        return toApplicationDTO(saved);
    }

    @Override
    @Transactional
    public RentalApplicationDTO cancelApplication(String tenantUserName, Long applicationId) {
        User tenant = userRepository.findByUserName(tenantUserName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", tenantUserName));
        RentalApplication app = rentalApplicationRepository.findByIdAndTenant_UserId(applicationId, tenant.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("RentalApplication", "id", applicationId));
        if (app.getStatus() != RentalApplicationStatus.PENDING) {
            throw new BadRequestException("Only pending applications can be cancelled");
        }
        app.setStatus(RentalApplicationStatus.CANCELLED);
        RentalApplication saved = rentalApplicationRepository.save(app);
        auditLogService.logAction(
                "RENTAL_CANCEL",
                tenantUserName,
                app.getProperty().getId(),
                "Cancelled application #" + app.getId()
        );
        return toApplicationDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeaseDTO> listMyLeases(String userName) {
        User me = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        boolean isAdmin = me.getRole() != null && me.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        if (isAdmin) {
            return leaseRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toLeaseDTOWithoutPayments).toList();
        }
        return leaseRepository.findByOwner_UserIdOrTenant_UserIdOrderByCreatedAtDesc(me.getUserId(), me.getUserId())
                .stream().map(this::toLeaseDTOWithoutPayments).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LeaseDTO getLease(String userName, Long leaseId) {
        Lease lease = getAuthorizedLease(userName, leaseId);
        return toLeaseDTO(lease, leasePaymentRepository.findByLease_IdOrderByDueDateAsc(lease.getId()));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeasePaymentDTO> listLeasePayments(String userName, Long leaseId) {
        Lease lease = getAuthorizedLease(userName, leaseId);
        return leasePaymentRepository.findByLease_IdOrderByDueDateAsc(lease.getId()).stream().map(this::toPaymentDTO).toList();
    }

    @Override
    @Transactional
    public LeasePaymentDTO recordPayment(String userName, Long leaseId, LeasePaymentRecordRequest request) {
        User actor = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        Lease lease = getAuthorizedLease(userName, leaseId);
        boolean isOwner = lease.getOwner() != null && lease.getOwner().getUserId().equals(actor.getUserId());
        boolean isAdmin = actor.getRole() != null && actor.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        if (!isOwner && !isAdmin) {
            throw new BadRequestException("Only owner or admin can record payments");
        }
        LeasePayment payment = leasePaymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("LeasePayment", "id", request.getPaymentId()));
        if (!payment.getLease().getId().equals(leaseId)) {
            throw new BadRequestException("Payment does not belong to this lease");
        }
        if (request.getAmountPaid() == null || request.getAmountPaid().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("amountPaid must be greater than zero");
        }
        BigDecimal newPaid = payment.getAmountPaid().add(request.getAmountPaid());
        payment.setAmountPaid(newPaid);
        payment.setPaymentMode(request.getPaymentMode());
        payment.setReferenceNote(trimToNull(request.getReferenceNote(), 500));
        payment.setRecordedBy(actor);
        payment.setPaidAt(java.time.LocalDateTime.now());
        if (newPaid.compareTo(payment.getAmountDue()) >= 0) {
            payment.setStatus(LeasePaymentStatus.PAID);
        } else if (newPaid.compareTo(BigDecimal.ZERO) > 0) {
            payment.setStatus(LeasePaymentStatus.PARTIAL);
        } else {
            payment.setStatus(LeasePaymentStatus.PENDING);
        }
        LeasePayment saved = leasePaymentRepository.save(payment);
        auditLogService.logAction(
                "LEASE_PAYMENT_RECORD",
                userName,
                lease.getProperty().getId(),
                "Recorded payment " + request.getAmountPaid() + " for lease #" + leaseId
        );
        return toPaymentDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RentalApplicationTimelineEventDTO> getApplicationTimeline(String userName, Long applicationId) {
        User me = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        RentalApplication app = rentalApplicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("RentalApplication", "id", applicationId));
        boolean isTenant = app.getTenant() != null && app.getTenant().getUserId().equals(me.getUserId());
        boolean isOwner = app.getOwner() != null && app.getOwner().getUserId().equals(me.getUserId());
        boolean isAdmin = me.getRole() != null && me.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        if (!isTenant && !isOwner && !isAdmin) {
            throw new BadRequestException("You do not have access to this application");
        }
        List<RentalApplicationTimelineEventDTO> out = new ArrayList<>();
        out.add(new RentalApplicationTimelineEventDTO("SUBMITTED", app.getCreatedAt()));
        if (app.getStatus() == RentalApplicationStatus.APPROVED) {
            out.add(new RentalApplicationTimelineEventDTO("APPROVED", app.getUpdatedAt()));
        } else if (app.getStatus() == RentalApplicationStatus.REJECTED) {
            out.add(new RentalApplicationTimelineEventDTO("REJECTED", app.getUpdatedAt()));
        } else if (app.getStatus() == RentalApplicationStatus.CANCELLED) {
            out.add(new RentalApplicationTimelineEventDTO("CANCELLED", app.getUpdatedAt()));
        } else {
            out.add(new RentalApplicationTimelineEventDTO("PENDING_REVIEW", app.getUpdatedAt() != null ? app.getUpdatedAt() : app.getCreatedAt()));
        }
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public LeaseDashboardDTO getLeaseDashboard(String userName, Long leaseId) {
        Lease lease = getAuthorizedLease(userName, leaseId);
        List<LeasePayment> payments = leasePaymentRepository.findByLease_IdOrderByDueDateAsc(lease.getId());
        BigDecimal totalDue = payments.stream().map(LeasePayment::getAmountDue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid = payments.stream().map(LeasePayment::getAmountPaid).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal overdue = payments.stream()
                .filter(p -> p.getDueDate() != null && p.getDueDate().isBefore(LocalDate.now()))
                .map(p -> p.getAmountDue().subtract(p.getAmountPaid()))
                .filter(x -> x.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        LeasePayment nextPending = payments.stream()
                .filter(p -> p.getAmountPaid().compareTo(p.getAmountDue()) < 0)
                .findFirst()
                .orElse(null);
        return LeaseDashboardDTO.builder()
                .leaseId(leaseId)
                .nextDueDate(nextPending != null ? nextPending.getDueDate() : null)
                .nextDueAmount(nextPending != null ? nextPending.getAmountDue().subtract(nextPending.getAmountPaid()) : BigDecimal.ZERO)
                .overdueAmount(overdue)
                .totalDue(totalDue)
                .totalPaid(totalPaid)
                .recentPayments(payments.stream()
                        .filter(p -> p.getAmountPaid().compareTo(BigDecimal.ZERO) > 0)
                        .sorted((a, b) -> {
                            LocalDateTime ad = a.getPaidAt();
                            LocalDateTime bd = b.getPaidAt();
                            if (ad == null && bd == null) return 0;
                            if (ad == null) return 1;
                            if (bd == null) return -1;
                            return bd.compareTo(ad);
                        })
                        .limit(5)
                        .map(this::toPaymentDTO).toList())
                .build();
    }

    @Override
    @Transactional
    public int runUpcomingDueReminders() {
        int reminders = 0;
        LocalDate today = LocalDate.now();
        LocalDate reminderDate = today.plusDays(2);
        List<Lease> leases = leaseRepository.findAllByOrderByCreatedAtDesc();
        for (Lease lease : leases) {
            List<LeasePayment> payments = leasePaymentRepository.findByLease_IdOrderByDueDateAsc(lease.getId());
            for (LeasePayment p : payments) {
                if (p.getDueDate() != null && p.getDueDate().equals(reminderDate) && p.getAmountPaid().compareTo(p.getAmountDue()) < 0) {
                    if (lease.getTenant() != null && lease.getTenant().getEmail() != null && !lease.getTenant().getEmail().isBlank()) {
                        emailService.sendGenericEmail(
                                lease.getTenant().getEmail(),
                                "Rent reminder: upcoming due date",
                                "Your rent payment is due on " + p.getDueDate() + " for property " + lease.getProperty().getTitle()
                        );
                        reminders++;
                    }
                }
            }
        }
        return reminders;
    }

    private void generateMonthlyPaymentRows(Lease lease, int leaseMonths) {
        YearMonth startMonth = YearMonth.from(lease.getStartDate());
        for (int i = 0; i < leaseMonths; i++) {
            YearMonth ym = startMonth.plusMonths(i);
            LeasePayment payment = new LeasePayment();
            payment.setLease(lease);
            payment.setPeriodMonth(ym.toString());
            payment.setAmountDue(lease.getMonthlyRent());
            payment.setAmountPaid(BigDecimal.ZERO);
            payment.setDueDate(ym.atDay(Math.min(lease.getDueDayOfMonth(), ym.lengthOfMonth())));
            payment.setStatus(LeasePaymentStatus.PENDING);
            leasePaymentRepository.save(payment);
        }
    }

    private Lease getAuthorizedLease(String userName, Long leaseId) {
        User me = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        Lease lease = leaseRepository.findById(leaseId)
                .orElseThrow(() -> new ResourceNotFoundException("Lease", "id", leaseId));
        boolean isOwner = lease.getOwner() != null && lease.getOwner().getUserId().equals(me.getUserId());
        boolean isTenant = lease.getTenant() != null && lease.getTenant().getUserId().equals(me.getUserId());
        boolean isAdmin = me.getRole() != null && me.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        if (!isOwner && !isTenant && !isAdmin) {
            throw new BadRequestException("You do not have access to this lease");
        }
        return lease;
    }

    private User resolvePropertyOwner(Property property) {
        if (property.getOwner() != null && property.getOwner().getUserId() != null) {
            return property.getOwner();
        }
        if (property.getOwnerUserName() != null && !property.getOwnerUserName().isBlank()) {
            return userRepository.findByUserName(property.getOwnerUserName())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "username", property.getOwnerUserName()));
        }
        throw new BadRequestException("Property owner is not configured");
    }

    private RentalApplicationDTO toApplicationDTO(RentalApplication a) {
        return RentalApplicationDTO.builder()
                .id(a.getId())
                .propertyId(a.getProperty().getId())
                .propertyTitle(a.getProperty().getTitle())
                .tenantId(a.getTenant().getUserId())
                .tenantUserName(a.getTenant().getUserName())
                .ownerId(a.getOwner().getUserId())
                .ownerUserName(a.getOwner().getUserName())
                .proposedRent(a.getProposedRent())
                .moveInDate(a.getMoveInDate())
                .leaseMonths(a.getLeaseMonths())
                .securityDeposit(a.getSecurityDeposit())
                .message(a.getMessage())
                .status(a.getStatus())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    private LeaseDTO toLeaseDTOWithoutPayments(Lease lease) {
        return LeaseDTO.builder()
                .id(lease.getId())
                .propertyId(lease.getProperty().getId())
                .propertyTitle(lease.getProperty().getTitle())
                .tenantId(lease.getTenant().getUserId())
                .tenantUserName(lease.getTenant().getUserName())
                .ownerId(lease.getOwner().getUserId())
                .ownerUserName(lease.getOwner().getUserName())
                .startDate(lease.getStartDate())
                .endDate(lease.getEndDate())
                .monthlyRent(lease.getMonthlyRent())
                .securityDeposit(lease.getSecurityDeposit())
                .dueDayOfMonth(lease.getDueDayOfMonth())
                .status(lease.getStatus())
                .createdAt(lease.getCreatedAt())
                .updatedAt(lease.getUpdatedAt())
                .payments(List.of())
                .build();
    }

    private LeaseDTO toLeaseDTO(Lease lease, List<LeasePayment> payments) {
        LeaseDTO dto = toLeaseDTOWithoutPayments(lease);
        dto.setPayments(payments.stream().map(this::toPaymentDTO).toList());
        return dto;
    }

    private LeasePaymentDTO toPaymentDTO(LeasePayment p) {
        return LeasePaymentDTO.builder()
                .id(p.getId())
                .leaseId(p.getLease().getId())
                .periodMonth(p.getPeriodMonth())
                .amountDue(p.getAmountDue())
                .amountPaid(p.getAmountPaid())
                .dueDate(p.getDueDate())
                .paidAt(p.getPaidAt())
                .status(p.getStatus())
                .paymentMode(p.getPaymentMode())
                .referenceNote(p.getReferenceNote())
                .recordedByUserId(p.getRecordedBy() != null ? p.getRecordedBy().getUserId() : null)
                .recordedByUserName(p.getRecordedBy() != null ? p.getRecordedBy().getUserName() : null)
                .build();
    }

    private String trimToNull(String s, int maxLen) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        if (t.length() > maxLen) {
            return t.substring(0, maxLen);
        }
        return t;
    }
}

