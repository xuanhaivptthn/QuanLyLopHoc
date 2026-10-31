package com.attendance.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterCenterRequest {

    // Center Details
    @NotBlank(message = "Center name is required")
    @Size(max = 255, message = "Center name cannot exceed 255 characters")
    private String centerName;

    @NotBlank(message = "Center code/slug is required")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Center code must be alphanumeric with hyphens (e.g. 'ielts-fighter')")
    @Size(min = 3, max = 50, message = "Center code must be between 3 and 50 characters")
    private String centerCode;

    private String contactEmail;
    private String contactPhone;

    // Administrator User Details
    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid email format")
    private String adminEmail;

    @NotBlank(message = "Admin password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String adminPassword;

    @NotBlank(message = "Admin full name is required")
    @Size(max = 150, message = "Admin full name cannot exceed 150 characters")
    private String adminFullName;
}
