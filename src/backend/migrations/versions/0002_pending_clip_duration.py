"""store speech duration on pending clips

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade() -> None:
    op.add_column(
        "pending_clips",
        sa.Column("duration_seconds", sa.Float, nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("pending_clips", "duration_seconds")
