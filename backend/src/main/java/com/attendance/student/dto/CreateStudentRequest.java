package com.attendance.student.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateStudentRequest {

    @NotBlank(message = "Student code is required")
    @Size(max = 50, message = "Student code cannot exceed 50 characters")
    private String studentCode;

    @NotBlank(message = "Full name is required")
    @Size(max = 150, message = "Full name cannot exceed 150 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Size(max = 30, message = "Phone number cannot exceed 30 characters")
    private String phone;

    private String avatarUrl;
}
