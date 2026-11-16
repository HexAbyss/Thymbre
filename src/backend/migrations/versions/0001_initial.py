"""initial schema

Revision ID: 0001
Revises:
"""

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import UUID

revision = "0001"
down_revision = None

DIM = 192
UUID_PK = {"primary_key": True, "server_default": sa.text("gen_random_uuid()")}


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "speakers",
        sa.Column("id", UUID(as_uuid=True), **UUID_PK),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("centroid", Vector(DIM)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_speakers_centroid_cosine",
        "speakers",
        ["centroid"],
        postgresql_using="hnsw",
        postgresql_ops={"centroid": "vector_cosine_ops"},
    )

    op.create_table(
        "voice_samples",
        sa.Column("id", UUID(as_uuid=True), **UUID_PK),
        sa.Column(
            "speaker_id",
            UUID(as_uuid=True),
            sa.ForeignKey("speakers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("embedding", Vector(DIM), nullable=False),
        sa.Column("duration_seconds", sa.Float, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_voice_samples_speaker_id", "voice_samples", ["speaker_id"])

    op.create_table(
        "pending_clips",
        sa.Column("id", UUID(as_uuid=True), **UUID_PK),
        sa.Column("embedding", Vector(DIM), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_pending_clips_expires_at", "pending_clips", ["expires_at"])


def downgrade() -> None:
    op.drop_table("pending_clips")
    op.drop_table("voice_samples")
    op.drop_table("speakers")
