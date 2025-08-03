"""Create admin tables

Revision ID: 1234abcd5678
Revises: 
Create Date: 2023-06-23 14:25:32.652952

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '1234abcd5678'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(), nullable=False, unique=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_admin', sa.Boolean(), default=False),
        sa.Column('api_calls_count', sa.Integer(), default=0),
        sa.Column('data_entries_count', sa.Integer(), default=0)
    )
    
    # Create user_system_usage table
    op.create_table(
        'user_system_usage',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('data_size', sa.Integer(), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('is_error', sa.Boolean(), default=False),
        sa.Column('error_message', sa.Text(), nullable=True)
    )
    
    # Add foreign key to existing tables if they exist
    # First check if sentiment_data table exists
    try:
        op.execute("SELECT 1 FROM sentiment_data LIMIT 1")
        # Add foreign key to sentiment_data
        op.alter_column('sentiment_data', 'user_id', 
                        existing_type=UUID(as_uuid=True), 
                        nullable=True)
        op.create_foreign_key(
            'fk_sentiment_data_user',
            'sentiment_data', 'users',
            ['user_id'], ['id']
        )
    except:
        # Table doesn't exist or some other error, skip this part
        pass
    
    # Check if email_configurations table exists
    try:
        op.execute("SELECT 1 FROM email_configurations LIMIT 1")
        # Add foreign key to email_configurations
        op.alter_column('email_configurations', 'user_id', 
                        existing_type=UUID(as_uuid=True), 
                        nullable=True)
        op.create_foreign_key(
            'fk_email_configurations_user',
            'email_configurations', 'users',
            ['user_id'], ['id']
        )
    except:
        # Table doesn't exist or some other error, skip this part
        pass
    
    # Check if target_individual_configurations table exists
    try:
        op.execute("SELECT 1 FROM target_individual_configurations LIMIT 1")
        # Add foreign key to target_individual_configurations
        op.alter_column('target_individual_configurations', 'user_id', 
                        existing_type=UUID(as_uuid=True), 
                        nullable=True)
        op.create_foreign_key(
            'fk_target_configurations_user',
            'target_individual_configurations', 'users',
            ['user_id'], ['id']
        )
    except:
        # Table doesn't exist or some other error, skip this part
        pass


def downgrade() -> None:
    # Remove foreign keys first
    # Drop foreign key from sentiment_data if it exists
    try:
        op.drop_constraint('fk_sentiment_data_user', 'sentiment_data', type_='foreignkey')
    except:
        pass
    
    # Drop foreign key from email_configurations if it exists
    try:
        op.drop_constraint('fk_email_configurations_user', 'email_configurations', type_='foreignkey')
    except:
        pass
    
    # Drop foreign key from target_individual_configurations if it exists
    try:
        op.drop_constraint('fk_target_configurations_user', 'target_individual_configurations', type_='foreignkey')
    except:
        pass
    
    # Drop tables
    op.drop_table('user_system_usage')
    op.drop_table('users') 