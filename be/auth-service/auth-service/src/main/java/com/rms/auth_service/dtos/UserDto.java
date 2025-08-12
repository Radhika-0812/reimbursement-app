package com.rms.auth_service.dtos;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private String id;
    private String firstName;
    private String lastName;
    private String name;
    private String email;
    private String role;
    private String department;
    private String manager;
    private String contactNo;
    private String address;
    private String pincode;
    private LocalDate dob;
    private LocalDate doj;
}
