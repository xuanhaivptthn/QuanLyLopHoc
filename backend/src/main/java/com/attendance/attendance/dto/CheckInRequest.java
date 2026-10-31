package com.attendance.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckInRequest {

    @NotBlank(message = "QR Token is required")
    private String qrToken;
}
