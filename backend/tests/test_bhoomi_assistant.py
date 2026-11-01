import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import ChatConversation, ChatMessage
from services.ai_chat_service import AIChatService

client = TestClient(app)

def test_chat_status_endpoint():
    response = client.get("/api/chat/status")
    assert response.status_code == 200
    data = response.json()
    assert "api_key_configured" in data
    assert "model" in data
    assert "service_status" in data
    assert "message" in data


def test_map_action_detection():
    # Test Tumkur detection
    action = AIChatService.detect_map_action("Please show Tumkur on the map")
    assert action is not None
    assert action["action"] == "navigate_location"
    assert "Tumakuru" in action["target_name"]
    assert action["lat"] == 13.3409
    assert action["lng"] == 77.1010

    # Test Davanagere detection
    action2 = AIChatService.detect_map_action("Find Davanagere")
    assert action2 is not None
    assert action2["action"] == "navigate_location"
    assert "Davanagere" in action2["target_name"]

    # Test selected land inspection
    sample_parcel = {
        "id": 101,
        "survey_number": "45/2",
        "village": "Melekote",
        "district": "Tumakuru"
    }
    action3 = AIChatService.detect_map_action("Explain my selected land details", selected_parcel=sample_parcel)
    assert action3 is not None
    assert action3["action"] == "inspect_parcel"
    assert action3["parcel_id"] == 101


def test_chat_stream_and_persistence():
    user_header = {"X-User-Id": "test-suite-user-001"}
    
    # 1. First question (Create conversation)
    payload = {
        "message": "What is RTC and Pahani in Karnataka?"
    }
    response = client.post("/api/chat", json=payload, headers=user_header)
    assert response.status_code == 200
    
    # Check that stream emits SSE chunks
    text_content = response.text
    assert "data:" in text_content
    assert "[DONE]" in text_content

    # 2. Verify conversation listed in GET /api/chat/conversations
    list_res = client.get("/api/chat/conversations", headers=user_header)
    assert list_res.status_code == 200
    convs = list_res.json()
    assert len(convs) >= 1
    created_conv = convs[0]
    conv_id = created_conv["id"]
    assert "RTC" in created_conv["title"] or "Pahani" in created_conv["title"]

    # 3. Follow-up question with conversation_id (Multi-turn memory)
    follow_up_payload = {
        "conversation_id": conv_id,
        "message": "What details does Column 9 and Column 12 contain?"
    }
    follow_up_res = client.post("/api/chat", json=follow_up_payload, headers=user_header)
    assert follow_up_res.status_code == 200
    assert "[DONE]" in follow_up_res.text

    # 4. Retrieve full conversation history
    detail_res = client.get(f"/api/chat/conversations/{conv_id}", headers=user_header)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == conv_id
    assert len(detail["messages"]) >= 4  # 2 user messages + 2 assistant messages

    # 5. Delete conversation
    del_res = client.delete(f"/api/chat/conversations/{conv_id}", headers=user_header)
    assert del_res.status_code == 200

    # 6. Verify deleted
    verify_res = client.get(f"/api/chat/conversations/{conv_id}", headers=user_header)
    assert verify_res.status_code == 404


def test_chat_empty_message_validation():
    response = client.post("/api/chat", json={"message": "   "})
    assert response.status_code == 400


def test_chat_message_length_validation():
    long_msg = "A" * 5000
    response = client.post("/api/chat", json={"message": long_msg})
    assert response.status_code == 400
