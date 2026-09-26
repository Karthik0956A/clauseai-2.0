"""MongoDB stores documents, chunks, and analysis records. It does not store vectors."""

from datetime import datetime, timezone

from pymongo import MongoClient
from pymongo.collection import Collection

from app.config import Settings
from app.errors import ExternalServiceError, NotFoundError


class DocumentRepository:
    def __init__(self, client: MongoClient, database: str = "clauseai"):
        self._db = client[database]
        self.documents: Collection = self._db["documents"]
        self.chunks: Collection = self._db["document_chunks"]
        self.clauses: Collection = self._db["clauses"]
        self.risks: Collection = self._db["risk_assessments"]
        self.policies: Collection = self._db["policies"]
        self.comparisons: Collection = self._db["comparisons"]
        self.reports: Collection = self._db["reports"]

    @classmethod
    def from_settings(cls, settings: Settings) -> "DocumentRepository":
        uri = settings.require_mongo()
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=4000)
        except Exception as exc:
            raise ExternalServiceError("Could not create a MongoDB client.") from exc
        return cls(client)

    def insert_document(self, record: dict) -> str:
        record.setdefault("uploaded_at", datetime.now(timezone.utc))
        result = self.documents.insert_one(record)
        return str(result.inserted_id)

    def update_document(self, user_id: str, document_id: str, fields: dict) -> None:
        updated = self.documents.update_one(
            {"_id": _object_id(document_id), "user_id": user_id},
            {"$set": fields},
        )
        if updated.matched_count == 0:
            raise NotFoundError("Document not found.")

    def get_document(self, user_id: str, document_id: str) -> dict:
        found = self.documents.find_one({"_id": _object_id(document_id), "user_id": user_id})
        if not found:
            raise NotFoundError("Document not found.")
        found["_id"] = str(found["_id"])
        return found

    def list_documents(self, user_id: str) -> list[dict]:
        rows = []
        for row in self.documents.find({"user_id": user_id}).sort("uploaded_at", -1):
            row["_id"] = str(row["_id"])
            row.pop("pages", None)
            rows.append(row)
        return rows

    def delete_document(self, user_id: str, document_id: str) -> None:
        self.get_document(user_id, document_id)
        oid = _object_id(document_id)
        self.documents.delete_one({"_id": oid, "user_id": user_id})
        self.chunks.delete_many({"document_id": document_id, "user_id": user_id})
        self.clauses.delete_many({"document_id": document_id, "user_id": user_id})
        self.risks.delete_many({"document_id": document_id, "user_id": user_id})

    def replace_chunks(self, user_id: str, document_id: str, chunks: list[dict]) -> None:
        self.chunks.delete_many({"document_id": document_id, "user_id": user_id})
        if chunks:
            self.chunks.insert_many(chunks)

    def list_chunks(self, user_id: str, document_id: str) -> list[dict]:
        self.get_document(user_id, document_id)
        rows = list(self.chunks.find({"document_id": document_id, "user_id": user_id}))
        for row in rows:
            row["_id"] = str(row["_id"])
        return rows

    def save_clauses(self, user_id: str, document_id: str, clauses: list[dict]) -> None:
        self.clauses.delete_many({"document_id": document_id, "user_id": user_id})
        if clauses:
            self.clauses.insert_many(clauses)

    def list_clauses(self, user_id: str, document_id: str) -> list[dict]:
        self.get_document(user_id, document_id)
        rows = list(self.clauses.find({"document_id": document_id, "user_id": user_id}))
        for row in rows:
            row["_id"] = str(row["_id"])
        return rows

    def save_risks(self, user_id: str, document_id: str, payload: dict) -> None:
        self.risks.replace_one(
            {"document_id": document_id, "user_id": user_id},
            {"document_id": document_id, "user_id": user_id, **payload},
            upsert=True,
        )

    def get_risks(self, user_id: str, document_id: str) -> dict | None:
        self.get_document(user_id, document_id)
        row = self.risks.find_one({"document_id": document_id, "user_id": user_id})
        if row:
            row["_id"] = str(row["_id"])
        return row

    def save_policy(self, user_id: str, policy: dict) -> str:
        policy["user_id"] = user_id
        result = self.policies.insert_one(policy)
        return str(result.inserted_id)

    def list_policies(self, user_id: str) -> list[dict]:
        rows = []
        for row in self.policies.find({"user_id": user_id}):
            row["_id"] = str(row["_id"])
            rows.append(row)
        return rows


def _object_id(document_id: str):
    from bson import ObjectId
    from bson.errors import InvalidId

    from app.errors import ValidationFailed

    try:
        return ObjectId(document_id)
    except InvalidId as exc:
        raise ValidationFailed("The document id is not valid.") from exc
