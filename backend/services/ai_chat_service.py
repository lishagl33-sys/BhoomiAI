import os
import json
import uuid
import re
import asyncio
import httpx
from datetime import datetime
from typing import AsyncGenerator, Dict, Any, List, Optional
from sqlalchemy.orm import Session


import config
from models import ChatConversation, ChatMessage
from services.geocoding_service import GeocodingService

# Try importing OpenAI client
try:
    from openai import OpenAI, OpenAIError, AuthenticationError, RateLimitError, APIConnectionError
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    OpenAIError = Exception
    AuthenticationError = Exception
    RateLimitError = Exception
    APIConnectionError = Exception


SYSTEM_PROMPT = """You are BhoomiAI Assistant, a helpful and intelligent AI assistant integrated into the BhoomiAI land information platform.

You have two main responsibilities:

A. GENERAL AI ASSISTANT
Answer general questions just like a conversational AI assistant.
You should understand:
- Technology & Programming
- Education & Science
- Mathematics
- Agriculture & Farming Practices
- Geography & Climate
- General Knowledge & Everyday questions

B. LAND INFORMATION SPECIALIST
You specialize in Karnataka land information and geography.
Understand and explain:
- RTC records (Record of Rights, Tenancy and Crops / Form 16 / Pahani)
- Pahani details: Column 9 (Ownership), Column 10 (Occupancy/Tenancy), Column 12 (Crops, Trees, Irrigation)
- Survey numbers, Subdivision / Hissa numbers, Surnoc
- Land ownership concepts, Joint Khatas, Joint Family holdings
- Mutation (Form 21 / MR - Mutation Register), Transfer of Title upon inheritance, sale, gift, partition
- Land registration and Kaveri 2.0 portal procedures
- Agricultural land classifications: Dry Crop (Kushki), Wet Crop (Tari), Garden (Bagayat)
- Land conversion (Section 95 of Karnataka Land Revenue Act, 1964 from agricultural to non-agricultural/commercial/residential use)
- Land measurement and area units in Karnataka:
  * 1 Acre = 40 Guntas
  * 1 Gunta = 1,089 Square Feet (33 ft x 33 ft / 121 sq yards)
  * 1 Acre = 43,560 Square Feet = 4,046.86 Square Meters = 0.404686 Hectares
  * 1 Hectare = 2.471 Acres = ~98.84 Guntas
  * 1 Anna = 1/16th of a Rupee share in ancestral tenancy
- Karnataka land-record procedures: Bhoomi online portal, Mojini (survey / sketch request 11E/FMB), Dishank mobile app, SSLR (Survey Settlement and Land Records)
- Karnataka geographic pilot districts: Tumakuru, Davanagere, Shivamogga, Mysuru

ACCURACY & ETHICAL RULES:
- Never invent landowner names or personal details.
- Never generate fake survey numbers or fabricate legal records.
- Never claim to access official live government databases without actual integration.
- Clearly distinguish general guidance and educational insights from certified, legally binding land records.
- Respect user privacy.
- Explicitly explain when official government verification at the local Taluk Office, Nadakacheri, or Sub-Registrar Office is necessary.

TONE & FORMATTING:
- Use clear, professional, friendly language.
- Format responses cleanly with Markdown: bold key terms, use bullet points, tables for conversions, and numbered steps for procedures.
- When explaining map navigation or selected parcel data, be direct and helpful.
"""

# Common verified Karnataka locations for map triggers
KNOWN_LOCATIONS = {
    "tumakuru": {"name": "Tumakuru", "lat": 13.3409, "lng": 77.1010, "zoom": 12, "district": "Tumakuru", "type": "District Headquarters"},
    "tumkur": {"name": "Tumakuru", "lat": 13.3409, "lng": 77.1010, "zoom": 12, "district": "Tumakuru", "type": "District Headquarters"},
    "davanagere": {"name": "Davanagere", "lat": 14.4644, "lng": 75.9218, "zoom": 12, "district": "Davanagere", "type": "District Headquarters"},
    "davangere": {"name": "Davanagere", "lat": 14.4644, "lng": 75.9218, "zoom": 12, "district": "Davanagere", "type": "District Headquarters"},
    "shivamogga": {"name": "Shivamogga", "lat": 13.9299, "lng": 75.5681, "zoom": 12, "district": "Shivamogga", "type": "District Headquarters"},
    "shimoga": {"name": "Shivamogga", "lat": 13.9299, "lng": 75.5681, "zoom": 12, "district": "Shivamogga", "type": "District Headquarters"},
    "mysuru": {"name": "Mysuru", "lat": 12.2958, "lng": 76.6394, "zoom": 12, "district": "Mysuru", "type": "District Headquarters"},
    "mysore": {"name": "Mysuru", "lat": 12.2958, "lng": 76.6394, "zoom": 12, "district": "Mysuru", "type": "District Headquarters"},
    "maravanji": {"name": "Maravanji", "lat": 14.0321, "lng": 75.9184, "zoom": 15, "taluk": "Channagiri", "district": "Davanagere", "type": "Village"},
    "avaragere": {"name": "Avaragere", "lat": 14.4485, "lng": 75.9420, "zoom": 15, "taluk": "Davanagere", "district": "Davanagere", "type": "Village"},
    "bathi": {"name": "Bathi", "lat": 14.4920, "lng": 75.8850, "zoom": 15, "taluk": "Davanagere", "district": "Davanagere", "type": "Village"},
    "nituvalli": {"name": "Nituvalli", "lat": 14.4530, "lng": 75.9180, "zoom": 15, "taluk": "Davanagere", "district": "Davanagere", "type": "Village"},
    "shabanuru": {"name": "Shabanuru", "lat": 14.4410, "lng": 75.9080, "zoom": 15, "taluk": "Davanagere", "district": "Davanagere", "type": "Village"},
    "melekote": {"name": "Melekote", "lat": 13.3510, "lng": 77.0850, "zoom": 15, "taluk": "Tumakuru", "district": "Tumakuru", "type": "Village"},
    "oorukere": {"name": "Oorukere", "lat": 13.3720, "lng": 77.1210, "zoom": 15, "taluk": "Tumakuru", "district": "Tumakuru", "type": "Village"},
    "kyathsandra": {"name": "Kyathsandra", "lat": 13.3280, "lng": 77.1650, "zoom": 15, "taluk": "Tumakuru", "district": "Tumakuru", "type": "Village / Suburban Hub"},
    "bellavi": {"name": "Bellavi", "lat": 13.4210, "lng": 77.0320, "zoom": 15, "taluk": "Tumakuru", "district": "Tumakuru", "type": "Village"},
    "harihara": {"name": "Harihara", "lat": 14.5120, "lng": 75.8050, "zoom": 14, "taluk": "Harihara", "district": "Davanagere", "type": "Taluk"},
    "channagiri": {"name": "Channagiri", "lat": 14.0250, "lng": 75.9270, "zoom": 14, "taluk": "Channagiri", "district": "Davanagere", "type": "Taluk"},
    "tiptur": {"name": "Tiptur", "lat": 13.2560, "lng": 76.4780, "zoom": 14, "taluk": "Tiptur", "district": "Tumakuru", "type": "Taluk"},
    "gubbi": {"name": "Gubbi", "lat": 13.3120, "lng": 76.9380, "zoom": 14, "taluk": "Gubbi", "district": "Tumakuru", "type": "Taluk"},
}


class AIChatService:
    @staticmethod
    def is_api_key_configured() -> bool:
        """Returns True if a real OpenAI or Google Gemini API key is configured."""
        key = getattr(config, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
        key = key.strip()
        if not key or key == "your_api_key_here" or key.startswith("your_") or len(key) < 15:
            return False
        return True

    @staticmethod
    def get_provider_and_model():
        """Auto-detects API provider based on key structure."""
        key = getattr(config, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
        key = key.strip()
        if key.startswith("AQ.") or key.startswith("AIzaSy"):
            return "gemini", "gemini-2.5-flash"
        return "openai", getattr(config, "OPENAI_MODEL", "gpt-4o-mini") or "gpt-4o-mini"

    @staticmethod
    def get_openai_client() -> Optional[Any]:
        """Returns initialized OpenAI client if available and configured."""
        if not OPENAI_AVAILABLE:
            return None
        key = getattr(config, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
        key = key.strip()
        if not key or key == "your_api_key_here" or key.startswith("your_"):
            return None
        try:
            return OpenAI(api_key=key)
        except Exception as e:
            print(f"[AIChatService] Error initializing OpenAI client: {e}")
            return None

    @staticmethod
    def detect_map_action(message: str, selected_parcel: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Analyzes user query to detect safe, controlled map actions (e.g. fly to Tumakuru, show village).
        Prevents arbitrary script execution by returning strict predefined action schemas.
        """
        msg_lower = message.lower().strip()

        # Check for direct location search / fly commands:
        # e.g., "Show Tumkur", "Navigate to Davanagere", "Find Maravanji village", "Take me to Melekote"
        nav_triggers = ["show", "find", "locate", "zoom to", "go to", "navigate to", "open", "take me to", "display", "where is"]
        is_nav_request = any(trig in msg_lower for trig in nav_triggers)

        for loc_key, loc_data in KNOWN_LOCATIONS.items():
            if re.search(r'\b' + re.escape(loc_key) + r'\b', msg_lower):
                # Trigger navigation action
                return {
                    "action": "navigate_location",
                    "target_name": loc_data["name"],
                    "lat": loc_data["lat"],
                    "lng": loc_data["lng"],
                    "zoom": loc_data["zoom"],
                    "district": loc_data.get("district"),
                    "taluk": loc_data.get("taluk"),
                    "place_type": loc_data.get("type", "Location")
                }

        # Check gazetteer search via GeocodingService
        if is_nav_request:
            clean_query = msg_lower
            for trig in nav_triggers:
                clean_query = clean_query.replace(trig, "")
            clean_query = clean_query.replace("village", "").replace("district", "").replace("taluk", "").replace("map", "").strip()
            if len(clean_query) >= 3:
                try:
                    res = GeocodingService.search_places(clean_query, limit=1)
                    if res and len(res) > 0:
                        place = res[0]
                        return {
                            "action": "navigate_location",
                            "target_name": place.get("name"),
                            "lat": place.get("lat"),
                            "lng": place.get("lng"),
                            "zoom": place.get("zoom", 14),
                            "district": place.get("district"),
                            "taluk": place.get("taluk"),
                            "place_type": place.get("place_type", "Location")
                        }
                except Exception:
                    pass

        # Check if user asks about their selected land
        if selected_parcel and any(p in msg_lower for p in ["selected land", "selected parcel", "my land", "this parcel", "this plot", "explain my plot"]):
            return {
                "action": "inspect_parcel",
                "parcel_id": selected_parcel.get("id"),
                "survey_number": selected_parcel.get("survey_number"),
                "village": selected_parcel.get("village"),
                "district": selected_parcel.get("district")
            }

        return None

    @classmethod
    def generate_fallback_response(cls, message: str, selected_parcel: Optional[Dict[str, Any]] = None) -> str:
        """
        Graceful intelligent response when OPENAI_API_KEY is not yet configured,
        providing real, accurate answers for common Karnataka land and AI queries
        while clearly directing the user to set their API key in backend/.env.
        """
        msg_lower = message.lower().strip()

        notice = (
            "> ℹ️ **Notice: Live OpenAI API Key Not Yet Configured**\n"
            "> To enable unconstrained GPT responses and custom questions, please add your real key to `backend/.env`:\n"
            "> `OPENAI_API_KEY=sk-...`\n\n"
        )

        if "rtc" in msg_lower or "pahani" in msg_lower:
            return notice + (
                "### Understanding RTC & Pahani (Form 16) in Karnataka\n\n"
                "**RTC (Record of Rights, Tenancy and Crops)**, commonly known as **Pahani**, is the primary land record document issued by the **Karnataka Revenue Department** under the Karnataka Land Revenue Act, 1964.\n\n"
                "#### Key Sections of an RTC Document:\n"
                "1. **Header Details**: District, Taluk, Hobli, Village, Survey Number, Surnoc, and Hissa Number.\n"
                "2. **Total Extent (Area)**: Expressed in Acres, Guntas, and Anna (e.g., `2-15-0` = 2 Acres 15 Guntas).\n"
                "3. **Column 9 (Ownership & Patta)**: Name of the registered owner/khatadar, relationship (father/husband), and Khata Number.\n"
                "4. **Column 10 (Tenancy & Possession)**: Details of person in physical possession (usually self-cultivation / 'Khud Kasht').\n"
                "5. **Column 11 (Liabilities & Loans)**: Encumbrances, bank loans, mortgages, or court attachments.\n"
                "6. **Column 12 (Crop Details & Water Source)**: Season-wise standing crops (Kharif, Rabi, Summer), water source (borewell, canal, rainfed), and uncultivated area (Pot Kharab).\n\n"
                "#### How to Access Official RTCs:\n"
                "- Visit the official Karnataka Bhoomi Portal at **bhoomi.karnataka.gov.in**.\n"
                "- Use the Karnataka **Dishaank** mobile application to view georeferenced survey plots."
            )

        if "survey number" in msg_lower or "check my" in msg_lower:
            return notice + (
                "### How to Check Your Land Survey Number in Karnataka\n\n"
                "A **Survey Number** is a unique identification code assigned to a specific tract of land during the cadastral survey conducted by the Survey Settlement and Land Records (SSLR) department.\n\n"
                "#### Steps to Find or Verify Your Survey Number:\n"
                "1. **Check Previous Sale Deed / Title Documents**: The schedule section describes the survey number, hissa, and boundaries.\n"
                "2. **Use Bhoomi Online**: Enter your District, Taluk, Hobli, Village, and Khata number to retrieve active survey numbers in your name.\n"
                "3. **Use the BhoomiAI Interactive Map**:\n"
                "   - Navigate to the **Cadastral GIS** tab.\n"
                "   - Use the **Search Places** bar or zoom to your village (e.g. Melekote, Avaragere, Bathi).\n"
                "   - Click on any parcel polygon to view its assigned survey number, hissa, owner record, and verified acreage."
            )

        if "area" in msg_lower or "calculate" in msg_lower or "convert" in msg_lower or "gunta" in msg_lower or "acre" in msg_lower:
            return notice + (
                "### Karnataka Land Area Measurement & Conversion Guide\n\n"
                "In Karnataka, agricultural land is measured using **Acres** and **Guntas**.\n\n"
                "| Unit | Equivalent in Other Units |\n"
                "| :--- | :--- |\n"
                "| **1 Gunta** | **1,089 Square Feet** (33 ft × 33 ft / 121 sq yards / ~101.17 sq meters) |\n"
                "| **1 Acre** | **40 Guntas** = **43,560 Square Feet** = **4,046.86 Square Meters** |\n"
                "| **1 Hectare** | **2.471 Acres** = **~98.84 Guntas** = **10,000 Square Meters** |\n"
                "| **1 Bigha (North)** | Roughly **0.625 to 1.6 Acres** (varies by state; Gunta is preferred in Karnataka) |\n\n"
                "#### Example Calculation:\n"
                "If your RTC mentions an extent of `3-25` (3 Acres, 25 Guntas):\n"
                "- Total Guntas = $(3 \\times 40) + 25 = 145$ Guntas\n"
                "- Total Square Feet = $145 \\times 1,089 = 157,905$ sq ft."
            )

        if "mutation" in msg_lower or "mr" in msg_lower:
            return notice + (
                "### Understanding Land Mutation (Form 21 / MR) in Karnataka\n\n"
                "**Mutation (Dakhale / Namoona 21)** is the official process of transferring title and updating the revenue register when land ownership changes.\n\n"
                "#### Common Causes of Mutation:\n"
                "1. **Sale / Purchase**: After executing a registered sale deed at the Sub-Registrar office.\n"
                "2. **Inheritance / Succession (Varasath)**: Legal heirs claiming ownership following the demise of the original khatadar.\n"
                "3. **Gift (Dana)** or **Partition (Vibhaga)** among family members.\n"
                "4. **Court Decree**: Ownership decreed by a civil court.\n\n"
                "#### The 30-Day Objection Notice (Form 9 / 10):\n"
                "Once mutation is initiated in Bhoomi, the Revenue Inspector issues a public notice (Form 9) with a **30-day notice period** allowing interested parties or co-owners to register objections before the Village Accountant certifies the mutation."
            )

        if "village" in msg_lower or "find" in msg_lower or "map" in msg_lower:
            return notice + (
                "### Finding Villages on the BhoomiAI Cadastral Map\n\n"
                "BhoomiAI provides interactive cadastral mapping across pilot districts: **Tumakuru, Davanagere, Shivamogga, and Mysuru**.\n\n"
                "#### How to Navigate:\n"
                "- Type any location in this chat (e.g. *\"Show Tumkur\"*, *\"Find Maravanji village\"*, *\"Go to Avaragere\"*).\n"
                "- Click the **Cadastral GIS** tab in the navigation bar.\n"
                "- Use the top-left Search Bar to jump to specific villages, colleges (e.g. SIT Tumakuru), or landmarks.\n"
                "- Toggle between **Normal Roadmap** and **Satellite Aerial View** in the top-right corner to inspect rooftops and boundary lines."
            )

        if selected_parcel and ("selected land" in msg_lower or "my land" in msg_lower or "this parcel" in msg_lower):
            p = selected_parcel
            return notice + (
                f"### Analysis of Currently Selected Land Parcel\n\n"
                f"- **District**: {p.get('district', 'N/A')}\n"
                f"- **Taluk**: {p.get('taluk', 'N/A')}\n"
                f"- **Hobli**: {p.get('hobli', 'N/A')}\n"
                f"- **Village**: {p.get('village', 'N/A')}\n"
                f"- **Survey Number**: **{p.get('survey_number', 'N/A')}** / Hissa: **{p.get('hissa_number', '1')}**\n"
                f"- **Land Area**: **{p.get('area_acres', 'N/A')} Acres**\n"
                f"- **Land Classification**: {p.get('land_type', 'Agricultural')}\n"
                f"- **Verification Status**: `{p.get('verification_status', 'VERIFIED_AUTHORIZED')}`\n\n"
                f"#### Guidance:\n"
                f"This parcel is mapped within {p.get('village', 'the selected village')}. You can use the map tools to measure distances, verify field boundary stones, or generate an official audit report."
            )

        return notice + (
            "### Hello from BhoomiAI Assistant 👋\n\n"
            f"You asked: *\"{message}\"*\n\n"
            "BhoomiAI Assistant is built to assist you with:\n"
            "1. **Karnataka Land Records**: RTC, Pahani, Survey numbers, Mutational register, Khata transfers.\n"
            "2. **Area & Unit Conversions**: Acres, Guntas, Cents, Hectares, and Square Feet.\n"
            "3. **Geographical Navigation**: Navigating Tumakuru, Davanagere, Shivamogga, and Mysuru.\n"
            "4. **General Knowledge**: Science, technology, education, mathematics, and agricultural practices.\n\n"
            "To connect this assistant to live OpenAI GPT-4o intelligence, add your API key to `backend/.env`:\n"
            "```env\n"
            "OPENAI_API_KEY=sk-your-actual-openai-api-key\n"
            "OPENAI_MODEL=gpt-4o-mini\n"
            "```"
        )

    @classmethod
    async def stream_chat_response(
        cls,
        db: Session,
        conversation_id: Optional[str],
        user_message: str,
        selected_parcel_context: Optional[Dict[str, Any]] = None,
        current_map_view: Optional[Dict[str, Any]] = None,
        user_id: str = "guest-user"
    ) -> AsyncGenerator[str, None]:
        """
        Streams ChatGPT-like AI response with real-time SSE chunks,
        incorporating conversation history, OpenAI streaming completions,
        and safe map action events.
        """
        # 1. Resolve or create conversation
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            conv = ChatConversation(
                id=conversation_id,
                user_id=user_id,
                title=user_message[:40] + ("..." if len(user_message) > 40 else ""),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(conv)
            db.commit()
        else:
            conv = db.query(ChatConversation).filter(
                ChatConversation.id == conversation_id,
                ChatConversation.user_id == user_id
            ).first()
            if not conv:
                conv = ChatConversation(
                    id=conversation_id,
                    user_id=user_id,
                    title=user_message[:40] + ("..." if len(user_message) > 40 else ""),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(conv)
                db.commit()

        # 2. Check for map action
        map_action = cls.detect_map_action(user_message, selected_parcel_context)
        map_action_json = json.dumps(map_action) if map_action else None

        # 3. Save User message to DB
        user_msg_record = ChatMessage(
            conversation_id=conversation_id,
            role="user",
            content=user_message,
            created_at=datetime.utcnow()
        )
        db.add(user_msg_record)
        conv.updated_at = datetime.utcnow()
        db.commit()

        # Emit initial event with conversation ID and detected map action if any
        init_payload = {
            "type": "start",
            "conversation_id": conversation_id,
            "title": conv.title,
            "map_action": map_action
        }
        yield f"data: {json.dumps(init_payload)}\n\n"

        # 4. Check if live AI API is configured
        full_assistant_reply = ""
        provider, model_name = cls.get_provider_and_model()
        api_key = (getattr(config, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")).strip()

        if cls.is_api_key_configured():
            recent_messages = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conversation_id
            ).order_by(ChatMessage.id.asc()).limit(15).all()

            # Compile parcel context if available
            parcel_info = ""
            if selected_parcel_context:
                parcel_info = (
                    f"\n\nUSER'S CURRENTLY SELECTED MAP PARCEL:\n"
                    f"- Survey Number: {selected_parcel_context.get('survey_number', 'Unknown')}\n"
                    f"- Hissa: {selected_parcel_context.get('hissa_number', '1')}\n"
                    f"- Village: {selected_parcel_context.get('village', 'Unknown')}\n"
                    f"- Taluk: {selected_parcel_context.get('taluk', 'Unknown')}\n"
                    f"- District: {selected_parcel_context.get('district', 'Unknown')}\n"
                    f"- Area: {selected_parcel_context.get('area_acres', 'Unknown')} Acres\n"
                    f"- Verification Status: {selected_parcel_context.get('verification_status', 'N/A')}\n"
                    f"- Land Type: {selected_parcel_context.get('land_type', 'Agricultural')}\n"
                    f"If the user asks about their selected land, use this factual information."
                )

            if provider == "gemini":
                # Google Gemini streaming integration
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?key={api_key}&alt=sse"
                
                # Format conversation turns for Gemini (role 'user' or 'model')
                gemini_contents = []
                for m in recent_messages:
                    g_role = "user" if m.role == "user" else "model"
                    gemini_contents.append({"role": g_role, "parts": [{"text": m.content}]})

                gemini_payload = {
                    "system_instruction": {
                        "parts": [{"text": SYSTEM_PROMPT + parcel_info}]
                    },
                    "contents": gemini_contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 2048
                    }
                }

                try:
                    async with httpx.AsyncClient(timeout=45.0) as http_client:
                        async with http_client.stream("POST", gemini_url, json=gemini_payload) as resp:
                            if resp.status_code != 200:
                                err_text = await resp.aread()
                                raise Exception(f"Gemini API status {resp.status_code}: {err_text.decode('utf-8')[:200]}")
                            
                            async for line in resp.aiter_lines():
                                line = line.strip()
                                if line.startswith("data:"):
                                    data_str = line[5:].strip()
                                    if data_str:
                                        try:
                                            chunk_json = json.loads(data_str)
                                            parts = chunk_json.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                                            for p in parts:
                                                text_piece = p.get("text", "")
                                                if text_piece:
                                                    full_assistant_reply += text_piece
                                                    yield f"data: {json.dumps({'type': 'chunk', 'content': text_piece})}\n\n"
                                                    await asyncio.sleep(0.01)
                                        except Exception:
                                            pass
                except Exception as e:
                    error_msg = f"\n\n> ⚠️ **AI API Notice**: Encountered API error: `{str(e)}`. Falling back to internal knowledge base."
                    full_assistant_reply += error_msg
                    yield f"data: {json.dumps({'type': 'chunk', 'content': error_msg})}\n\n"
                    fallback_part = "\n\n" + cls.generate_fallback_response(user_message, selected_parcel_context)
                    full_assistant_reply += fallback_part
                    yield f"data: {json.dumps({'type': 'chunk', 'content': fallback_part})}\n\n"

            else:
                # OpenAI streaming integration
                client = cls.get_openai_client()
                if client:
                    messages_payload = [{"role": "system", "content": SYSTEM_PROMPT + parcel_info}]
                    for m in recent_messages:
                        messages_payload.append({"role": m.role, "content": m.content})

                    try:
                        response_stream = client.chat.completions.create(
                            model=model_name,
                            messages=messages_payload,
                            stream=True,
                            temperature=0.7,
                            max_tokens=1500
                        )

                        for chunk in response_stream:
                            delta = chunk.choices[0].delta
                            if delta and delta.content:
                                text_part = delta.content
                                full_assistant_reply += text_part
                                chunk_event = {
                                    "type": "chunk",
                                    "content": text_part
                                }
                                yield f"data: {json.dumps(chunk_event)}\n\n"
                                await asyncio.sleep(0.01)
                    except Exception as e:
                        error_msg = f"\n\n> ⚠️ **OpenAI API Notice**: Encountered API error: `{str(e)}`. Falling back to internal knowledge base."
                        full_assistant_reply += error_msg
                        yield f"data: {json.dumps({'type': 'chunk', 'content': error_msg})}\n\n"
                        fallback_part = "\n\n" + cls.generate_fallback_response(user_message, selected_parcel_context)
                        full_assistant_reply += fallback_part
                        yield f"data: {json.dumps({'type': 'chunk', 'content': fallback_part})}\n\n"
                else:
                    fallback_text = cls.generate_fallback_response(user_message, selected_parcel_context)
                    full_assistant_reply = fallback_text
                    words = fallback_text.split(" ")
                    buffer = ""
                    for i, word in enumerate(words):
                        buffer += word + " "
                        if i % 3 == 0 or i == len(words) - 1:
                            yield f"data: {json.dumps({'type': 'chunk', 'content': buffer})}\n\n"
                            buffer = ""
                            await asyncio.sleep(0.02)

        else:
            # Fallback simulated typewriter stream
            fallback_text = cls.generate_fallback_response(user_message, selected_parcel_context)
            full_assistant_reply = fallback_text

            words = fallback_text.split(" ")
            buffer = ""
            for i, word in enumerate(words):
                buffer += word + " "
                if i % 3 == 0 or i == len(words) - 1:
                    chunk_event = {
                        "type": "chunk",
                        "content": buffer
                    }
                    yield f"data: {json.dumps(chunk_event)}\n\n"
                    buffer = ""
                    await asyncio.sleep(0.02)

        # 5. Save Assistant message to DB
        assistant_msg_record = ChatMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=full_assistant_reply,
            map_action=map_action_json,
            created_at=datetime.utcnow()
        )
        db.add(assistant_msg_record)
        conv.updated_at = datetime.utcnow()
        db.commit()

        # Emit completion event
        done_payload = {
            "type": "done",
            "conversation_id": conversation_id,
            "title": conv.title,
            "map_action": map_action
        }
        yield f"data: {json.dumps(done_payload)}\n\n"
        yield "data: [DONE]\n\n"
