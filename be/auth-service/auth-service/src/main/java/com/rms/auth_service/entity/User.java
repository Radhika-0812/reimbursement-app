package com.rms.auth_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity @Table(name = "users")
@Getter @Setter
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String firstName;
    private String lastName;
    private LocalDate dob;
    private LocalDate doj;
    private String department;
    private String manager;
    private String role;
    private String contactNo;
    private String address;
    private String pincode;

    @Column(unique = true)
    private String email;

    private String passwordHash;
}
