"""001_initial_schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-10-14 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    # Businesses
    op.create_table(
        'businesses',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('currency', sa.String(3), default='INR', nullable=False),
        sa.Column('opening_cash_paise', sa.BigInteger(), default=1000000, nullable=False),
        sa.Column('safety_threshold_paise', sa.BigInteger(), default=500000, nullable=False),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('owner_name', sa.String(255), nullable=True),
        sa.Column('owner_email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('tax_rate_percent', sa.Integer(), default=18, nullable=False),
        sa.Column('default_supplier_payment_terms_days', sa.Integer(), default=30, nullable=False),
        sa.Column('default_customer_payment_terms_days', sa.Integer(), default=15, nullable=False),
        sa.Column('default_forecast_horizon_days', sa.Integer(), default=30, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    # Business Memberships
    op.create_table(
        'business_memberships',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('role', sa.String(50), default='owner', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    # Suppliers
    op.create_table(
        'suppliers',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('name', sa.String(255), index=True, nullable=False),
        sa.Column('contact_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('tax_id', sa.String(100), nullable=True),
        sa.Column('payment_terms_days', sa.Integer(), default=30, nullable=False),
        sa.Column('outstanding_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('reliability_score', sa.Integer(), default=80, nullable=False),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('lead_time_days', sa.Integer(), default=7, nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Customers
    op.create_table(
        'customers',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('name', sa.String(255), index=True, nullable=False),
        sa.Column('contact_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('tax_id', sa.String(100), nullable=True),
        sa.Column('credit_terms_days', sa.Integer(), default=15, nullable=False),
        sa.Column('outstanding_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Products
    op.create_table(
        'products',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('sku', sa.String(100), index=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('unit_cost_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('unit_price_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('reorder_point', sa.Integer(), default=10, nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('unit_of_measure', sa.String(50), nullable=True),
        sa.Column('preferred_supplier_id', sa.String(64), sa.ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('currency', sa.String(3), default='INR', nullable=False),
        sa.Column('created_at', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Inventory Items
    op.create_table(
        'inventory_items',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('product_id', sa.String(64), sa.ForeignKey('products.id', ondelete='CASCADE'), unique=True, index=True, nullable=False),
        sa.Column('quantity_on_hand', sa.Integer(), default=0, nullable=False),
        sa.Column('quantity_reserved', sa.Integer(), default=0, nullable=False),
        sa.Column('quantity_on_order', sa.Integer(), default=0, nullable=False),
        sa.Column('expected_restock_date', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Inventory Movements
    op.create_table(
        'inventory_movements',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('product_id', sa.String(64), sa.ForeignKey('products.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('resulting_balance', sa.Integer(), nullable=False),
        sa.Column('date', sa.String(50), nullable=False),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.String(100), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
    )

    # Purchase Orders
    op.create_table(
        'purchase_orders',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('po_number', sa.String(100), index=True, nullable=True),
        sa.Column('supplier_id', sa.String(64), sa.ForeignKey('suppliers.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('product_id', sa.String(64), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('total_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('advance_paid_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('status', sa.String(50), default='draft', nullable=False),
        sa.Column('order_date', sa.String(50), nullable=False),
        sa.Column('expected_delivery_date', sa.String(50), nullable=False),
        sa.Column('payment_terms_days', sa.Integer(), nullable=True),
        sa.Column('payment_due_date', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('received_quantity', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Purchase Order Line Items
    op.create_table(
        'purchase_order_line_items',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('purchase_order_id', sa.String(64), sa.ForeignKey('purchase_orders.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('product_id', sa.String(64), sa.ForeignKey('products.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price_paise', sa.BigInteger(), nullable=False),
        sa.Column('total_paise', sa.BigInteger(), nullable=False),
        sa.Column('received_quantity', sa.Integer(), default=0, nullable=False),
    )

    # Customer Orders
    op.create_table(
        'customer_orders',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('customer_id', sa.String(64), sa.ForeignKey('customers.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('product_id', sa.String(64), sa.ForeignKey('products.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('total_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('status', sa.String(50), default='quote', nullable=False),
        sa.Column('order_date', sa.String(50), nullable=False),
        sa.Column('delivery_date', sa.String(50), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Invoices
    op.create_table(
        'invoices',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('invoice_number', sa.String(100), index=True, nullable=False),
        sa.Column('type', sa.String(20), default='receivable', nullable=False),
        sa.Column('customer_id', sa.String(64), sa.ForeignKey('customers.id', ondelete='SET NULL'), index=True, nullable=True),
        sa.Column('customer_order_id', sa.String(64), sa.ForeignKey('customer_orders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('supplier_id', sa.String(64), sa.ForeignKey('suppliers.id', ondelete='SET NULL'), index=True, nullable=True),
        sa.Column('purchase_order_id', sa.String(64), sa.ForeignKey('purchase_orders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('amount_paid_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('status', sa.String(50), default='sent', nullable=False),
        sa.Column('issue_date', sa.String(50), nullable=False),
        sa.Column('due_date', sa.String(50), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

    # Payments
    op.create_table(
        'payments',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('direction', sa.String(20), nullable=False),
        sa.Column('invoice_id', sa.String(64), sa.ForeignKey('invoices.id', ondelete='SET NULL'), index=True, nullable=True),
        sa.Column('purchase_order_id', sa.String(64), sa.ForeignKey('purchase_orders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('supplier_id', sa.String(64), sa.ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('customer_id', sa.String(64), sa.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('status', sa.String(50), default='completed', nullable=False),
        sa.Column('scheduled_date', sa.String(50), nullable=False),
        sa.Column('completed_date', sa.String(50), nullable=True),
        sa.Column('method', sa.String(100), default='Bank Transfer', nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
    )

    # Cash Flow Events
    op.create_table(
        'cash_flow_events',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('direction', sa.String(20), nullable=False),
        sa.Column('amount_paise', sa.BigInteger(), default=0, nullable=False),
        sa.Column('date', sa.String(50), index=True, nullable=False),
        sa.Column('related_invoice_id', sa.String(64), nullable=True),
        sa.Column('related_purchase_order_id', sa.String(64), nullable=True),
        sa.Column('is_projected', sa.Boolean(), default=False, nullable=False),
        sa.Column('counterparty_name', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), default='completed', nullable=False),
        sa.Column('risk_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
    )

    # Simulation Scenarios
    op.create_table(
        'simulation_scenarios',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('target_event_id', sa.String(64), nullable=True),
        sa.Column('change_type', sa.String(50), nullable=True),
        sa.Column('change_magnitude', sa.Float(), nullable=True),
        sa.Column('controls_json', sa.Text(), nullable=True),
        sa.Column('result_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.String(50), nullable=True),
    )

    # Dependency Edges
    op.create_table(
        'dependency_edges',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), index=True, nullable=False),
        sa.Column('source_id', sa.String(64), nullable=False),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('target_id', sa.String(64), nullable=False),
        sa.Column('target_type', sa.String(50), nullable=False),
        sa.Column('label', sa.String(255), nullable=False),
        sa.Column('lag_days', sa.Integer(), default=0, nullable=False),
    )

    # App Settings
    op.create_table(
        'app_settings',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('business_id', sa.String(64), sa.ForeignKey('businesses.id', ondelete='CASCADE'), unique=True, index=True, nullable=False),
        sa.Column('notification_preferences_json', sa.Text(), nullable=True),
        sa.Column('app_preferences_json', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.String(50), nullable=True),
    )

def downgrade() -> None:
    op.drop_table('app_settings')
    op.drop_table('dependency_edges')
    op.drop_table('simulation_scenarios')
    op.drop_table('cash_flow_events')
    op.drop_table('payments')
    op.drop_table('invoices')
    op.drop_table('customer_orders')
    op.drop_table('purchase_order_line_items')
    op.drop_table('purchase_orders')
    op.drop_table('inventory_movements')
    op.drop_table('inventory_items')
    op.drop_table('products')
    op.drop_table('customers')
    op.drop_table('suppliers')
    op.drop_table('business_memberships')
    op.drop_table('businesses')
    op.drop_table('users')
