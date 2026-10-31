package com.attendance.student.service;

import com.attendance.common.exception.BadRequestException;
import com.attendance.common.exception.ForbiddenException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.UserPrincipal;
import com.attendance.organization.entity.Organization;
import com.attendance.organization.repository.OrganizationRepository;
import com.attendance.student.dto.CreateStudentRequest;
import com.attendance.student.dto.StudentResponse;
import com.attendance.student.entity.Student;
import com.attendance.student.repository.StudentRepository;
import com.attendance.user.entity.Role;
import com.attendance.user.entity.User;
import com.attendance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public StudentResponse createStudent(UserPrincipal principal, CreateStudentRequest request) {
        String studentCode = request.getStudentCode().trim().toUpperCase();
        String email = request.getEmail().trim().toLowerCase();

        Organization org = null;
        User ownerTeacher = null;

        if (principal.getActiveOrganizationId() != null) {
            org = organizationRepository.findById(principal.getActiveOrganizationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", principal.getActiveOrganizationId()));

            if (studentRepository.existsByOrganizationIdAndStudentCode(org.getId(), studentCode)) {
                throw new BadRequestException("Student code '" + studentCode + "' already exists in this center.");
            }
        } else {
            ownerTeacher = userRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));

            if (studentRepository.existsByOwnerTeacherIdAndOrganizationIsNullAndStudentCode(ownerTeacher.getId(), studentCode)) {
                throw new BadRequestException("Student code '" + studentCode + "' already exists in your roster.");
            }
        }

        User studentUser = userRepository.findByEmail(email).orElse(null);

        Student student = Student.builder()
                .studentCode(studentCode)
                .fullName(request.getFullName().trim())
                .email(email)
                .phone(request.getPhone() != null ? request.getPhone().trim() : null)
                .avatarUrl(request.getAvatarUrl())
                .organization(org)
                .ownerTeacher(ownerTeacher)
                .user(studentUser)
                .build();

        student = studentRepository.save(student);
        log.info("Student {} created by user {}", student.getStudentCode(), principal.getEmail());

        return mapToResponse(student);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getStudents(UserPrincipal principal) {
        List<Student> students;

        if (principal.getActiveOrganizationId() != null) {
            students = studentRepository.findAllByOrganizationId(principal.getActiveOrganizationId());
        } else {
            students = studentRepository.findAllByOwnerTeacherIdAndOrganizationIsNull(principal.getId());
        }

        return students.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudentById(UserPrincipal principal, UUID id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", id));

        assertAccess(principal, student);

        return mapToResponse(student);
    }

    private void assertAccess(UserPrincipal principal, Student student) {
        if (principal.getRole() == Role.SUPER_ADMIN) {
            return;
        }

        if (student.getOrganization() != null) {
            if (student.getOrganization().getId().equals(principal.getActiveOrganizationId())) {
                return;
            }
        } else if (student.getOwnerTeacher() != null) {
            if (student.getOwnerTeacher().getId().equals(principal.getId())) {
                return;
            }
        }

        throw new ForbiddenException("You do not have access to this student profile.");
    }

    private StudentResponse mapToResponse(Student student) {
        return StudentResponse.builder()
                .id(student.getId())
                .studentCode(student.getStudentCode())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .phone(student.getPhone())
                .avatarUrl(student.getAvatarUrl())
                .organizationId(student.getOrganization() != null ? student.getOrganization().getId() : null)
                .ownerTeacherId(student.getOwnerTeacher() != null ? student.getOwnerTeacher().getId() : null)
                .userId(student.getUser() != null ? student.getUser().getId() : null)
                .createdAt(student.getCreatedAt())
                .build();
    }
}
