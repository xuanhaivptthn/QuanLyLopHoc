package com.attendance.attendance.dto;

import com.attendance.attendance.entity.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateRecordItem {

    @NotNull(message = "Record ID is required")
    private UUID recordId;

    @NotNull(message = "Attendance status is required")
    private AttendanceStatus status;

    private String remarks;
}
