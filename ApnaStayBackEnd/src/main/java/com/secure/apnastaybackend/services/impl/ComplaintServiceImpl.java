package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.AssignComplaintRequest;
import com.secure.apnastaybackend.dto.request.ComplaintMessageRequest;
import com.secure.apnastaybackend.dto.request.ComplaintRequest;
import com.secure.apnastaybackend.dto.request.ResolveComplaintRequest;
import com.secure.apnastaybackend.dto.response.ComplaintDTO;
import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.dto.response.ComplaintReadReceiptDTO;
import com.secure.apnastaybackend.entity.*;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.ComplaintMessageRepository;
import com.secure.apnastaybackend.repositories.ComplaintRepository;
import com.secure.apnastaybackend.repositories.ComplaintThreadReadRepository;
import com.secure.apnastaybackend.repositories.PropertyRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintMessageRepository complaintMessageRepository;
    private final ComplaintThreadReadRepository complaintThreadReadRepository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private static String topicForComplaint(long complaintId) {
        return "/topic/complaint/" + complaintId;
    }

    private static String topicForUser(long userId) {
        return "/topic/chat/" + userId;
    }

    private static List<Long> participantUserIds(Complaint complaint) {
        java.util.LinkedHashSet<Long> ids = new java.util.LinkedHashSet<>();
        if (complaint.getRaisedBy() != null && complaint.getRaisedBy().getUserId() != null) {
            ids.add(complaint.getRaisedBy().getUserId());
        }
        if (complaint.getRelatedUser() != null && complaint.getRelatedUser().getUserId() != null) {
            ids.add(complaint.getRelatedUser().getUserId());
        }
        if (complaint.getAssignedTo() != null && complaint.getAssignedTo().getUserId() != null) {
            ids.add(complaint.getAssignedTo().getUserId());
        }
        return new java.util.ArrayList<>(ids);
    }

    @Override
    @Transactional
    public ComplaintDTO raiseComplaint(String userName, ComplaintRequest request) {
        User raisedBy = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        User relatedUser = null;
        if (request.getRelatedUserId() != null) {
            relatedUser = userRepository.findById(request.getRelatedUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getRelatedUserId()));
        }
        Property property = null;
        if (request.getPropertyId() != null) {
            property = propertyRepository.findById(request.getPropertyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Property", "id", request.getPropertyId()));
        }
        Complaint complaint = new Complaint();
        complaint.setRaisedBy(raisedBy);
        complaint.setRelatedUser(relatedUser);
        complaint.setProperty(property);
        complaint.setSubject(request.getSubject());
        complaint.setDescription(request.getDescription());
        complaint.setStatus(ComplaintStatus.OPEN);
        complaint.setPriority(request.getPriority() != null ? request.getPriority() : ComplaintPriority.MEDIUM);
        complaint.setCategory(request.getCategory() != null ? request.getCategory().trim() : "GENERAL");
        complaint.setResponseDueAt(LocalDateTime.now().plusHours(4));
        complaint.setResolutionDueAt(LocalDateTime.now().plusDays(2));
        Complaint saved = complaintRepository.save(complaint);
        log.info("Complaint raised: id={} by {}", saved.getId(), userName);
        return toComplaintDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintDTO> listComplaints(String userName, ComplaintStatus statusFilter) {
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        boolean isAdmin = user.getRole() != null && user.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        List<Complaint> complaints;
        if (isAdmin) {
            complaints = statusFilter != null
                    ? complaintRepository.findByStatus(statusFilter)
                    : complaintRepository.findAll();
        } else {
            complaints = complaintRepository.findByRaisedByUserIdOrAssignedToUserIdOrRelatedUserUserId(
                    user.getUserId(), user.getUserId(), user.getUserId());
            if (statusFilter != null) {
                complaints = complaints.stream()
                        .filter(c -> c.getStatus() == statusFilter)
                        .collect(Collectors.toList());
            }
        }
        return complaints.stream().map(this::toComplaintDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ComplaintDTO getComplaintById(String userName, Long id) {
        Complaint complaint = complaintRepository.findByIdWithMessages(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (!canAccessComplaint(complaint, user)) {
            throw new BadRequestException("You do not have access to this complaint");
        }
        return toComplaintDTO(complaint, true);
    }

    @Override
    @Transactional
    public ComplaintDTO resolveComplaint(String userName, Long id, ResolveComplaintRequest request) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        boolean isAdmin = user.getRole() != null && user.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        boolean isAssigned = complaint.getAssignedTo() != null && complaint.getAssignedTo().getUserId().equals(user.getUserId());
        if (!isAdmin && !isAssigned) {
            throw new BadRequestException("Only admin or assigned user can resolve this complaint");
        }
        complaint.setStatus(ComplaintStatus.RESOLVED);
        complaint.setResolvedAt(LocalDateTime.now());
        complaint.setResolvedBy(user);
        complaint.setResolutionNote(request != null ? request.getResolutionNote() : null);
        Complaint saved = complaintRepository.save(complaint);
        log.info("Complaint resolved: id={} by {}", id, userName);
        return toComplaintDTO(saved);
    }

    @Override
    @Transactional
    public ComplaintDTO assignComplaint(String userName, Long id, AssignComplaintRequest request) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));
        User admin = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (admin.getRole() == null || admin.getRole().getRoleName() != AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Only admin can assign complaints");
        }
        if (request == null || request.getAssignToUserId() == null) {
            throw new BadRequestException("Missing mandatory parameter: assignToUserId");
        }
        User assignTo = userRepository.findById(request.getAssignToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getAssignToUserId()));
        complaint.setAssignedTo(assignTo);
        complaint.setStatus(ComplaintStatus.IN_PROGRESS);
        if (complaint.getFirstResponseAt() == null) {
            complaint.setFirstResponseAt(LocalDateTime.now());
        }
        Complaint saved = complaintRepository.save(complaint);
        log.info("Complaint {} assigned to user {}", id, assignTo.getUserName());
        return toComplaintDTO(saved);
    }

    @Override
    @Transactional
    public ComplaintDTO updateStatus(String userName, Long id, ComplaintStatus status) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", id));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        boolean isAdmin = user.getRole() != null && user.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        boolean isAssigned = complaint.getAssignedTo() != null && complaint.getAssignedTo().getUserId().equals(user.getUserId());
        if (!isAdmin && !isAssigned && !complaint.getRaisedBy().getUserId().equals(user.getUserId())) {
            throw new BadRequestException("You do not have permission to update this complaint status");
        }
        complaint.setStatus(status);
        if (status == ComplaintStatus.RESOLVED) {
            complaint.setResolvedAt(LocalDateTime.now());
            complaint.setResolvedBy(user);
        }
        Complaint saved = complaintRepository.save(complaint);
        return toComplaintDTO(saved);
    }

    @Override
    @Transactional
    public ComplaintMessageDTO addMessage(String userName, Long complaintId, ComplaintMessageRequest request) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (!canAccessComplaint(complaint, user)) {
            throw new BadRequestException("You do not have access to this complaint");
        }
        ComplaintMessage msg = new ComplaintMessage();
        msg.setComplaint(complaint);
        msg.setSender(user);
        msg.setMessageText(request.getMessageText());
        // Ensure DTO/socket payload always has a time (CreationTimestamp can be unset on transient entity until flush in some cases).
        msg.setCreatedAt(java.time.LocalDateTime.now());
        if (complaint.getFirstResponseAt() == null && complaint.getAssignedTo() != null
                && complaint.getAssignedTo().getUserId().equals(user.getUserId())) {
            complaint.setFirstResponseAt(LocalDateTime.now());
        }
        complaint.getMessages().add(msg);
        complaintRepository.saveAndFlush(complaint);
        ComplaintMessageDTO dto = toMessageDTO(msg);
        log.info("Message added to complaint {} by {}", complaintId, userName);
        log.info("WS broadcast complaint message: complaintId={}, messageId={}, sender={}", complaintId, dto.getId(), userName);
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), dto);
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canUserAccessComplaint(String userName, Long complaintId) {
        if (complaintId == null || userName == null || userName.isBlank()) {
            return false;
        }
        Complaint complaint = complaintRepository.findById(complaintId).orElse(null);
        if (complaint == null) {
            return false;
        }
        User user = userRepository.findByUserName(userName).orElse(null);
        if (user == null) {
            return false;
        }
        return canAccessComplaint(complaint, user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintMessageDTO> getMessages(String userName, Long complaintId) {
        Complaint complaint = complaintRepository.findByIdWithMessages(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (!canAccessComplaint(complaint, user)) {
            throw new BadRequestException("You do not have access to this complaint");
        }
        return complaint.getMessages().stream().map(this::toMessageDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ComplaintMessageDTO deleteMessage(String userName, Long complaintId, Long messageId) {
        ComplaintMessage msg = complaintMessageRepository.findByIdAndComplaint_Id(messageId, complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("ComplaintMessage", "id", messageId));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        Complaint complaint = msg.getComplaint();
        if (!canAccessComplaint(complaint, user)) {
            throw new BadRequestException("You do not have access to this complaint");
        }
        boolean isAdmin = user.getRole() != null && user.getRole().getRoleName() == AppRole.ROLE_ADMIN;
        boolean isSender = msg.getSender() != null && msg.getSender().getUserId().equals(user.getUserId());
        if (!isSender && !isAdmin) {
            throw new BadRequestException("You can only delete your own messages");
        }
        if (msg.isDeleted()) {
            return toMessageDTO(msg);
        }
        msg.setDeleted(true);
        msg.setMessageText("");
        complaintMessageRepository.save(msg);
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "messageDeleted");
        envelope.put("complaintId", complaintId);
        envelope.put("messageId", messageId);
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), (Object) envelope);
        for (Long uid : participantUserIds(complaint)) {
            messagingTemplate.convertAndSend(topicForUser(uid), (Object) envelope);
        }
        log.info("Complaint message {} soft-deleted on complaint {} by {}", messageId, complaintId, userName);
        return toMessageDTO(msg);
    }

    @Override
    @Transactional
    public void markThreadRead(String userName, Long complaintId, Long lastReadMessageId) {
        if (lastReadMessageId == null || lastReadMessageId <= 0) {
            throw new BadRequestException("lastReadMessageId is required");
        }
        Complaint complaint = complaintRepository.findByIdWithMessages(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (!canAccessComplaint(complaint, user)) {
            throw new BadRequestException("You do not have access to this complaint");
        }
        boolean messageInThread = complaint.getMessages().stream()
                .anyMatch(m -> m.getId() != null && m.getId().equals(lastReadMessageId));
        if (!messageInThread) {
            throw new BadRequestException("Message does not belong to this complaint thread");
        }
        ComplaintThreadRead row = complaintThreadReadRepository
                .findByComplaint_IdAndUser_UserId(complaintId, user.getUserId())
                .orElseGet(() -> {
                    ComplaintThreadRead r = new ComplaintThreadRead();
                    r.setComplaint(complaint);
                    r.setUser(user);
                    r.setLastReadMessageId(0L);
                    return r;
                });
        long prev = row.getLastReadMessageId() != null ? row.getLastReadMessageId() : 0L;
        long merged = Math.max(prev, lastReadMessageId);
        if (merged == prev) {
            return;
        }
        row.setLastReadMessageId(merged);
        row.setComplaint(complaint);
        row.setUser(user);
        complaintThreadReadRepository.save(row);
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("type", "readReceipt");
        envelope.put("complaintId", complaintId);
        envelope.put("readerUserName", userName);
        envelope.put("lastReadMessageId", merged);
        messagingTemplate.convertAndSend(topicForComplaint(complaintId), (Object) envelope);
        for (Long uid : participantUserIds(complaint)) {
            messagingTemplate.convertAndSend(topicForUser(uid), (Object) envelope);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComplaintReadReceiptDTO> getThreadReadReceipts(String userName, Long complaintId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (!canAccessComplaint(complaint, user)) {
            throw new BadRequestException("You do not have access to this complaint");
        }
        return complaintThreadReadRepository.findByComplaint_Id(complaintId).stream()
                .map(r -> ComplaintReadReceiptDTO.builder()
                        .userName(r.getUser().getUserName())
                        .lastReadMessageId(r.getLastReadMessageId())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ComplaintDTO submitCsat(String userName, Long complaintId, Integer score) {
        if (score == null || score < 1 || score > 5) {
            throw new BadRequestException("CSAT score must be in range 1-5");
        }
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint", "id", complaintId));
        if (complaint.getStatus() != ComplaintStatus.RESOLVED) {
            throw new BadRequestException("CSAT can be submitted only for resolved complaints");
        }
        if (complaint.getRaisedBy() == null || !complaint.getRaisedBy().getUserName().equals(userName)) {
            throw new BadRequestException("Only complaint raiser can submit CSAT");
        }
        complaint.setCsatScore(score);
        return toComplaintDTO(complaintRepository.save(complaint));
    }

    @Override
    @Transactional
    public int runSlaEscalationCycle() {
        int flagged = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Complaint c : complaintRepository.findAll()) {
            boolean responseBreached = c.getFirstResponseAt() == null && c.getResponseDueAt() != null && c.getResponseDueAt().isBefore(now);
            boolean resolutionBreached = c.getStatus() != ComplaintStatus.RESOLVED && c.getResolutionDueAt() != null && c.getResolutionDueAt().isBefore(now);
            if (responseBreached || resolutionBreached) {
                flagged++;
                log.warn("Complaint SLA breach flagged: id={}, responseBreached={}, resolutionBreached={}",
                        c.getId(), responseBreached, resolutionBreached);
            }
        }
        return flagged;
    }

    private boolean canAccessComplaint(Complaint complaint, User user) {
        if (user.getRole() != null && user.getRole().getRoleName() == AppRole.ROLE_ADMIN) return true;
        Long uid = user.getUserId();
        if (complaint.getRaisedBy() != null && complaint.getRaisedBy().getUserId().equals(uid)) return true;
        if (complaint.getAssignedTo() != null && complaint.getAssignedTo().getUserId().equals(uid)) return true;
        if (complaint.getRelatedUser() != null && complaint.getRelatedUser().getUserId().equals(uid)) return true;
        return false;
    }

    private ComplaintDTO toComplaintDTO(Complaint c) {
        return toComplaintDTO(c, false);
    }

    private ComplaintDTO toComplaintDTO(Complaint c, boolean includeMessages) {
        List<ComplaintMessageDTO> messageDtos = includeMessages && c.getMessages() != null
                ? c.getMessages().stream().map(this::toMessageDTO).collect(Collectors.toList())
                : null;
        return ComplaintDTO.builder()
                .id(c.getId())
                .raisedByUserId(c.getRaisedBy() != null ? c.getRaisedBy().getUserId() : null)
                .raisedByUserName(c.getRaisedBy() != null ? c.getRaisedBy().getUserName() : null)
                .assignedToUserId(c.getAssignedTo() != null ? c.getAssignedTo().getUserId() : null)
                .assignedToUserName(c.getAssignedTo() != null ? c.getAssignedTo().getUserName() : null)
                .relatedUserId(c.getRelatedUser() != null ? c.getRelatedUser().getUserId() : null)
                .relatedUserName(c.getRelatedUser() != null ? c.getRelatedUser().getUserName() : null)
                .propertyId(c.getProperty() != null ? c.getProperty().getId() : null)
                .subject(c.getSubject())
                .description(c.getDescription())
                .status(c.getStatus())
                .priority(c.getPriority())
                .category(c.getCategory())
                .resolutionNote(c.getResolutionNote())
                .resolvedAt(c.getResolvedAt())
                .resolvedByUserId(c.getResolvedBy() != null ? c.getResolvedBy().getUserId() : null)
                .resolvedByUserName(c.getResolvedBy() != null ? c.getResolvedBy().getUserName() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .firstResponseAt(c.getFirstResponseAt())
                .responseDueAt(c.getResponseDueAt())
                .resolutionDueAt(c.getResolutionDueAt())
                .csatScore(c.getCsatScore())
                .messages(messageDtos)
                .build();
    }

    private ComplaintMessageDTO toMessageDTO(ComplaintMessage m) {
        return ComplaintMessageDTO.builder()
                .id(m.getId())
                .complaintId(m.getComplaint().getId())
                .senderId(m.getSender().getUserId())
                .senderUserName(m.getSender().getUserName())
                .messageText(m.isDeleted() ? "" : m.getMessageText())
                .deleted(m.isDeleted())
                .createdAt(m.getCreatedAt())
                .build();
    }
}

