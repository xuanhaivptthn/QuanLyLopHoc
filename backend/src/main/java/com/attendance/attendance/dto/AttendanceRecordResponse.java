package com.attendance.attendance.dto;

import com.attendance.attendance.entity.AttendanceStatus;
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
public class AttendanceRecordResponse {
    private UUID id;
    private UUID sessionId;
    private UUID studentId;
    private String studentCode;
    private String studentName;
    private AttendanceStatus status;
    private Instant checkInTime;
    private String remarks;
    private Instant updatedAt;
}
