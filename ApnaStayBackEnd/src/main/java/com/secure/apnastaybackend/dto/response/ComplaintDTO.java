package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.ComplaintPriority;
import com.secure.apnastaybackend.entity.ComplaintStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintDTO {

    private Long id;
    private Long raisedByUserId;
    private String raisedByUserName;
    private Long assignedToUserId;
    private String assignedToUserName;
    private Long relatedUserId;
    private String relatedUserName;
    private Long propertyId;
    private String subject;
    private String description;
    private ComplaintStatus status;
    private ComplaintPriority priority;
    private String category;
    private String resolutionNote;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime resolvedAt;
    private Long resolvedByUserId;
    private String resolvedByUserName;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    private LocalDateTime firstResponseAt;
    private LocalDateTime responseDueAt;
    private LocalDateTime resolutionDueAt;
    private Integer csatScore;

    private List<ComplaintMessageDTO> messages;
}

