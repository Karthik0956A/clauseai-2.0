"""Document upload and library."""

from fastapi import APIRouter, Depends, File, UploadFile

from app.auth import get_current_user
from app.deps import document_service
from app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    service: DocumentService = Depends(document_service),
):
    data = await file.read()
    result = service.ingest(
        user_id=user_id,
        filename=file.filename or "upload",
        mime_type=file.content_type or "",
        data=data,
    )
    return {"success": True, "document": result}


@router.get("")
def list_documents(
    user_id: str = Depends(get_current_user),
    service: DocumentService = Depends(document_service),
):
    return {"documents": service._repository.list_documents(user_id)}


@router.get("/{document_id}")
def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
    service: DocumentService = Depends(document_service),
):
    record = service._repository.get_document(user_id, document_id)
    record.pop("pages", None)
    return {"document": record}


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
    service: DocumentService = Depends(document_service),
):
    service.remove(user_id, document_id)
    return {"success": True}


@router.post("/{document_id}/index")
def index_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
    service: DocumentService = Depends(document_service),
):
    return service.reindex(user_id, document_id)


@router.get("/{document_id}/clauses")
def list_stored_clauses(
    document_id: str,
    user_id: str = Depends(get_current_user),
    service: DocumentService = Depends(document_service),
):
    return {"clauses": service._repository.list_clauses(user_id, document_id)}
