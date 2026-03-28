package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.AssignComplaintRequest;
import com.secure.apnastaybackend.dto.request.ComplaintMessageRequest;
import com.secure.apnastaybackend.dto.request.ComplaintRequest;
import com.secure.apnastaybackend.dto.request.ResolveComplaintRequest;
import com.secure.apnastaybackend.dto.response.ComplaintDTO;
import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
import com.secure.apnastaybackend.dto.response.ComplaintReadReceiptDTO;
import com.secure.apnastaybackend.entity.ComplaintStatus;

import java.util.List;

public interface ComplaintService {

    ComplaintDTO raiseComplaint(String userName, ComplaintRequest request);

    /** Admin: all complaints. Owner/User: only complaints where they are raisedBy, assignedTo, or relatedUser. Full details. */
    List<ComplaintDTO> listComplaints(String userName, ComplaintStatus statusFilter);

    ComplaintDTO getComplaintById(String userName, Long id);

    ComplaintDTO resolveComplaint(String userName, Long id, ResolveComplaintRequest request);

    ComplaintDTO assignComplaint(String userName, Long id, AssignComplaintRequest request);

    ComplaintDTO updateStatus(String userName, Long id, ComplaintStatus status);

    ComplaintMessageDTO addMessage(String userName, Long complaintId, ComplaintMessageRequest request);

    List<ComplaintMessageDTO> getMessages(String userName, Long complaintId);

    ComplaintMessageDTO deleteMessage(String userName, Long complaintId, Long messageId);

    /** Persist read cursor and broadcast {@code complaint:readReceipt} to the room. */
    void markThreadRead(String userName, Long complaintId, Long lastReadMessageId);

    List<ComplaintReadReceiptDTO> getThreadReadReceipts(String userName, Long complaintId);

    /** Used by Socket.IO to authorize joining a complaint room without loading full messages. */
    boolean canUserAccessComplaint(String userName, Long complaintId);

    ComplaintDTO submitCsat(String userName, Long complaintId, Integer score);

    int runSlaEscalationCycle();

}

