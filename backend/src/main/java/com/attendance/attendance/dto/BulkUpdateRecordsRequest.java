package com.attendance.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkUpdateRecordsRequest {

    @NotEmpty(message = "Record list cannot be empty")
    @Valid
    private List<UpdateRecordItem> records;
}
