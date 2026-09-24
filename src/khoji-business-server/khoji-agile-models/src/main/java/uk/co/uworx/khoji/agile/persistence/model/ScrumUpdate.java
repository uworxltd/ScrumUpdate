package uk.co.uworx.khoji.agile.persistence.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(
    name = "scrum_updates",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "requested_date")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ScrumUpdate
{
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "scrum_updates_seq")
    @SequenceGenerator(
        name = "scrum_updates_seq",
        sequenceName = "scrum_updates_seq",
        allocationSize = 2
    )
    private Long id;

    @Column(nullable = false)
    private String uniqueIdentifier;

    @Column(name = "requested_date", nullable = false)
    private LocalDate requestedDate;

    @Column(nullable = false)
    private String body;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private KhojiUser user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "instance_user_id", nullable = false)
    private InstanceUser instanceUser;

    @Column(nullable = false)
    private String userName;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    // Lifecycle hooks for timestamps
    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }


}
