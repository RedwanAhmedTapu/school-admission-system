-- 001_init: classes + admission_holds
-- Seat counts are NEVER stored. heldSeats / confirmedSeats are always derived from
-- admission_holds rows, so they cannot drift from the real reservations.

CREATE TABLE classes (
    id          text         PRIMARY KEY,
    name        varchar(120) NOT NULL,
    total_seats integer      NOT NULL,
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    CONSTRAINT ck_classes_total_seats_positive CHECK (total_seats > 0),
    CONSTRAINT ck_classes_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE TABLE admission_holds (
    id           text        PRIMARY KEY,
    class_id     text        NOT NULL REFERENCES classes (id),
    student_id   varchar(17) NOT NULL,
    status       varchar(16) NOT NULL,
    created_at   timestamptz NOT NULL,
    expires_at   timestamptz NOT NULL,
    confirmed_at timestamptz NULL,
    cancelled_at timestamptz NULL,
    CONSTRAINT ck_holds_status CHECK (status IN ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED')),
    CONSTRAINT ck_holds_student_id CHECK (student_id ~ '^[0-9]+$' AND length(student_id) = 17),
    CONSTRAINT ck_holds_expiry_after_creation CHECK (expires_at > created_at)
);

-- One student can have at most one live (HELD or CONFIRMED) record per class.
-- This is the database-level guard against simultaneous duplicate applications.
CREATE UNIQUE INDEX ux_holds_one_active_per_student_class
    ON admission_holds (class_id, student_id)
    WHERE status IN ('HELD', 'CONFIRMED');

CREATE INDEX ix_holds_class_status ON admission_holds (class_id, status);
CREATE INDEX ix_holds_student ON admission_holds (student_id, created_at DESC);
CREATE INDEX ix_holds_held_expiry ON admission_holds (expires_at) WHERE status = 'HELD';
