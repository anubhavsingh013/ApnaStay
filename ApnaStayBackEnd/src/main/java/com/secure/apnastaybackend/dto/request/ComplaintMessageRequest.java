package com.secure.apnastaybackend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintMessageRequest {

    @NotBlank(message = "Message text is required")
    @Size(max = 2000)
    private String messageText;
}

