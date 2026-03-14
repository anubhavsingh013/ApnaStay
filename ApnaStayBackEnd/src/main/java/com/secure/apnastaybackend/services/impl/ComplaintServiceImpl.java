package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.AssignComplaintRequest;
import com.secure.apnastaybackend.dto.request.ComplaintMessageRequest;
import com.secure.apnastaybackend.dto.request.ComplaintRequest;
import com.secure.apnastaybackend.dto.request.ResolveComplaintRequest;
import com.secure.apnastaybackend.dto.response.ComplaintDTO;
import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.entity.*;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.ComplaintRepository;
import com.secure.apnastaybackend.repositories.PropertyRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.ComplaintService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ComplaintServiceImpl implements ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;

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
        complaint.getMessages().add(msg);
        complaintRepository.save(complaint);
        log.info("Message added to complaint {} by {}", complaintId, userName);
        return toMessageDTO(msg);
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
                .resolutionNote(c.getResolutionNote())
                .resolvedAt(c.getResolvedAt())
                .resolvedByUserId(c.getResolvedBy() != null ? c.getResolvedBy().getUserId() : null)
                .resolvedByUserName(c.getResolvedBy() != null ? c.getResolvedBy().getUserName() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .messages(messageDtos)
                .build();
    }

    private ComplaintMessageDTO toMessageDTO(ComplaintMessage m) {
        return ComplaintMessageDTO.builder()
                .id(m.getId())
                .complaintId(m.getComplaint().getId())
                .senderId(m.getSender().getUserId())
                .senderUserName(m.getSender().getUserName())
                .messageText(m.getMessageText())
                .createdAt(m.getCreatedAt())
                .build();
    }
}

