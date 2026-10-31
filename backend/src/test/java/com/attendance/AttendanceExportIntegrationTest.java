package com.attendance;

import com.attendance.attendance.dto.ClassroomAttendanceSummaryResponse;
import com.attendance.attendance.dto.CreateSessionRequest;
import com.attendance.attendance.dto.SessionResponse;
import com.attendance.auth.dto.AuthResponse;
import com.attendance.auth.dto.RegisterSoloTeacherRequest;
import com.attendance.classroom.dto.ClassroomResponse;
import com.attendance.classroom.dto.CreateClassroomRequest;
import com.attendance.classroom.dto.EnrollStudentRequest;
import com.attendance.common.util.CsvSanitizer;
import com.attendance.student.dto.CreateStudentRequest;
import com.attendance.student.dto.StudentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class AttendanceExportIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @Test
    @DisplayName("Should export classroom attendance report as JSON and CSV with UTF-8 BOM and formula sanitization")
    void shouldExportClassroomAttendanceReport() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 6);

        // 1. Register teacher
        RegisterSoloTeacherRequest teacherReq = new RegisterSoloTeacherRequest();
        teacherReq.setEmail("export_teacher_" + suffix + "@example.com");
        teacherReq.setPassword("Password123!");
        teacherReq.setFullName("Cô Lan Anh");

        MvcResult regResult = mockMvc.perform(post("/auth/register-teacher")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(teacherReq)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(regResult.getResponse().getContentAsString(), AuthResponse.class);
        String bearerToken = "Bearer " + auth.getToken();

        // 2. Create classroom
        CreateClassroomRequest classReq = new CreateClassroomRequest();
        classReq.setCode("BIO-" + suffix.toUpperCase());
        classReq.setName("Sinh Học Phân Tử");
        classReq.setSemester("2024.2");

        MvcResult classResult = mockMvc.perform(post("/classrooms")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(classReq)))
                .andExpect(status().isCreated())
                .andReturn();

        ClassroomResponse classroom = objectMapper.readValue(classResult.getResponse().getContentAsString(), ClassroomResponse.class);

        // 3. Create student with formula-like student code to test CSV sanitization
        CreateStudentRequest studentReq = new CreateStudentRequest();
        studentReq.setStudentCode("=SV" + suffix.toUpperCase()); // potentially dangerous CSV prefix
        studentReq.setFullName("Trần Văn Bảo");
        studentReq.setEmail("bao_" + suffix + "@example.com");

        MvcResult studentResult = mockMvc.perform(post("/students")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(studentReq)))
                .andExpect(status().isCreated())
                .andReturn();

        StudentResponse student = objectMapper.readValue(studentResult.getResponse().getContentAsString(), StudentResponse.class);

        // 4. Enroll student
        EnrollStudentRequest enrollReq = new EnrollStudentRequest();
        enrollReq.setStudentId(student.getId());

        mockMvc.perform(post("/classrooms/" + classroom.getId() + "/students")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrollReq)))
                .andExpect(status().isCreated());

        // 5. Create attendance session
        CreateSessionRequest sessReq = new CreateSessionRequest();
        sessReq.setSessionDate(LocalDate.now());
        sessReq.setStartTime(LocalTime.of(8, 0));
        sessReq.setEndTime(LocalTime.of(10, 0));

        MvcResult sessResult = mockMvc.perform(post("/classrooms/" + classroom.getId() + "/sessions")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sessReq)))
                .andExpect(status().isCreated())
                .andReturn();

        SessionResponse session = objectMapper.readValue(sessResult.getResponse().getContentAsString(), SessionResponse.class);

        // 6. Test JSON attendance report endpoint
        MvcResult reportResult = mockMvc.perform(get("/classrooms/" + classroom.getId() + "/attendance/report")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andReturn();

        ClassroomAttendanceSummaryResponse summary = objectMapper.readValue(
                reportResult.getResponse().getContentAsString(), ClassroomAttendanceSummaryResponse.class);

        assertThat(summary.getClassroomCode()).isEqualTo(classroom.getCode());
        assertThat(summary.getTotalSessions()).isEqualTo(1);
        assertThat(summary.getTotalEnrolledStudents()).isEqualTo(1);
        assertThat(summary.getStudentStats()).hasSize(1);
        assertThat(summary.getStudentStats().get(0).getAbsentCount()).isEqualTo(1);

        // 7. Test CSV export endpoint for classroom
        MvcResult csvResult = mockMvc.perform(get("/classrooms/" + classroom.getId() + "/attendance/export")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv; charset=UTF-8"))
                .andReturn();

        byte[] csvBytes = csvResult.getResponse().getContentAsByteArray();
        String csvContent = new String(csvBytes, StandardCharsets.UTF_8);

        // Verify UTF-8 BOM is present
        assertThat(csvContent).startsWith(CsvSanitizer.UTF8_BOM);
        assertThat(csvContent).contains("BÁO CÁO ĐIỂM DANH LỚP HỌC");
        assertThat(csvContent).contains("Trần Văn Bảo");
        // Verify formula prefix was safely sanitized with single quote
        assertThat(csvContent).contains("\"'=SV" + suffix.toUpperCase() + "\"");

        // 8. Test CSV export endpoint for single session
        MvcResult sessionCsvResult = mockMvc.perform(get("/sessions/" + session.getId() + "/attendance/export")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv; charset=UTF-8"))
                .andReturn();

        String sessionCsvContent = new String(sessionCsvResult.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat(sessionCsvContent).startsWith(CsvSanitizer.UTF8_BOM);
        assertThat(sessionCsvContent).contains("DANH SÁCH ĐIỂM DANH BUỔI HỌC");
        assertThat(sessionCsvContent).contains("Vắng mặt");
    }

    @Test
    @DisplayName("Should include security headers on HTTP responses")
    void shouldIncludeSecurityHeaders() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }
}
