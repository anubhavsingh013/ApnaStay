package com.secure.apnastaybackend.dto.request;

import com.secure.apnastaybackend.entity.ComplaintPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintRequest {

    @NotBlank(message = "Subject is required")
    @Size(max = 255)
    private String subject;

    @NotBlank(message = "Description is required")
    @Size(max = 5000)
    private String description;

    private ComplaintPriority priority;

    private Long relatedUserId;

    private Long propertyId;

    private String category;
}

