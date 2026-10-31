package com.attendance.organization.dto;

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
public class OrganizationResponse {
    private UUID id;
    private String code;
    private String name;
    private String logoUrl;
    private String contactEmail;
    private String contactPhone;
    private String settings;
    private Instant createdAt;
}
