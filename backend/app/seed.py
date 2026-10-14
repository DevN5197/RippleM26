import json
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.business import Business, BusinessMembership
from app.models.supplier import Supplier
from app.models.customer import Customer
from app.models.product import Product
from app.models.inventory import InventoryItem, InventoryMovement
from app.models.order import PurchaseOrder, PurchaseOrderLineItem, CustomerOrder
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.cash_flow import CashFlowEvent
from app.models.simulation import SimulationScenario, DependencyEdge
from app.models.settings import AppSettingsModel
from app.services.auth import hash_password
from app.services.financial import to_iso_date

def seed_rupi_clothing(db: Session, overwrite: bool = False):
    today = date.today()
    d = lambda offset: to_iso_date(today + timedelta(days=offset))
    dp = lambda offset: to_iso_date(today - timedelta(days=offset))

    # Check if biz_1 already exists
    existing_biz = db.query(Business).filter(Business.id == "biz_1").first()
    if existing_biz:
        if not overwrite:
            print("Demo business biz_1 already exists, skipping seed.")
            return
        # Delete existing data for biz_1
        print("Resetting demo business biz_1...")
        db.query(CashFlowEvent).filter(CashFlowEvent.business_id == "biz_1").delete()
        db.query(Payment).filter(Payment.business_id == "biz_1").delete()
        db.query(Invoice).filter(Invoice.business_id == "biz_1").delete()
        db.query(CustomerOrder).filter(CustomerOrder.business_id == "biz_1").delete()
        db.query(PurchaseOrderLineItem).filter(
            PurchaseOrderLineItem.purchase_order_id.in_(
                db.query(PurchaseOrder.id).filter(PurchaseOrder.business_id == "biz_1")
            )
        ).delete(synchronize_session=False)
        db.query(PurchaseOrder).filter(PurchaseOrder.business_id == "biz_1").delete()
        db.query(InventoryMovement).filter(InventoryMovement.business_id == "biz_1").delete()
        db.query(InventoryItem).filter(InventoryItem.business_id == "biz_1").delete()
        db.query(Product).filter(Product.business_id == "biz_1").delete()
        db.query(Customer).filter(Customer.business_id == "biz_1").delete()
        db.query(Supplier).filter(Supplier.business_id == "biz_1").delete()
        db.query(SimulationScenario).filter(SimulationScenario.business_id == "biz_1").delete()
        db.query(DependencyEdge).filter(DependencyEdge.business_id == "biz_1").delete()
        db.query(AppSettingsModel).filter(AppSettingsModel.business_id == "biz_1").delete()
        db.flush()

    # 1. User
    user = db.query(User).filter(User.email == "owner@rupiclothing.in").first()
    if not user:
        user = User(
            id="usr_owner",
            email="owner@rupiclothing.in",
            hashed_password=hash_password("password123"),
            full_name="Demo Owner",
        )
        db.add(user)
        db.flush()

    # 2. Business
    if not existing_biz:
        biz = Business(
            id="biz_1",
            name="Rupi Clothing",
            currency="INR",
            opening_cash_paise=1_000_000, # ₹10,000 opening cash
            safety_threshold_paise=500_000, # ₹5,000 threshold
            industry="Apparel retail",
            owner_name="Demo Owner",
            owner_email="owner@rupiclothing.in",
            phone="+91 98200 54321",
            address="Shop 14, Linking Road, Bandra West, Mumbai, Maharashtra 400050",
            tax_rate_percent=18,
            default_supplier_payment_terms_days=30,
            default_customer_payment_terms_days=15,
            default_forecast_horizon_days=30,
        )
        db.add(biz)
        db.flush()
    else:
        existing_biz.opening_cash_paise = 1_000_000
        existing_biz.safety_threshold_paise = 500_000

    # 3. Membership
    mem = db.query(BusinessMembership).filter(
        BusinessMembership.user_id == user.id,
        BusinessMembership.business_id == "biz_1"
    ).first()
    if not mem:
        mem = BusinessMembership(
            id="mem_owner_biz1",
            user_id=user.id,
            business_id="biz_1",
            role="owner",
        )
        db.add(mem)

    # 4. Suppliers
    suppliers = [
        Supplier(
            id="sup_1",
            business_id="biz_1",
            name="Shree Textiles",
            contact_name="Anil Shree",
            email="anil@shreetextiles.in",
            phone="+91 98200 12345",
            address="Plot 42, GIDC Textile Park, Surat, Gujarat 395023",
            tax_id="24AAACS1234F1Z8",
            payment_terms_days=30,
            outstanding_paise=3_000_000,
            reliability_score=86,
            status="active",
            lead_time_days=4,
            notes="Primary cotton yarn and greige fabric mill. High fabric consistency, requires advance before cutting.",
            created_at=dp(90),
            updated_at=dp(2),
        ),
        Supplier(
            id="sup_2",
            business_id="biz_1",
            name="Mehta Fabrics",
            contact_name="Priya Mehta",
            email="priya@mehtafabrics.in",
            phone="+91 98200 67890",
            address="Survey No. 118, Bhiwandi Textile Hub, Thane, Maharashtra 421302",
            tax_id="27AABCM5678G2ZC",
            payment_terms_days=45,
            outstanding_paise=2_250_000,
            reliability_score=92,
            status="active",
            lead_time_days=11,
            notes="Supplies premium European linen and rugged denim. Very dependable on-time delivery track record.",
            created_at=dp(120),
            updated_at=d(0),
        ),
        Supplier(
            id="sup_3",
            business_id="biz_1",
            name="Khan Dye House",
            contact_name="Imran Khan",
            email="imran@khandye.in",
            phone="+91 98200 54321",
            address="Gala 14, Dharavi Dyeing Compound, Mumbai, Maharashtra 400017",
            tax_id="27AAECK9012H1ZQ",
            payment_terms_days=15,
            outstanding_paise=720_000,
            reliability_score=71,
            status="active",
            lead_time_days=7,
            notes="Artisanal natural vat dyeing and silk embroidery. Delays occur frequently in peak monsoon season.",
            created_at=dp(60),
            updated_at=dp(3),
        ),
        Supplier(
            id="sup_4",
            business_id="biz_1",
            name="Heritage Weaves",
            contact_name="Kavita Rao",
            email="kavita@heritageweaves.in",
            phone="+91 98200 99887",
            address="Sector 5, Weavers Colony, Maheshwar, MP 451224",
            tax_id="23AABCH8877J1ZV",
            payment_terms_days=30,
            outstanding_paise=0,
            reliability_score=95,
            status="archived",
            lead_time_days=14,
            notes="Former handloom Maheshwari silk partner. Transitioned to local cooperative in late 2025.",
            created_at=dp(365),
            updated_at=dp(40),
        ),
    ]
    db.add_all(suppliers)
    db.flush()

    # 5. Customers
    customers = [
        Customer(
            id="cus_1",
            business_id="biz_1",
            name="Urban Threads Boutique",
            contact_name="Riya Kapoor",
            email="riya@urbanthreads.in",
            phone="+91 98111 23456",
            address="Shop 7, Galleria Market, DLF Phase 4, Gurugram 122002",
            tax_id="06AAPFU1234E1Z3",
            credit_terms_days=15,
            outstanding_paise=800_000,
            status="active",
            notes="Premium retail boutique client. Orders quarterly seasonal collections. Pays punctually on Net 15.",
            created_at=dp(180),
            updated_at=dp(5),
        ),
        Customer(
            id="cus_2",
            business_id="biz_1",
            name="Style Mart",
            contact_name="Sanjay Verma",
            email="sanjay@stylemart.co.in",
            phone="+91 98222 34567",
            address="45 Commercial Street, Tasker Town, Bengaluru 560001",
            tax_id="29AABCS8899K1Z5",
            credit_terms_days=30,
            outstanding_paise=1_450_000,
            status="active",
            notes="Multi-brand high street outlet. Larger volume wholesale purchases, but occasionally pushes payment 5-10 days past terms.",
            created_at=dp(240),
            updated_at=d(0),
        ),
        Customer(
            id="cus_3",
            business_id="biz_1",
            name="Jaipur Crafts Co",
            contact_name="Meenakshi Sharma",
            email="meenakshi@jaipurcrafts.in",
            phone="+91 98333 45678",
            address="Plot 12, Export Promotion Industrial Zone, Sitapura, Jaipur 302022",
            tax_id="08AABCJ4567M1Z1",
            credit_terms_days=7,
            outstanding_paise=0,
            status="active",
            notes="Consignment partner for artisan silk and block prints. Very fast turnaround.",
            created_at=dp(90),
            updated_at=dp(10),
        ),
        Customer(
            id="cus_4",
            business_id="biz_1",
            name="FabIndia Franchise Store",
            contact_name="Vikram Seth",
            email="vikram@fabfranchise.in",
            phone="+91 98444 56789",
            address="Unit 3, Phoenix Palladium Mall, Lower Parel, Mumbai 400013",
            tax_id="27AABCF1122N1Z9",
            credit_terms_days=45,
            outstanding_paise=0,
            status="archived",
            notes="Franchise agreement ended December 2025. All pending invoices settled in full.",
            created_at=dp(400),
            updated_at=dp(60),
        ),
    ]
    db.add_all(customers)
    db.flush()

    # 6. Products
    products = [
        Product(
            id="prod_1",
            business_id="biz_1",
            sku="KUR-COT-001",
            name="Pure Cotton Embroidered Kurti",
            unit_cost_paise=350_000, # ₹3,500
            unit_price_paise=800_000, # ₹8,000
            reorder_point=15,
            category="Womenswear",
            description="Hand-embroidered pure cotton kurti crafted with Surat greige yarn.",
            unit_of_measure="pieces",
            preferred_supplier_id="sup_1",
            currency="INR",
            created_at=dp(120),
            updated_at=dp(2),
        ),
        Product(
            id="prod_2",
            business_id="biz_1",
            sku="JKT-DEN-002",
            name="Overdyed Indigo Denim Jacket",
            unit_cost_paise=450_000,
            unit_price_paise=1_320_000,
            reorder_point=12,
            category="Outerwear",
            description="14oz rigid denim jacket washed and dyed in Bhiwandi.",
            unit_of_measure="pieces",
            preferred_supplier_id="sup_2",
            currency="INR",
            created_at=dp(100),
            updated_at=dp(5),
        ),
        Product(
            id="prod_3",
            business_id="biz_1",
            sku="SHT-LIN-003",
            name="Relaxed Band-Collar Linen Shirt",
            unit_cost_paise=280_000,
            unit_price_paise=650_000,
            reorder_point=20,
            category="Menswear",
            description="Breathable European flax linen summer shirt.",
            unit_of_measure="pieces",
            preferred_supplier_id="sup_2",
            currency="INR",
            created_at=dp(80),
            updated_at=dp(1),
        ),
        Product(
            id="prod_4",
            business_id="biz_1",
            sku="SCF-SLK-004",
            name="Hand-Block Printed Silk Scarf",
            unit_cost_paise=120_000,
            unit_price_paise=320_000,
            reorder_point=25,
            category="Accessories",
            description="Mulberry silk printed with natural indigo pigments.",
            unit_of_measure="pieces",
            preferred_supplier_id="sup_3",
            currency="INR",
            created_at=dp(60),
            updated_at=dp(3),
        ),
        Product(
            id="prod_5",
            business_id="biz_1",
            sku="TRS-KHA-005",
            name="Handloom Khadi Relaxed Trousers",
            unit_cost_paise=300_000,
            unit_price_paise=720_000,
            reorder_point=10,
            category="Bottoms",
            description="Organic handspun khadi cotton drawstring trousers.",
            unit_of_measure="pieces",
            preferred_supplier_id="sup_1",
            currency="INR",
            created_at=dp(45),
            updated_at=dp(4),
        ),
    ]
    db.add_all(products)
    db.flush()

    # 7. Inventory Items
    inventory = [
        InventoryItem(
            id="inv_1",
            business_id="biz_1",
            product_id="prod_1",
            quantity_on_hand=8,
            quantity_reserved=10,
            quantity_on_order=25,
            expected_restock_date=d(4),
            updated_at=d(0),
        ),
        InventoryItem(
            id="inv_2",
            business_id="biz_1",
            product_id="prod_2",
            quantity_on_hand=8,
            quantity_reserved=6,
            quantity_on_order=0,
            expected_restock_date=None,
            updated_at=d(0),
        ),
        InventoryItem(
            id="inv_3",
            business_id="biz_1",
            product_id="prod_3",
            quantity_on_hand=34,
            quantity_reserved=8,
            quantity_on_order=30,
            expected_restock_date=d(11),
            updated_at=d(0),
        ),
        InventoryItem(
            id="inv_4",
            business_id="biz_1",
            product_id="prod_4",
            quantity_on_hand=42,
            quantity_reserved=0,
            quantity_on_order=50,
            expected_restock_date=d(7),
            updated_at=d(0),
        ),
        InventoryItem(
            id="inv_5",
            business_id="biz_1",
            product_id="prod_5",
            quantity_on_hand=0,
            quantity_reserved=0,
            quantity_on_order=0,
            expected_restock_date=None,
            updated_at=d(0),
        ),
    ]
    db.add_all(inventory)

    # 8. Purchase Orders
    po1 = PurchaseOrder(
        id="po_1",
        business_id="biz_1",
        po_number="PO-2026-001",
        supplier_id="sup_1",
        product_id="prod_1",
        quantity=25,
        total_paise=3_500_000, # ₹35,000
        advance_paid_paise=500_000, # ₹5,000 advance on Day 1
        status="confirmed",
        order_date=dp(3),
        expected_delivery_date=d(4), # Day 4 arrival
        payment_terms_days=30,
        payment_due_date=d(30),
        notes="Advance ₹5,000 paid. Balance ₹30,000 due 30 days post delivery.",
        received_quantity=0,
        created_at=dp(3),
        updated_at=dp(3),
    )
    po2 = PurchaseOrder(
        id="po_2",
        business_id="biz_1",
        po_number="PO-2026-002",
        supplier_id="sup_2",
        product_id="prod_2",
        quantity=20,
        total_paise=2_250_000,
        advance_paid_paise=0,
        status="sent",
        order_date=dp(1),
        expected_delivery_date=d(11),
        payment_terms_days=45,
        payment_due_date=d(56),
        notes="Net 45 terms on bill invoice after fabric arrival.",
        received_quantity=0,
        created_at=dp(1),
        updated_at=dp(1),
    )
    db.add(po1)
    db.add(po2)
    db.flush()

    po1_li = PurchaseOrderLineItem(
        id="poli_1",
        purchase_order_id="po_1",
        product_id="prod_1",
        quantity=25,
        unit_price_paise=140_000,
        total_paise=3_500_000,
        received_quantity=0,
    )
    po2_li = PurchaseOrderLineItem(
        id="poli_2",
        purchase_order_id="po_2",
        product_id="prod_2",
        quantity=20,
        unit_price_paise=112_500,
        total_paise=2_250_000,
        received_quantity=0,
    )
    db.add_all([po1_li, po2_li])

    # 9. Customer Orders
    co1 = CustomerOrder(
        id="co_1",
        business_id="biz_1",
        customer_id="cus_1",
        product_id="prod_1",
        quantity=10,
        total_paise=800_000, # ₹8,000 order
        status="confirmed",
        order_date=dp(2),
        delivery_date=d(6), # Customer delivery Day 6
        created_at=dp(2),
        updated_at=dp(2),
    )
    co2 = CustomerOrder(
        id="co_2",
        business_id="biz_1",
        customer_id="cus_2",
        product_id="prod_2",
        quantity=6,
        total_paise=1_320_000,
        status="confirmed",
        order_date=dp(1),
        delivery_date=d(9),
        created_at=dp(1),
        updated_at=dp(1),
    )
    db.add_all([co1, co2])
    db.flush()

    # 10. Invoices
    # Invoice matching prompt:
    # Customer invoice: ₹8,000 on Day 6 (INV-2001) with expected receipt Day 21 (Net 15 from Day 6)
    inv1 = Invoice(
        id="invc_1",
        business_id="biz_1",
        invoice_number="INV-2026-2001",
        type="receivable",
        customer_id="cus_1",
        customer_order_id="co_1",
        amount_paise=800_000, # ₹8,000
        amount_paid_paise=0,
        status="sent",
        issue_date=d(6), # Day 6
        due_date=d(21),  # Expected receipt Day 21
        notes="Collection due Day 21 for Urban Threads Boutique order.",
        created_at=d(6),
        updated_at=d(6),
    )
    inv2 = Invoice(
        id="invc_2",
        business_id="biz_1",
        invoice_number="INV-2026-2002",
        type="receivable",
        customer_id="cus_2",
        customer_order_id="co_2",
        amount_paise=1_320_000,
        amount_paid_paise=0,
        status="sent",
        issue_date=d(9),
        due_date=d(39),
        notes="Style Mart wholesale collection.",
        created_at=d(9),
        updated_at=d(9),
    )
    inv3 = Invoice(
        id="invc_3",
        business_id="biz_1",
        invoice_number="INV-2026-1999",
        type="receivable",
        customer_id="cus_2",
        amount_paise=130_000,
        amount_paid_paise=0,
        status="overdue",
        issue_date=dp(35),
        due_date=dp(5), # 5 days overdue
        notes="Previous invoice overdue 5 days.",
        created_at=dp(35),
        updated_at=dp(5),
    )
    bill1 = Invoice(
        id="invc_4",
        business_id="biz_1",
        invoice_number="BILL-2026-301",
        type="payable",
        supplier_id="sup_1",
        purchase_order_id="po_1",
        amount_paise=3_000_000, # ₹30,000 balance owed
        amount_paid_paise=0,
        status="sent",
        issue_date=d(4),
        due_date=d(34),
        notes="Balance bill on PO-2026-001 delivery.",
        created_at=d(4),
        updated_at=d(4),
    )
    bill2 = Invoice(
        id="invc_5",
        business_id="biz_1",
        invoice_number="BILL-2026-302",
        type="payable",
        supplier_id="sup_2",
        purchase_order_id="po_2",
        amount_paise=2_250_000,
        amount_paid_paise=0,
        status="sent",
        issue_date=d(11),
        due_date=d(56),
        notes="Mehta Fabrics raw denim bill.",
        created_at=d(11),
        updated_at=d(11),
    )
    bill3 = Invoice(
        id="invc_6",
        business_id="biz_1",
        invoice_number="BILL-2026-298",
        type="payable",
        supplier_id="sup_3",
        amount_paise=120_000,
        amount_paid_paise=0,
        status="overdue",
        issue_date=dp(25),
        due_date=dp(10),
        notes="Khan Dye House dyeing bill.",
        created_at=dp(25),
        updated_at=dp(10),
    )
    db.add_all([inv1, inv2, inv3, bill1, bill2, bill3])

    # 11. Payments & Cash Flow Events
    # Matching financial rules in prompt section 6:
    # Opening cash: ₹10,000 (1_000_000 paise)
    # Supplier advance: ₹5,000 on Day 1 (500_000 paise)
    # Customer receipt: ₹8,000 on Day 21 (800_000 paise)
    pay_advance = Payment(
        id="pay_adv_1",
        business_id="biz_1",
        direction="outgoing",
        purchase_order_id="po_1",
        supplier_id="sup_1",
        amount_paise=500_000, # ₹5,000
        status="completed",
        scheduled_date=d(1),
        completed_date=d(1),
        method="Bank Transfer",
        created_at=d(1),
    )
    db.add(pay_advance)

    events = [
        # Supplier advance ₹5,000 on Day 1
        CashFlowEvent(
            id="evt_1",
            business_id="biz_1",
            type="supplier_payment",
            label="Supplier Advance - Shree Textiles (PO-1)",
            direction="outgoing",
            amount_paise=500_000,
            date=d(1),
            related_purchase_order_id="po_1",
            is_projected=False,
            counterparty_name="Shree Textiles",
            status="completed",
            risk_note="Advance required before batch cutting.",
            created_at=d(1),
        ),
        # Expected customer receipt ₹8,000 on Day 21
        CashFlowEvent(
            id="evt_2",
            business_id="biz_1",
            type="customer_payment",
            label="Expected Customer Receipt - Urban Threads (INV-2001)",
            direction="incoming",
            amount_paise=800_000,
            date=d(21),
            related_invoice_id="invc_1",
            is_projected=True,
            counterparty_name="Urban Threads Boutique",
            status="projected",
            risk_note="High probability based on 100% past reliability.",
            created_at=d(0),
        ),
        # Rent payment ₹2,500 on Day 10
        CashFlowEvent(
            id="evt_3",
            business_id="biz_1",
            type="rent",
            label="Bandhra West Shop Lease",
            direction="outgoing",
            amount_paise=250_000,
            date=d(10),
            is_projected=True,
            counterparty_name="Prime Properties",
            status="scheduled",
            created_at=d(0),
        ),
        # Payroll ₹3,000 on Day 28
        CashFlowEvent(
            id="evt_4",
            business_id="biz_1",
            type="payroll",
            label="Store Staff Salary Run",
            direction="outgoing",
            amount_paise=300_000,
            date=d(28),
            is_projected=True,
            status="scheduled",
            created_at=d(0),
        ),
    ]
    db.add_all(events)

    # 12. Simulation Scenarios
    scenarios = [
        SimulationScenario(
            id="scn_1",
            business_id="biz_1",
            name="Shree Textiles 7-day Delivery Delay",
            description="Simulates impact if greige cotton shipment slips from Day 4 to Day 11.",
            target_event_id="evt_1",
            change_type="delay_payment",
            change_magnitude=7,
            controls_json=json.dumps({
                "supplierDeliveryDelayDays": 7,
                "customerPaymentDelayDays": 0,
                "customerPaymentAmountPaise": None,
                "supplierPaymentAmountPaise": None,
                "orderQuantityMultiplier": 1.0,
                "horizonDays": 30
            }),
            created_at=d(0),
        ),
        SimulationScenario(
            id="scn_2",
            business_id="biz_1",
            name="Urban Threads 14-day Payment Extension",
            description="Simulates liquidity impact if Urban Threads extends credit collection to Day 35.",
            target_event_id="evt_2",
            change_type="delay_payment",
            change_magnitude=14,
            controls_json=json.dumps({
                "supplierDeliveryDelayDays": 0,
                "customerPaymentDelayDays": 14,
                "customerPaymentAmountPaise": None,
                "supplierPaymentAmountPaise": None,
                "orderQuantityMultiplier": 1.0,
                "horizonDays": 30
            }),
            created_at=d(0),
        ),
    ]
    db.add_all(scenarios)

    # 13. Settings
    settings_record = db.query(AppSettingsModel).filter(AppSettingsModel.business_id == "biz_1").first()
    if not settings_record:
        settings_record = AppSettingsModel(
            id="set_1",
            business_id="biz_1",
            notification_preferences_json=json.dumps({
                "overduePayments": True,
                "upcomingSupplierPayments": True,
                "overdueInvoices": True,
                "lowCash": True,
                "delayedDeliveries": True,
                "highRippleImpact": True,
            }),
            app_preferences_json=json.dumps({
                "theme": "system",
                "compactTables": False,
                "version": "1.0.0",
            }),
            updated_at=d(0),
        )
        db.add(settings_record)

    db.commit()
    print("Successfully seeded Rupi Clothing (biz_1) with all counterparties, orders, invoices, and financial records.")
