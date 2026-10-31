package com.attendance.classroom.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateClassroomRequest {

    @NotBlank(message = "Classroom code is required")
    @Size(max = 50, message = "Code cannot exceed 50 characters")
    private String code;

    @NotBlank(message = "Classroom name is required")
    @Size(max = 200, message = "Name cannot exceed 200 characters")
    private String name;

    @NotBlank(message = "Semester is required")
    @Size(max = 50, message = "Semester cannot exceed 50 characters")
    private String semester;

    private UUID teacherId;
}
