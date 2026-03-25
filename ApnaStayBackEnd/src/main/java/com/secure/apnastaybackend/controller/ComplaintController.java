package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.dto.request.AssignComplaintRequest;
import com.secure.apnastaybackend.dto.request.ComplaintMarkReadRequest;
import com.secure.apnastaybackend.dto.request.ComplaintMessageRequest;
import com.secure.apnastaybackend.dto.request.ComplaintRequest;
import com.secure.apnastaybackend.dto.request.ResolveComplaintRequest;
import com.secure.apnastaybackend.dto.response.ApiResponse;
import com.secure.apnastaybackend.dto.response.ComplaintDTO;
import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.dto.response.ComplaintReadReceiptDTO;
import com.secure.apnastaybackend.entity.ComplaintStatus;
import com.secure.apnastaybackend.services.ComplaintService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@Slf4j
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;

    @PostMapping
    public ResponseEntity<ApiResponse<ComplaintDTO>> raiseComplaint(
            @Valid @RequestBody ComplaintRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ComplaintDTO dto = complaintService.raiseComplaint(username, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Complaint raised successfully", dto)
        );
    }

    /** Admin: all complaints. Owner/User: only their relevant complaints (raised by, assigned to, or related). Full details. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ComplaintDTO>>> listComplaints(
            @RequestParam(required = false) ComplaintStatus status,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        List<ComplaintDTO> list = complaintService.listComplaints(username, status);
        return ResponseEntity.ok(ApiResponse.success("Complaints retrieved successfully", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ComplaintDTO>> getComplaint(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ComplaintDTO dto = complaintService.getComplaintById(username, id);
        return ResponseEntity.ok(ApiResponse.success("Complaint retrieved successfully", dto));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<ComplaintDTO>> resolveComplaint(
            @PathVariable Long id,
            @RequestBody(required = false) ResolveComplaintRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ResolveComplaintRequest body = request != null ? request : new ResolveComplaintRequest();
        ComplaintDTO dto = complaintService.resolveComplaint(username, id, body);
        return ResponseEntity.ok(ApiResponse.success("Complaint resolved successfully", dto));
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<ApiResponse<ComplaintDTO>> assignComplaint(
            @PathVariable Long id,
            @RequestBody AssignComplaintRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ComplaintDTO dto = complaintService.assignComplaint(username, id, request);
        return ResponseEntity.ok(ApiResponse.success("Complaint assigned successfully", dto));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ComplaintDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam ComplaintStatus status,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ComplaintDTO dto = complaintService.updateStatus(username, id, status);
        return ResponseEntity.ok(ApiResponse.success("Complaint status updated successfully", dto));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<ComplaintMessageDTO>> addMessage(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ComplaintMessageDTO dto = complaintService.addMessage(username, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.success("Message sent successfully", dto)
        );
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<ComplaintMessageDTO>>> getMessages(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        List<ComplaintMessageDTO> messages = complaintService.getMessages(username, id);
        return ResponseEntity.ok(ApiResponse.success("Messages retrieved successfully", messages));
    }

    @DeleteMapping("/{id}/messages/{messageId}")
    public ResponseEntity<ApiResponse<ComplaintMessageDTO>> deleteMessage(
            @PathVariable Long id,
            @PathVariable Long messageId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        ComplaintMessageDTO dto = complaintService.deleteMessage(username, id, messageId);
        return ResponseEntity.ok(ApiResponse.success("Message removed", dto));
    }

    @GetMapping("/{id}/read-receipts")
    public ResponseEntity<ApiResponse<List<ComplaintReadReceiptDTO>>> getReadReceipts(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        List<ComplaintReadReceiptDTO> list = complaintService.getThreadReadReceipts(username, id);
        return ResponseEntity.ok(ApiResponse.success("Read receipts retrieved successfully", list));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<String>> markThreadRead(
            @PathVariable Long id,
            @Valid @RequestBody ComplaintMarkReadRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails.getUsername();
        complaintService.markThreadRead(username, id, request.getLastReadMessageId());
        return ResponseEntity.ok(ApiResponse.success("Read position updated", "ok"));
    }
}

