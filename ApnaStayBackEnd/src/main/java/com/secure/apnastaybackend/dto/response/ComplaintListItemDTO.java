package com.secure.apnastaybackend.dto.response;

import com.secure.apnastaybackend.entity.ComplaintPriority;
import com.secure.apnastaybackend.entity.ComplaintStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintListItemDTO {

    private Long id;
    private String subject;
    private ComplaintStatus status;
    private ComplaintPriority priority;
    private String raisedByUserName;
    private String assignedToUserName;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
}

