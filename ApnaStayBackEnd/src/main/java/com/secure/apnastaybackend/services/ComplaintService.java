package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.AssignComplaintRequest;
import com.secure.apnastaybackend.dto.request.ComplaintMessageRequest;
import com.secure.apnastaybackend.dto.request.ComplaintRequest;
import com.secure.apnastaybackend.dto.request.ResolveComplaintRequest;
import com.secure.apnastaybackend.dto.response.ComplaintDTO;
import com.secure.apnastaybackend.dto.response.ComplaintMessageDTO;
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
}

