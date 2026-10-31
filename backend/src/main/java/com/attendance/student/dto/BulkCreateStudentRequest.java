package com.attendance.student.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateStudentRequest {

    @NotEmpty(message = "Danh sách sinh viên không được để trống")
    private List<@Valid CreateStudentRequest> students;
}
