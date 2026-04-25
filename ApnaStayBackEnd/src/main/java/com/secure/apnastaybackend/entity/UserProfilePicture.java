package com.secure.apnastaybackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_profile_pictures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserProfilePicture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Lob
    @Column(name = "image_data", nullable = false, columnDefinition = "LONGBLOB")
    private byte[] data;
}
