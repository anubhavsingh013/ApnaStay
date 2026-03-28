package com.secure.apnastaybackend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RentalApplicationTimelineEventDTO {
    private String stage;
    private LocalDateTime occurredAt;
}
