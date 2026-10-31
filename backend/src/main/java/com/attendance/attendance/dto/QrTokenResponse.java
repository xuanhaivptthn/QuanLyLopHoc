package com.attendance.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrTokenResponse {
    private UUID sessionId;
    private String qrToken;
    private Instant expiresAt;
    private long validitySeconds;
}
