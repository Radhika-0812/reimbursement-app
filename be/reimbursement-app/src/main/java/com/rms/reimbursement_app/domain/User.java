package com.rms.reimbursement_app.domain;

import jakarta.persistence.*; import lombok.*;

@Entity @Table(name="users")
@Getter @Setter
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true, length=190) private String email;
    @Column(nullable=false, length=100) private String passwordHash;
    @Column(nullable=false, length=30) private String role; // ROLE_USER / ROLE_ADMIN
}