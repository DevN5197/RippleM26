"""
Clean all test IDs, extraneous accounts, and reset Ripple database to pristine seed.
"""
from app.database import SessionLocal, engine
from app.models.business import Business, BusinessMembership
from app.models.user import User
from app.models.cash_flow import CashFlowEvent
from app.models.payment import Payment
from app.models.invoice import Invoice
from app.models.order import CustomerOrder, PurchaseOrder, PurchaseOrderLineItem
from app.models.inventory import InventoryItem, InventoryMovement
from app.models.product import Product
from app.models.customer import Customer
from app.models.supplier import Supplier
from app.models.simulation import SimulationScenario, DependencyEdge, ScenarioRescue, ScenarioStressTest
from app.models.settings import AppSettingsModel
from app.seed import seed_rupi_clothing

def clean_database():
    db = SessionLocal()
    try:
        # 1. Identify non-demo businesses
        foreign_biz = db.query(Business).filter(Business.id != "biz_1").all()
        print(f"Purging {len(foreign_biz)} non-demo businesses and all their records...")

        # Purge all foreign business data
        db.query(CashFlowEvent).filter(CashFlowEvent.business_id != "biz_1").delete()
        db.query(Payment).filter(Payment.business_id != "biz_1").delete()
        db.query(Invoice).filter(Invoice.business_id != "biz_1").delete()
        db.query(CustomerOrder).filter(CustomerOrder.business_id != "biz_1").delete()
        
        # Foreign PO line items
        demo_po_ids = [p.id for p in db.query(PurchaseOrder.id).filter(PurchaseOrder.business_id == "biz_1").all()]
        if demo_po_ids:
            db.query(PurchaseOrderLineItem).filter(~PurchaseOrderLineItem.purchase_order_id.in_(demo_po_ids)).delete(synchronize_session=False)
        else:
            db.query(PurchaseOrderLineItem).delete(synchronize_session=False)

        db.query(PurchaseOrder).filter(PurchaseOrder.business_id != "biz_1").delete()
        db.query(InventoryMovement).filter(InventoryMovement.business_id != "biz_1").delete()
        db.query(InventoryItem).filter(InventoryItem.business_id != "biz_1").delete()
        db.query(Product).filter(Product.business_id != "biz_1").delete()
        db.query(Customer).filter(Customer.business_id != "biz_1").delete()
        db.query(Supplier).filter(Supplier.business_id != "biz_1").delete()
        db.query(SimulationScenario).filter(SimulationScenario.business_id != "biz_1").delete()
        db.query(ScenarioRescue).filter(ScenarioRescue.business_id != "biz_1").delete()
        db.query(ScenarioStressTest).filter(ScenarioStressTest.business_id != "biz_1").delete()
        db.query(DependencyEdge).filter(DependencyEdge.business_id != "biz_1").delete()
        db.query(AppSettingsModel).filter(AppSettingsModel.business_id != "biz_1").delete()
        db.query(BusinessMembership).filter(BusinessMembership.business_id != "biz_1").delete()
        db.query(Business).filter(Business.id != "biz_1").delete()

        # 2. Identify non-demo users
        foreign_users = db.query(User).filter(User.id != "usr_owner").all()
        print(f"Purging {len(foreign_users)} non-demo users...")
        db.query(BusinessMembership).filter(BusinessMembership.user_id != "usr_owner").delete()
        db.query(User).filter(User.id != "usr_owner").delete()

        db.commit()

        # 3. Reset demo business (biz_1) back to pristine initial state
        print("Resetting demo business 'Rupi Clothing' (biz_1) to pristine state...")
        seed_rupi_clothing(db, overwrite=True)
        demo_user = db.query(User).filter(User.id == "usr_owner").first()
        if demo_user:
            demo_user.is_email_verified = True
            demo_user.is_phone_verified = True
        db.commit()

        # Check final counts
        final_users = db.query(User).all()
        final_biz = db.query(Business).all()
        print(f"Active Users ({len(final_users)}):", [(u.id, u.email, u.full_name) for u in final_users])
        print(f"Active Businesses ({len(final_biz)}):", [(b.id, b.name) for b in final_biz])

    finally:
        db.close()

    # 4. Reclaim disk space and clean SQLite database
    print("Running SQLite VACUUM to defragment and optimize storage...")
    with engine.connect() as conn:
        conn.exec_driver_sql("VACUUM")
    print("Database cleanup completed successfully!")

if __name__ == "__main__":
    clean_database()
