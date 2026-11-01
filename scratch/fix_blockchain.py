import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from database import SessionLocal
from models import BlockchainBlock
from services.blockchain_service import blockchain_service

def fix_and_rechain_blockchain():
    db = SessionLocal()
    try:
        # 1. Delete any leftover Davanagere or Maravanji blocks
        del_count = db.query(BlockchainBlock).filter(
            (BlockchainBlock.village.in_(["Maravanji", "Avaragere"])) |
            (BlockchainBlock.details.ilike("%davanagere%")) |
            (BlockchainBlock.details.ilike("%maravanji%"))
        ).delete(synchronize_session=False)
        db.commit()
        print(f"Deleted {del_count} leftover Davanagere/Maravanji blockchain blocks.")

        # 2. Re-chain all blocks
        blocks = db.query(BlockchainBlock).order_by(BlockchainBlock.id.asc()).all()
        print(f"Total blocks to re-chain: {len(blocks)}")

        prev_hash = blockchain_service.GENESIS_PREV_HASH
        for idx, block in enumerate(blocks):
            block.block_index = idx
            block.prev_hash = prev_hash
            ts_str = block.timestamp.isoformat()
            
            # Recalculate hash
            cur_hash = blockchain_service.calculate_hash(
                index=idx,
                timestamp_str=ts_str,
                prev_hash=prev_hash,
                merkle_root=block.merkle_root,
                action=block.action,
                details=block.details or "",
                nonce=block.nonce
            )
            block.current_hash = cur_hash
            block.is_verified = True
            prev_hash = cur_hash

        db.commit()
        print("Successfully re-chained all blocks.")

        # 3. Verify integrity
        res = blockchain_service.verify_chain_integrity(db)
        print("Blockchain verification result:", res)
        assert res["is_valid"] is True, f"Integrity check failed: {res}"

    finally:
        db.close()

if __name__ == "__main__":
    fix_and_rechain_blockchain()
