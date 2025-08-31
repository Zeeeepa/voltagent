#!/usr/bin/env python3
"""
Management Module

This module provides functionality for managing codebase snapshots and transactions.
It includes classes for creating and managing snapshots, as well as tracking changes
through transactions.
"""

import json
import logging
import os
import tempfile
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


class TransactionType(str, Enum):
    """Types of transactions."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    MOVE = "move"
    RENAME = "rename"
    ANALYZE = "analyze"
    SNAPSHOT = "snapshot"


@dataclass
class Transaction:
    """
    Represents a transaction in the system.
    
    A transaction is a record of a change to the codebase, such as creating,
    updating, or deleting a file, or performing an analysis.
    """

    transaction_type: TransactionType
    timestamp: str
    user_id: str
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    id: str = None

    def __post_init__(self):
        """Initialize derived fields."""
        if self.id is None:
            import uuid
            self.id = str(uuid.uuid4())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "transaction_type": self.transaction_type.value,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "description": self.description,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Transaction":
        """Create from dictionary representation."""
        # Convert string transaction type to enum
        if "transaction_type" in data and isinstance(data["transaction_type"], str):
            data["transaction_type"] = TransactionType(data["transaction_type"])

        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})


class TransactionManager:
    """
    Manages transactions in the system.
    
    This class provides functionality for creating, retrieving, and managing
    transactions, which represent changes to the codebase.
    """

    def __init__(self, storage_path: str = None):
        """
        Initialize the transaction manager.
        
        Args:
            storage_path: Path to store transaction data
        """
        self.storage_path = storage_path or os.path.join(
            tempfile.gettempdir(), "codegen_transactions"
        )
        
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_path, exist_ok=True)
        
        # Load existing transactions
        self.transactions = self._load_transactions()

    def _load_transactions(self) -> List[Transaction]:
        """Load transactions from storage."""
        transactions = []
        
        # Get transaction files
        transaction_files = []
        try:
            transaction_files = [
                f for f in os.listdir(self.storage_path)
                if f.endswith(".json") and f.startswith("transaction_")
            ]
        except FileNotFoundError:
            logger.warning(f"Transaction storage path not found: {self.storage_path}")
            return transactions
        
        # Load transactions
        for file_name in transaction_files:
            try:
                with open(os.path.join(self.storage_path, file_name)) as f:
                    data = json.load(f)
                    transactions.append(Transaction.from_dict(data))
            except Exception as e:
                logger.error(f"Error loading transaction from {file_name}: {e}")
        
        return transactions

    def create_transaction(
        self,
        transaction_type: TransactionType,
        user_id: str,
        description: str,
        metadata: Dict[str, Any] = None,
    ) -> Transaction:
        """
        Create a new transaction.
        
        Args:
            transaction_type: Type of transaction
            user_id: ID of the user who created the transaction
            description: Description of the transaction
            metadata: Additional metadata
            
        Returns:
            Created transaction
        """
        # Create transaction
        transaction = Transaction(
            transaction_type=transaction_type,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            description=description,
            metadata=metadata or {},
        )
        
        # Add to transactions
        self.transactions.append(transaction)
        
        # Save transaction
        self._save_transaction(transaction)
        
        return transaction

    def _save_transaction(self, transaction: Transaction):
        """Save a transaction to storage."""
        file_path = os.path.join(
            self.storage_path, f"transaction_{transaction.id}.json"
        )
        
        with open(file_path, "w") as f:
            json.dump(transaction.to_dict(), f, indent=2)

    def get_transaction(self, transaction_id: str) -> Optional[Transaction]:
        """
        Get a transaction by ID.
        
        Args:
            transaction_id: ID of the transaction to get
            
        Returns:
            Transaction if found, None otherwise
        """
        for transaction in self.transactions:
            if transaction.id == transaction_id:
                return transaction
        
        return None

    def get_transactions(
        self,
        transaction_type: TransactionType = None,
        user_id: str = None,
        start_time: str = None,
        end_time: str = None,
    ) -> List[Transaction]:
        """
        Get transactions matching the specified criteria.
        
        Args:
            transaction_type: Type of transactions to get
            user_id: ID of the user who created the transactions
            start_time: Start time for transactions (ISO format)
            end_time: End time for transactions (ISO format)
            
        Returns:
            List of matching transactions
        """
        filtered_transactions = self.transactions
        
        # Filter by transaction type
        if transaction_type:
            filtered_transactions = [
                t for t in filtered_transactions
                if t.transaction_type == transaction_type
            ]
        
        # Filter by user ID
        if user_id:
            filtered_transactions = [
                t for t in filtered_transactions
                if t.user_id == user_id
            ]
        
        # Filter by start time
        if start_time:
            filtered_transactions = [
                t for t in filtered_transactions
                if t.timestamp >= start_time
            ]
        
        # Filter by end time
        if end_time:
            filtered_transactions = [
                t for t in filtered_transactions
                if t.timestamp <= end_time
            ]
        
        return filtered_transactions

    def delete_transaction(self, transaction_id: str) -> bool:
        """
        Delete a transaction.
        
        Args:
            transaction_id: ID of the transaction to delete
            
        Returns:
            True if the transaction was deleted, False otherwise
        """
        # Find transaction
        transaction = self.get_transaction(transaction_id)
        
        if not transaction:
            return False
        
        # Remove from transactions
        self.transactions = [t for t in self.transactions if t.id != transaction_id]
        
        # Delete transaction file
        file_path = os.path.join(
            self.storage_path, f"transaction_{transaction_id}.json"
        )
        
        try:
            os.remove(file_path)
            return True
        except FileNotFoundError:
            logger.warning(f"Transaction file not found: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error deleting transaction file: {e}")
            return False


class SnapshotManager:
    """
    Manages codebase snapshots.
    
    This class provides functionality for creating, retrieving, and managing
    snapshots of the codebase at different points in time.
    """

    def __init__(
        self,
        storage_path: str = None,
        transaction_manager: TransactionManager = None,
    ):
        """
        Initialize the snapshot manager.
        
        Args:
            storage_path: Path to store snapshot data
            transaction_manager: Transaction manager to use
        """
        self.storage_path = storage_path or os.path.join(
            tempfile.gettempdir(), "codegen_snapshots"
        )
        
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_path, exist_ok=True)
        
        # Initialize transaction manager
        self.transaction_manager = transaction_manager or TransactionManager()
        
        # Load existing snapshots
        self.snapshots = self._load_snapshots()

    def _load_snapshots(self) -> Dict[str, Dict[str, Any]]:
        """Load snapshots from storage."""
        snapshots = {}
        
        # Get snapshot files
        snapshot_files = []
        try:
            snapshot_files = [
                f for f in os.listdir(self.storage_path)
                if f.endswith(".json") and f.startswith("snapshot_")
            ]
        except FileNotFoundError:
            logger.warning(f"Snapshot storage path not found: {self.storage_path}")
            return snapshots
        
        # Load snapshots
        for file_name in snapshot_files:
            try:
                with open(os.path.join(self.storage_path, file_name)) as f:
                    data = json.load(f)
                    snapshot_id = file_name.replace("snapshot_", "").replace(".json", "")
                    snapshots[snapshot_id] = data
            except Exception as e:
                logger.error(f"Error loading snapshot from {file_name}: {e}")
        
        return snapshots

    def create_snapshot(
        self,
        codebase_context,
        user_id: str,
        description: str,
        metadata: Dict[str, Any] = None,
    ) -> str:
        """
        Create a new snapshot.
        
        Args:
            codebase_context: Context for the codebase to snapshot
            user_id: ID of the user who created the snapshot
            description: Description of the snapshot
            metadata: Additional metadata
            
        Returns:
            ID of the created snapshot
        """
        # Generate snapshot ID
        import uuid
        snapshot_id = str(uuid.uuid4())
        
        # Create snapshot data
        snapshot_data = {
            "id": snapshot_id,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "description": description,
            "metadata": metadata or {},
            "codebase_summary": self._generate_codebase_summary(codebase_context),
        }
        
        # Add to snapshots
        self.snapshots[snapshot_id] = snapshot_data
        
        # Save snapshot
        self._save_snapshot(snapshot_id, snapshot_data)
        
        # Create transaction
        self.transaction_manager.create_transaction(
            transaction_type=TransactionType.SNAPSHOT,
            user_id=user_id,
            description=f"Created snapshot: {description}",
            metadata={"snapshot_id": snapshot_id},
        )
        
        return snapshot_id

    def _generate_codebase_summary(self, codebase_context) -> Dict[str, Any]:
        """Generate a summary of the codebase."""
        # Import codebase analysis functions
        from codegen_on_oss.analyzers.codebase_analysis import get_codebase_summary
        
        # Get codebase
        codebase = codebase_context.codebase
        
        # Generate summary
        summary = {
            "files_count": len(list(codebase.files)),
            "classes_count": len(list(codebase.classes)),
            "functions_count": len(list(codebase.functions)),
            "imports_count": len(list(codebase.imports)),
            "summary": get_codebase_summary(codebase),
        }
        
        return summary

    def _save_snapshot(self, snapshot_id: str, snapshot_data: Dict[str, Any]):
        """Save a snapshot to storage."""
        file_path = os.path.join(
            self.storage_path, f"snapshot_{snapshot_id}.json"
        )
        
        with open(file_path, "w") as f:
            json.dump(snapshot_data, f, indent=2)

    def get_snapshot(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a snapshot by ID.
        
        Args:
            snapshot_id: ID of the snapshot to get
            
        Returns:
            Snapshot data if found, None otherwise
        """
        return self.snapshots.get(snapshot_id)

    def get_snapshots(
        self,
        user_id: str = None,
        start_time: str = None,
        end_time: str = None,
    ) -> List[Dict[str, Any]]:
        """
        Get snapshots matching the specified criteria.
        
        Args:
            user_id: ID of the user who created the snapshots
            start_time: Start time for snapshots (ISO format)
            end_time: End time for snapshots (ISO format)
            
        Returns:
            List of matching snapshots
        """
        filtered_snapshots = list(self.snapshots.values())
        
        # Filter by user ID
        if user_id:
            filtered_snapshots = [
                s for s in filtered_snapshots
                if s["user_id"] == user_id
            ]
        
        # Filter by start time
        if start_time:
            filtered_snapshots = [
                s for s in filtered_snapshots
                if s["timestamp"] >= start_time
            ]
        
        # Filter by end time
        if end_time:
            filtered_snapshots = [
                s for s in filtered_snapshots
                if s["timestamp"] <= end_time
            ]
        
        return filtered_snapshots

    def delete_snapshot(self, snapshot_id: str) -> bool:
        """
        Delete a snapshot.
        
        Args:
            snapshot_id: ID of the snapshot to delete
            
        Returns:
            True if the snapshot was deleted, False otherwise
        """
        # Check if snapshot exists
        if snapshot_id not in self.snapshots:
            return False
        
        # Remove from snapshots
        del self.snapshots[snapshot_id]
        
        # Delete snapshot file
        file_path = os.path.join(
            self.storage_path, f"snapshot_{snapshot_id}.json"
        )
        
        try:
            os.remove(file_path)
            return True
        except FileNotFoundError:
            logger.warning(f"Snapshot file not found: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Error deleting snapshot file: {e}")
            return False

    def compare_snapshots(
        self,
        snapshot_id_1: str,
        snapshot_id_2: str,
    ) -> Dict[str, Any]:
        """
        Compare two snapshots.
        
        Args:
            snapshot_id_1: ID of the first snapshot
            snapshot_id_2: ID of the second snapshot
            
        Returns:
            Comparison results
        """
        # Get snapshots
        snapshot_1 = self.get_snapshot(snapshot_id_1)
        snapshot_2 = self.get_snapshot(snapshot_id_2)
        
        if not snapshot_1 or not snapshot_2:
            raise ValueError("Snapshots not found")
        
        # Compare snapshots
        comparison = {
            "snapshot_1": {
                "id": snapshot_id_1,
                "timestamp": snapshot_1["timestamp"],
                "description": snapshot_1["description"],
            },
            "snapshot_2": {
                "id": snapshot_id_2,
                "timestamp": snapshot_2["timestamp"],
                "description": snapshot_2["description"],
            },
            "differences": self._compare_snapshot_data(snapshot_1, snapshot_2),
        }
        
        return comparison

    def _compare_snapshot_data(
        self,
        snapshot_1: Dict[str, Any],
        snapshot_2: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Compare snapshot data."""
        # Compare codebase summaries
        summary_1 = snapshot_1["codebase_summary"]
        summary_2 = snapshot_2["codebase_summary"]
        
        # Calculate differences
        differences = {
            "files_count_diff": summary_2["files_count"] - summary_1["files_count"],
            "classes_count_diff": summary_2["classes_count"] - summary_1["classes_count"],
            "functions_count_diff": summary_2["functions_count"] - summary_1["functions_count"],
            "imports_count_diff": summary_2["imports_count"] - summary_1["imports_count"],
        }
        
        return differences

