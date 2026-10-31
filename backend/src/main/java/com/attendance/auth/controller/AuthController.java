package com.attendance.auth.controller;

import com.attendance.auth.dto.*;
import com.attendance.auth.service.AuthService;
import com.attendance.common.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication & Onboarding", description = "Endpoints for login, solo teacher registration, center onboarding and invitation acceptance")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token", security = {})
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register-teacher")
    @Operation(summary = "Register an independent/solo teacher account", security = {})
    public ResponseEntity<AuthResponse> registerSoloTeacher(@Valid @RequestBody RegisterSoloTeacherRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerSoloTeacher(request));
    }

    @PostMapping("/register-center")
    @Operation(summary = "Register a teaching center/school with an administrator account", security = {})
    public ResponseEntity<AuthResponse> registerCenter(@Valid @RequestBody RegisterCenterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registerCenter(request));
    }

    @PostMapping("/accept-invite")
    @Operation(summary = "Accept center teacher invitation and activate account", security = {})
    public ResponseEntity<AuthResponse> acceptInvitation(@Valid @RequestBody AcceptInviteRequest request) {
        return ResponseEntity.ok(authService.acceptInvitation(request));
    }

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated user profile", security = @SecurityRequirement(name = "BearerAuth"))
    public ResponseEntity<UserSummaryResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            throw new com.attendance.common.exception.UnauthorizedException("User is not authenticated");
        }
        return ResponseEntity.ok(authService.getCurrentUser(principal));
    }
}
