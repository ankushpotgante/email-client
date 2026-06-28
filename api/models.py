from pydantic import BaseModel, Field
from typing import List, Optional

class Account(BaseModel):
    id: str
    name: str
    type: str  # gmail, office365, imap
    email: str
    password: Optional[str] = None

class Email(BaseModel):
    id: str
    accountId: str
    from_email: str = Field(..., alias="fromEmail")
    from_name: str = Field(..., alias="fromName")
    to_email: str = Field(..., alias="toEmail")
    subject: str
    body: str
    date: str
    folder: str  # inbox, archived, trash, sent, drafts
    labels: List[str] = Field(default_factory=list)
    read: bool = False
    priority: str = "medium"  # high, medium, low
    priority_reason: Optional[str] = Field(None, alias="priorityReason")
    summary: Optional[str] = None

    class Config:
        populate_by_name = True

class FolderAction(BaseModel):
    emailIds: List[str]
    folder: str

class LabelAction(BaseModel):
    emailIds: List[str]
    label: str
    action: str  # add, remove

class DraftRequest(BaseModel):
    emailId: str
    prompt: Optional[str] = None
    tone: Optional[str] = "professional"  # professional, friendly, casual, urgent

class DraftResponse(BaseModel):
    body: str
