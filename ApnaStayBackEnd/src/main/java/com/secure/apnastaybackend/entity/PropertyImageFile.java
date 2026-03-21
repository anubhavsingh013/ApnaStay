package com.secure.apnastaybackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "property_image_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PropertyImageFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    /** e.g. image/jpeg */
    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Lob
    @Column(name = "image_data", nullable = false, columnDefinition = "LONGBLOB")
    private byte[] data;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;
}
