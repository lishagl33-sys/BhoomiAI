from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from models import District, Taluk, Hobli, Village

class LocationService:
    """
    Manages authentic Karnataka administrative hierarchy for Davanagere and Tumakuru districts.
    Provides dependent lookups: District -> Taluk -> Hobli -> Village.
    """

    KARNATAKA_HIERARCHY = {
        "Davanagere": {
            "Davanagere": {
                "Kasaba": ["Avaragere", "Shabanuru", "Bathi", "Nituvalli", "Doddabathi"],
                "Mayakonda": ["Mayakonda", "Kodaganuru", "Nerligi", "Anaji", "Naraganahalli"],
                "Anagodu": ["Anagodu", "Hale Anagodu", "Tolahunse", "Aluru", "Kandanakodi"]
            },
            "Harihara": {
                "Kasaba": ["Harihara Rural", "Kumbaluru", "Yelehole", "Nandigavi", "Harlapura"],
                "Malebennur": ["Malebennur", "Kondajji", "Bhanuvalli", "Kokganuru", "Gutturu"]
            },
            "Channagiri": {
                "Kasaba": ["Channagiri Rural", "Hodigere", "Maravanji", "Kagathuru", "Devarahalli"],
                "Basavapatna": ["Basavapatna", "Navile", "Tavarekere", "Chiradoni"],
                "Santhebennur": ["Santhebennur", "Kulagatte", "Channeshapura"]
            },
            "Honnali": {
                "Kasaba": ["Honnali Rural", "Belagutti", "Kunduru", "Balleshwara"],
                "Sasvehalli": ["Sasvehalli", "Benakanahalli", "Chiluru", "Kyasinakere"]
            },
            "Nyamathi": {
                "Kasaba": ["Nyamathi Rural", "Suragondanakoppa", "Madanbhavi"],
                "Jeenahalli": ["Jeenahalli", "Arabagatte", "Marikoppa"]
            },
            "Jagalur": {
                "Kasaba": ["Jagalur Rural", "Donnehalli", "Pallagatte", "Bilichodu"],
                "Asagodu": ["Asagodu", "Hosakere", "Bistuvalli", "Kallenahalli"]
            }
        },
        "Tumakuru": {
            "Tumakuru": {
                "Kasaba": ["Melekote", "Oorukere", "Kyathsandra", "Arakere", "Devarayapatna"],
                "Bellavi": ["Bellavi", "Gulur", "Chikkathotlakere", "Mallasandra"],
                "Hebbur": ["Hebbur", "Nagavalli", "Honnudike", "Beladhara"],
                "Urdigere": ["Urdigere", "Pandithanahalli", "Thimmarajanahalli"]
            },
            "Tiptur": {
                "Kasaba": ["Tiptur Rural", "Albur", "Biligere", "Halkurke"],
                "Kibbanahalli": ["Kibbanahalli", "Kankere", "Karadi", "Mathighatta"],
                "Nonavinakere": ["Nonavinakere", "Honnavalli", "Gopalapura"]
            },
            "Gubbi": {
                "Kasaba": ["Gubbi Rural", "Kadaba", "Chelur", "Kallur"],
                "C.S. Pura": ["C.S. Pura", "Hagalavadi", "Nittur", "M.N. Kote"]
            },
            "Kunigal": {
                "Kasaba": ["Kunigal Rural", "Herur", "Begur", "Yediyur"],
                "Amruthur": ["Amruthur", "Huliyurdurga", "Kothagere", "Markonahalli"]
            },
            "Madhugiri": {
                "Kasaba": ["Madhugiri Rural", "Badavanahalli", "Midigeshi", "Dodderi"],
                "Ittigadibbanahalli": ["Ittigadibbanahalli", "Puravara", "R.M. Kote"]
            },
            "Sira": {
                "Kasaba": ["Sira Rural", "Kallambella", "Bukkapatna", "Changavara"]
            },
            "Pavagada": {
                "Kasaba": ["Pavagada Rural", "Nagalamadike", "Y.N. Hosakote"]
            },
            "Koratagere": {
                "Kasaba": ["Koratagere Rural", "Holavanahalli", "Kolala"]
            },
            "Turuvekere": {
                "Kasaba": ["Turuvekere Rural", "Dandinashivara", "Mayasandra"]
            },
            "Chikkanayakanahalli": {
                "Kasaba": ["C.N. Halli Rural", "Settikere", "Kandikere", "Hagalavadi"]
            }
        },
        "Shivamogga": {
            "Shivamogga": {
                "Kasaba": ["Nidige", "Holalur", "Harnahalli", "Kumsi", "Ayanur"],
                "Holalur": ["Holalur Rural", "Bullapura", "Gajanur", "Mandagatta"]
            },
            "Bhadravathi": {
                "Kasaba": ["Bhadravathi Rural", "Barandur", "Kallihal", "Antaragange"],
                "Holehonnur": ["Holehonnur", "Kudligere", "Danayakapura", "Arabilichi"]
            },
            "Thirthahalli": {
                "Kasaba": ["Thirthahalli Rural", "Agumbe", "Mandagadde", "Muthur"],
                "Agumbe": ["Naluru", "Megaravalli", "Karakkiga"]
            },
            "Sagara": {
                "Kasaba": ["Sagara Rural", "Anandapura", "Avinahalli", "Karuru"],
                "Anandapura": ["Yedajigale", "Keladi", "Maluru"]
            },
            "Shikaripura": {
                "Kasaba": ["Shikaripura Rural", "Shiralkoppa", "Udugani", "Hosur"],
                "Shiralkoppa": ["Thagarsi", "Belagavi", "Kallukoppa"]
            },
            "Soraba": {
                "Kasaba": ["Soraba Rural", "Anavatti", "Jade", "Chandragutti"]
            },
            "Hosanagara": {
                "Kasaba": ["Hosanagara Rural", "Nagar", "Kasagodu", "Ripponpet"]
            }
        },
        "Mysuru": {
            "Mysuru": {
                "Kasaba": ["Varuna", "Jayapura", "Ilavala", "Alanahalli", "Srirampura"],
                "Varuna": ["Varuna Rural", "Varakodu", "Dandikere", "Meglapura"],
                "Jayapura": ["Jayapura Rural", "Doddakanya", "Chikkakanya", "Udbur"]
            },
            "Nanjangud": {
                "Kasaba": ["Nanjangud Rural", "Biligere", "Hullahalli", "Kavalande"],
                "Hullahalli": ["Hullahalli Rural", "Debur", "Chikkayyanachhatra"],
                "Biligere": ["Biligere Rural", "Tagadur", "Harathale"]
            },
            "Hunsur": {
                "Kasaba": ["Hunsur Rural", "Bilikere", "Hanagodu", "Gavadagere"],
                "Bilikere": ["Manuganahalli", "Dharmapura", "Rathehalli"]
            },
            "T. Narasipura": {
                "Kasaba": ["T. Narasipura Rural", "Bannur", "Mugur", "Sosale"],
                "Bannur": ["Attahalli", "Turuganur", "Kudaragundi"]
            },
            "K.R. Nagar": {
                "Kasaba": ["K.R. Nagar Rural", "Mirle", "Saligrama", "Bherya"],
                "Saligrama": ["Chunchanakatte", "Lalalandevanahalli"]
            },
            "Piriyapatna": {
                "Kasaba": ["Piriyapatna Rural", "Bettadapura", "Ravandur", "Bylakuppe"]
            },
            "Saragur": {
                "Kasaba": ["Saragur Rural", "Mullur", "Sagare", "Beeramballi"]
            }
        }
    }

    def seed_locations_if_empty(self, db: Session):
        """Seeds authentic Karnataka administrative divisions for Davanagere, Tumakuru, Shivamogga, and Mysuru."""
        for dist_name, taluks in self.KARNATAKA_HIERARCHY.items():
            dist = db.query(District).filter(District.name.ilike(dist_name)).first()
            if not dist:
                dist = District(name=dist_name, state="Karnataka")
                db.add(dist)
                db.flush()

            for taluk_name, hoblis in taluks.items():
                taluk = db.query(Taluk).filter(Taluk.district_id == dist.id, Taluk.name.ilike(taluk_name)).first()
                if not taluk:
                    taluk = Taluk(district_id=dist.id, name=taluk_name)
                    db.add(taluk)
                    db.flush()

                for hobli_name, villages in hoblis.items():
                    hobli = db.query(Hobli).filter(Hobli.taluk_id == taluk.id, Hobli.name.ilike(hobli_name)).first()
                    if not hobli:
                        hobli = Hobli(taluk_id=taluk.id, name=hobli_name)
                        db.add(hobli)
                        db.flush()

                    for village_name in villages:
                        vil = db.query(Village).filter(Village.hobli_id == hobli.id, Village.name.ilike(village_name)).first()
                        if not vil:
                            db.add(Village(hobli_id=hobli.id, name=village_name))
        db.commit()

    def get_districts(self, db: Session) -> List[Dict[str, Any]]:
        return [{"id": d.id, "name": d.name, "state": d.state} for d in db.query(District).all()]

    def get_taluks(self, db: Session, district_id: Optional[int] = None, district_name: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(Taluk)
        if district_id:
            query = query.filter(Taluk.district_id == district_id)
        elif district_name:
            dist = db.query(District).filter(District.name.ilike(district_name)).first()
            if dist:
                query = query.filter(Taluk.district_id == dist.id)
            else:
                return []
        return [{"id": t.id, "district_id": t.district_id, "name": t.name} for t in query.all()]

    def get_hoblis(self, db: Session, taluk_id: Optional[int] = None, taluk_name: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(Hobli)
        if taluk_id:
            query = query.filter(Hobli.taluk_id == taluk_id)
        elif taluk_name:
            taluk = db.query(Taluk).filter(Taluk.name.ilike(taluk_name)).first()
            if taluk:
                query = query.filter(Hobli.taluk_id == taluk.id)
            else:
                return []
        return [{"id": h.id, "taluk_id": h.taluk_id, "name": h.name} for h in query.all()]

    def get_villages(self, db: Session, hobli_id: Optional[int] = None, hobli_name: Optional[str] = None) -> List[Dict[str, Any]]:
        query = db.query(Village)
        if hobli_id:
            query = query.filter(Village.hobli_id == hobli_id)
        elif hobli_name:
            hobli = db.query(Hobli).filter(Hobli.name.ilike(hobli_name)).first()
            if hobli:
                query = query.filter(Village.hobli_id == hobli.id)
            else:
                return []
        return [{"id": v.id, "hobli_id": v.hobli_id, "name": v.name} for v in query.all()]

    def validate_location_consistency(self, db: Session, district: str, taluk: str, hobli: str, village: str) -> Tuple[bool, str]:
        """
        Validates if the provided village truly belongs to the given hobli, taluk, and district.
        Ensures users do not claim unverified or mismatched administrative relationships.
        """
        dist_obj = db.query(District).filter(District.name.ilike(district)).first()
        if not dist_obj:
            return False, f"District '{district}' is not in the authorized Karnataka dataset (Supported: Davanagere, Tumakuru, Shivamogga, Mysuru)."

        taluk_obj = db.query(Taluk).filter(Taluk.district_id == dist_obj.id, Taluk.name.ilike(taluk)).first()
        if not taluk_obj:
            return False, f"Taluk '{taluk}' does not belong to District '{district}'."

        if hobli:
            hobli_obj = db.query(Hobli).filter(Hobli.taluk_id == taluk_obj.id, Hobli.name.ilike(hobli)).first()
            if not hobli_obj:
                return False, f"Hobli '{hobli}' does not belong to Taluk '{taluk}'."

            if village:
                vil_obj = db.query(Village).filter(Village.hobli_id == hobli_obj.id, Village.name.ilike(village)).first()
                if not vil_obj:
                    return False, f"Village '{village}' does not belong to Hobli '{hobli}'."

        return True, "Location verified against administrative reference."

location_service = LocationService()
