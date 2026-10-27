import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from config import SAMPLES_DIR

class SampleGenerator:
    def __init__(self):
        self.samples_dir = SAMPLES_DIR

    def generate_all_samples(self):
        """Generates realistic synthetic land record documents including native Indic scripts."""
        self._generate_rtc_sample()
        self._generate_sale_deed_sample()
        self._generate_712_sample()
        self._generate_duplicate_rtc_sample()
        self._generate_kannada_sample()
        self._generate_marathi_sample()
        self._generate_hindi_sample()
        self._generate_tumakuru_sample()
        self._generate_tumakuru_mismatch_sample()
        self._generate_davanagere_sample()
        self._generate_davanagere_mismatch_sample()
        self._generate_maravanji_sample()

    def _draw_header(self, draw, title: str, subtitle: str, emblem_text: str = "सत्यमेव जयते"):
        # Header border
        draw.rectangle([20, 20, 780, 1080], outline=(40, 40, 40), width=2)
        draw.rectangle([26, 26, 774, 1074], outline=(100, 100, 100), width=1)
        
        # Emblem and title
        draw.text((360, 40), emblem_text, fill=(30, 41, 59))
        draw.text((220, 65), title, fill=(15, 23, 42))
        draw.text((250, 90), subtitle, fill=(71, 85, 105))
        draw.line([40, 115, 760, 115], fill=(148, 163, 184), width=1)

    def _generate_rtc_sample(self):
        img = Image.new("RGB", (800, 1100), color=(253, 252, 248))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT",
            "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16"
        )

        content = [
            ("State: Karnataka", "District: Bengaluru Rural"),
            ("Taluk: Devanahalli", "Hobli: Kasaba"),
            ("Village: Vijayapura", "Survey No: 142/2"),
            ("Hissa / Sub-division: 2", "Mutation No: MR-142/2021"),
            ("Owner Name: Ramesh Chandra Gowda", "Relative: Late Venkatappa Gowda"),
            ("Owner Share: 100%", "Land Extent: 3 Acres 20 Guntas"),
            ("Land Classification: Dry Crop (Agricultural)", "Assessment / Tax: Rs. 145.50"),
            ("Govt Valuation: Rs. 45,00,000", "Registration Date: 14/08/2021"),
            ("Boundaries:", "North: Sy No 142/1 | South: Grama Thana Road"),
            ("", "East: Sy No 143 | West: Nala / Canal"),
            ("Liabilities / Loans: NIL", "Status: Certified Clear Title")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(30, 41, 59))
            draw.text((420, y), col2, fill=(30, 41, 59))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(241, 245, 249), width=1)

        draw.ellipse([580, 850, 720, 990], outline=(37, 99, 235), width=3)
        draw.text((605, 900), "REVENUE\nOFFICER\nBANGALORE", fill=(37, 99, 235))

        out_path = self.samples_dir / "sample_rtc_karnataka.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_rtc_karnataka.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
                "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16\n"
                "State: Karnataka | District: Bengaluru Rural | Taluk: Devanahalli\n"
                "Village: Vijayapura | Survey No: 142/2 | Hissa: 2\n"
                "Owner Name: Ramesh Chandra Gowda | Father's Name: Late Venkatappa Gowda\n"
                "Owner Share: 100% | Land Extent: 3 Acres 20 Guntas\n"
                "Land Classification: Dry Crop (Agricultural) | Valuation: Rs. 45,00,000\n"
                "Mutation Number: MR-142/2021 | Registration Date: 14/08/2021\n"
                "Boundaries: North: Sy No 142/1, South: Grama Thana Road, East: Sy No 143, West: Nala / Canal"
            )

    def _generate_sale_deed_sample(self):
        """Intentional 3 Acres 35 Guntas vs 3 Acres 20 Guntas in RTC -> Triggers mismatch!"""
        img = Image.new("RGB", (800, 1100), color=(255, 250, 240))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "DEPARTMENT OF STAMPS AND REGISTRATION - GOVT OF KARNATAKA",
            "REGISTERED SALE DEED / CONVEYANCE DEED (BOOK I)"
        )

        content = [
            ("State: Karnataka", "District: Bengaluru Rural"),
            ("Taluk: Devanahalli", "Sub-Registrar Office: Devanahalli"),
            ("Village: Vijayapura", "Survey No: 142/2"),
            ("Sub-Division: 2", "Deed Doc No: DNH-1-04521-2023"),
            ("Vendor / Seller: Ramesh Chandra Gowda", "Purchaser / Buyer: Suresh Kumar"),
            ("Father's Name: Late Venkatappa Gowda", "Purchaser Father: Mohan Lal Kumar"),
            ("Owner Share: 100%", "Land Extent: 3 Acres 35 Guntas"),
            ("Land Classification: Agricultural", "Consideration Amount: Rs. 52,00,000"),
            ("Stamp Duty Paid: Rs. 2,86,000", "Registration Date: 22/11/2023"),
            ("Boundaries:", "North: Sy No 142/1 | South: Grama Road"),
            ("", "East: Sy No 143 | West: Nala Drainage"),
            ("Encumbrance: Nil Freehold", "Registration Status: Registered")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(20, 20, 20))
            draw.text((420, y), col2, fill=(20, 20, 20))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(230, 225, 215), width=1)

        draw.rectangle([550, 850, 720, 970], outline=(180, 83, 9), width=2)
        draw.text((565, 890), "SUB-REGISTRAR\nREGISTERED\n22-NOV-2023", fill=(180, 83, 9))

        out_path = self.samples_dir / "sample_sale_deed_mismatch.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_sale_deed_mismatch.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "DEPARTMENT OF STAMPS AND REGISTRATION - GOVT OF KARNATAKA\n"
                "REGISTERED SALE DEED / CONVEYANCE DEED (BOOK I)\n"
                "State: Karnataka | District: Bengaluru Rural | Taluk: Devanahalli\n"
                "Village: Vijayapura | Survey No: 142/2 | Hissa: 2\n"
                "Purchaser / Owner Name: Suresh Kumar | Vendor: Ramesh Chandra Gowda\n"
                "Relative Name: Mohan Lal Kumar | Owner Share: 100%\n"
                "Land Extent: 3 Acres 35 Guntas | Valuation: Rs. 52,00,000\n"
                "Document Type: Registered Sale Deed | Registration Date: 22/11/2023\n"
                "Boundaries: North: Sy No 142/1, South: Grama Road, East: Sy No 143, West: Nala Drainage"
            )

    def _generate_712_sample(self):
        img = Image.new("RGB", (800, 1100), color=(252, 253, 255))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "GOVERNMENT OF MAHARASHTRA - REVENUE DEPARTMENT",
            "VILLAGE FORM VII-XII (7/12 EXTRACT) - ADHIKAR ABHILEKH PATRA"
        )

        content = [
            ("State: Maharashtra", "District: Pune"),
            ("Taluk: Haveli", "Village: Wagholi"),
            ("Gat No / Survey No: 88/1", "Pot Hissa: 1"),
            ("Khatadar / Owner Name: Shivaji Vitthal Patil", "Father's Name: Vitthal Patil"),
            ("Total Land Extent: 1.45 Hectares", "Standard Equivalent: 3.58 Acres"),
            ("Land Classification: Bagayat (Garden / Irrigated)", "Judi / Land Revenue: Rs. 85.00"),
            ("Mutation Number: Ferfar No. 1104", "Date: 10/05/2022"),
            ("Owner Share: 100%", "Valuation: Rs. 65,00,000"),
            ("Boundaries:", "North: Gat No 87 | South: Village Main Road"),
            ("", "East: Gat No 89 | West: Canal Stream"),
            ("Other Rights / Itar Hakka: Nil", "Status: Certified Clear Title")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(15, 23, 42))
            draw.text((420, y), col2, fill=(15, 23, 42))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(226, 232, 240), width=1)

        draw.ellipse([580, 850, 720, 990], outline=(13, 148, 136), width=3)
        draw.text((610, 900), "TALATHI\nWAGHOLI\nPUNE DIV", fill=(13, 148, 136))

        out_path = self.samples_dir / "sample_712_maharashtra.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_712_maharashtra.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "GOVERNMENT OF MAHARASHTRA - REVENUE DEPARTMENT\n"
                "VILLAGE FORM VII-XII (7/12 EXTRACT) - ADHIKAR ABHILEKH PATRA\n"
                "State: Maharashtra | District: Pune | Taluk: Haveli | Village: Wagholi\n"
                "Survey No: 88/1 | Sub-division: 1\n"
                "Owner Name: Shivaji Vitthal Patil | Relative Name: Vitthal Patil\n"
                "Land Extent: 1.45 Hectares | Land Classification: Bagayat (Garden)\n"
                "Mutation Number: Ferfar 1104 | Registration Date: 10/05/2022\n"
                "Owner Share: 100% | Valuation: Rs. 65,00,000\n"
                "Boundaries: North: Gat No 87, South: Village Main Road, East: Gat No 89, West: Canal Stream"
            )

    def _generate_duplicate_rtc_sample(self):
        img = Image.new("RGB", (800, 1100), color=(253, 252, 248))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT",
            "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16 [DUPLICATE CLAIM]"
        )

        content = [
            ("State: Karnataka", "District: Bengaluru Rural"),
            ("Taluk: Devanahalli", "Hobli: Kasaba"),
            ("Village: Vijayapura", "Survey No: 142/2"),
            ("Hissa: 2", "Mutation No: MR-142/2021"),
            ("Owner Name: Ramesha C Gouda", "Relative: Late Venkatappa Gouda"),
            ("Owner Share: 100%", "Land Extent: 3 Acres 20 Guntas"),
            ("Land Classification: Agricultural", "Govt Valuation: Rs. 45,00,000"),
            ("Registration Date: 14/08/2021", "Status: Duplicate Verification"),
            ("Boundaries:", "North: Sy No 142/1 | South: Grama Road"),
            ("", "East: Sy No 143 | West: Nala")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(30, 41, 59))
            draw.text((420, y), col2, fill=(30, 41, 59))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(241, 245, 249), width=1)

        out_path = self.samples_dir / "sample_rtc_duplicate.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_rtc_duplicate.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
                "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16\n"
                "State: Karnataka | District: Bengaluru Rural | Taluk: Devanahalli\n"
                "Village: Vijayapura | Survey No: 142/2 | Hissa: 2\n"
                "Owner Name: Ramesha C Gouda | Relative Name: Late Venkatappa Gouda\n"
                "Owner Share: 100% | Land Extent: 3 Acres 20 Guntas\n"
                "Land Classification: Agricultural | Valuation: Rs. 45,00,000\n"
                "Mutation Number: MR-142/2021 | Registration Date: 14/08/2021\n"
                "Boundaries: North: Sy No 142/1, South: Grama Road, East: Sy No 143, West: Nala"
            )

    def _generate_kannada_sample(self):
        """Kannada script document: ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಕಂದಾಯ ಇಲಾಖೆ (ಪಹಣಿ ಪತ್ರ)"""
        img = Image.new("RGB", (800, 1100), color=(254, 252, 245))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "KARNATAKA REVENUE DEPARTMENT - BHOOMI PORTAL",
            "RECORD OF RIGHTS, TENANCY AND CROPS (PAHANI FORM 16) - KANNADA",
            emblem_text="ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಸತ್ಯಮೇವ ಜಯತೇ"
        )

        content = [
            ("ರಾಜ್ಯ: ಕರ್ನಾಟಕ (Karnataka)", "ಜಿಲ್ಲೆ: ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ (Bengaluru Rural)"),
            ("ತಾಲೂಕು: ದೇವನಹಳ್ಳಿ (Devanahalli)", "ಹೋಬಳಿ: ಕಸಬಾ (Kasaba)"),
            ("ಗ್ರಾಮ: ವಿಜಯಪುರ (Vijayapura)", "ಸರ್ವೆ ನಂ: 142/2 (Survey No: 142/2)"),
            ("ಹಿಸ್ಸಾ: 2 (Hissa: 2)", "ಮ್ಯುಟೇಶನ್ ನಂ: MR-142/2021"),
            ("ಖಾತೆದಾರರ ಹೆಸರು: ರಮೇಶ್ ಚಂದ್ರ ಗೌಡ", "ತಂದೆ ಹೆಸರು: ಲೇಟ್ ವೆಂಕಟಪ್ಪ ಗೌಡ"),
            ("ಮಾಲೀಕತ್ವದ ಪಾಲು: 100%", "ವಿಸ್ತೀರ್ಣ: 3 ಎಕರೆ 20 ಗುಂಟೆ (3.5 Acres)"),
            ("ಜಮೀನಿನ ವಿವರ: ಕುಷ್ಕಿ ಜಮೀನು (Dry Crop)", "ಕಂದಾಯ ಆಕಾರ: ರೂ 145.50"),
            ("ಮೌಲ್ಯಮಾಪನ: ರೂ 45,00,000", "ನೋಂದಣಿ ದಿನಾಂಕ: 14/08/2021"),
            ("ಚತುಸ್ಸೀಮೆ:", "ಉತ್ತರ: ಸರ್ವೆ 142/1 | ದಕ್ಷಿಣ: ಗ್ರಾಮ ಠಾಣಾ ರಸ್ತೆ"),
            ("", "ಪೂರ್ವ: ಸರ್ವೆ 143 | ಪಶ್ಚಿಮ: ನಾಲೆ")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(20, 30, 50))
            draw.text((420, y), col2, fill=(20, 30, 50))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(235, 240, 245), width=1)

        draw.ellipse([580, 850, 720, 990], outline=(16, 185, 129), width=3)
        draw.text((610, 900), "ತಹಶೀಲ್ದಾರ್\nದೇವನಹಳ್ಳಿ\nಬೆಂಗಳೂರು", fill=(16, 185, 129))

        out_path = self.samples_dir / "sample_kannada_rtc.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_kannada_rtc.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಕಂದಾಯ ಇಲಾಖೆ (ಭೂಮಿ)\n"
                "ಹಕ್ಕು ದಾಖಲೆಗಳು, ಗೇಣಿ ಮತ್ತು ಬೆಳೆಗಳ ವಿವರ (ಪಹಣಿ ಪತ್ರ - ನಮೂನೆ 16)\n"
                "ಜಿಲ್ಲೆ: ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ | ತಾಲೂಕು: ದೇವನಹಳ್ಳಿ | ಗ್ರಾಮ: ವಿಜಯಪುರ\n"
                "ಸರ್ವೆ ನಂ: 142/2 | ಹಿಸ್ಸಾ: 2\n"
                "ಖಾತೆದಾರರ ಹೆಸರು: ರಮೇಶ್ ಚಂದ್ರ ಗೌಡ | ತಂದೆ ಹೆಸರು: ಲೇಟ್ ವೆಂಕಟಪ್ಪ ಗೌಡ\n"
                "ವಿಸ್ತೀರ್ಣ: 3 ಎಕರೆ 20 ಗುಂಟೆ (3.50 Acres)\n"
                "ಜಮೀನಿನ ವರ್ಗೀಕರಣ: ಕುಷ್ಕಿ ಜಮೀನು (Dry Crop) | ಮೌಲ್ಯಮಾಪನ: ರೂ 45,00,000\n"
                "ಮ್ಯುಟೇಶನ್ ನಂ: MR-142/2021 | ನೋಂದಣಿ ದಿನಾಂಕ: 14/08/2021\n"
                "ಚತುಸ್ಸೀಮೆ: ಉತ್ತರ: ಸರ್ವೆ 142/1, ದಕ್ಷಿಣ: ಗ್ರಾಮ ರಸ್ತೆ, ಪೂರ್ವ: ಸರ್ವೆ 143, ಪಶ್ಚಿಮ: ನಾಲೆ"
            )

    def _generate_marathi_sample(self):
        """Marathi script document: महाराष्ट्र शासन - सातबारा उतारा"""
        img = Image.new("RGB", (800, 1100), color=(253, 253, 255))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "MAHARASHTRA LAND REVENUE - MAHABHULEKH",
            "VILLAGE FORM 7/12 (SAAT-BAARA UTARA) - MARATHI SCRIPT",
            emblem_text="महाराष्ट्र शासन - सत्यमेव जयते"
        )

        content = [
            ("राज्य: महाराष्ट्र (Maharashtra)", "जिल्हा: पुणे (Pune)"),
            ("तालुका: हवेली (Haveli)", "गाव: वाघोली (Wagholi)"),
            ("गट क्र: 88/1 (Gat No: 88/1)", "पोट हिस्सा: 1 (Pot Hissa: 1)"),
            ("खातेदार नाव: शिवाजी विठ्ठल पाटील", "वडिलांचे नाव: विठ्ठल पाटील"),
            ("एकूण क्षेत्र: 1.45 हेक्टर (3.58 Acres)", "जमीन वर्ग: बागायत (Garden)"),
            ("फेरफार क्र: 1104", "नोंदणी तारीख: 10/05/2022"),
            ("खातेदार हिस्सा: 100%", "सरकारी मूल्यांकन: रु 65,00,000"),
            ("चतुःसीमा:", "उत्तर: गट क्र 87 | दक्षिण: मुख्य रस्ता"),
            ("", "पूर्व: गट क्र 89 | पश्चिम: कालवा प्रवाह")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(15, 23, 42))
            draw.text((420, y), col2, fill=(15, 23, 42))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(230, 235, 245), width=1)

        draw.ellipse([580, 850, 720, 990], outline=(13, 148, 136), width=3)
        draw.text((615, 900), "तलाठी\nवाघोली\nपुणे विभाग", fill=(13, 148, 136))

        out_path = self.samples_dir / "sample_marathi_712.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_marathi_712.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "महाराष्ट्र शासन - महसूल विभाग (महाभूलेख)\n"
                "गाव नमुना ७/१२ (अधिकार अभिलेख व पीक पाहणी पत्रक)\n"
                "जिल्हा: पुणे | तालुका: हवेली | गाव: वाघोली\n"
                "गट क्र: 88/1 | पोट हिस्सा: 1\n"
                "खातेदार नाव: शिवाजी विठ्ठल पाटील | वडिलांचे नाव: विठ्ठल पाटील\n"
                "एकूण क्षेत्र: 1.45 हेक्टर (3.58 Acres)\n"
                "फेरफार क्र: 1104 | नोंदणी तारीख: 10/05/2022\n"
                "जमीन वर्ग: बागायत जमीन | सरकारी मूल्यांकन: रु 65,00,000\n"
                "चतुःसीमा: उत्तर: गट क्र 87, दक्षिण: मुख्य रस्ता, पूर्व: गट क्र 89, पश्चिम: कालवा"
            )

    def _generate_hindi_sample(self):
        """Hindi script document: उत्तर प्रदेश राजस्व परिषद - खतौनी"""
        img = Image.new("RGB", (800, 1100), color=(255, 253, 248))
        draw = ImageDraw.Draw(img)

        self._draw_header(
            draw,
            "BOARD OF REVENUE UTTAR PRADESH - BHULEKH",
            "KHATAUNI (RIGHT OF RECORD - FORM B-4) - HINDI DEVANAGARI",
            emblem_text="उत्तर प्रदेश सरकार - सत्यमेव जयते"
        )

        content = [
            ("राज्य: उत्तर प्रदेश (UP)", "जनपद / जिला: लखनऊ (Lucknow)"),
            ("तहसील: बख्शी का तालाब", "परगना: महोना"),
            ("ग्राम: कठवारा (Kathwara)", "खसरा संख्या / गाटा: 312"),
            ("खाता संख्या: 00145", "खातेदार: राजेश कुमार यादव"),
            ("पिता का नाम: राम प्रसाद यादव", "हिस्सा: 100%"),
            ("रकबा (क्षेत्रफल): 1.25 हेक्टेयर (3.09 Acres)", "भूमि श्रेणी: कृषि फसली"),
            ("नामांतरण (दाखिल-खारिज): KH-312/2022", "पंजीयन दिनांक: 18/03/2022"),
            ("मालियत (मूल्यांकन): रु 38,00,000", "लगान: रु 72.00"),
            ("चौहद्दी (सीमाएं):", "उत्तर: गाटा 311 | दक्षिण: चक मार्ग"),
            ("", "पूर्व: गाटा 313 | पश्चिम: नहर नाली")
        ]

        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(20, 25, 40))
            draw.text((420, y), col2, fill=(20, 25, 40))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(235, 235, 240), width=1)

        draw.rectangle([560, 850, 720, 970], outline=(147, 51, 234), width=2)
        draw.text((580, 895), "राजस्व निरीक्षक\nकठवारा वृत्त\nलखनऊ", fill=(147, 51, 234))

        out_path = self.samples_dir / "sample_hindi_khatauni.png"
        img.save(out_path)

        txt_path = self.samples_dir / "sample_hindi_khatauni.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(
                "उत्तर प्रदेश राजस्व परिषद (भूलेख)\n"
                "खतौनी (अधिकार अभिलेख - प्रारूप ब-4)\n"
                "जनपद: लखनऊ | तहसील: बख्शी का तालाब | ग्राम: कठवारा\n"
                "खसरा संख्या: 312 | खाता संख्या: 00145\n"
                "खातेदार का नाम: राजेश कुमार यादव | पिता: राम प्रसाद यादव\n"
                "रकबा (क्षेत्रफल): 1.25 हेक्टेयर (3.09 Acres)\n"
                "भूमि श्रेणी: कृषि फसली | दाखिल-खारिज: KH-312/2022 | दिनांक: 18/03/2022\n"
                "चौहद्दी: उत्तर: गाटा 311, दक्षिण: चक मार्ग, पूर्व: गाटा 313, पश्चिम: नहर नाली"
            )

    def _generate_davanagere_sample(self):
        """Generates authentic Davanagere RTC matching ReferenceParcel 104."""
        img = Image.new("RGB", (800, 1100), color=(254, 250, 248))
        draw = ImageDraw.Draw(img)
        self._draw_header(
            draw,
            "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT",
            "DAVANAGERE DISTRICT - RTC FORM NO. 16 (ಪಹಣಿ ಪತ್ರಿಕೆ)",
            emblem_text="ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಸತ್ಯಮೇವ ಜಯತೆ"
        )
        content = [
            ("State: Karnataka", "District: Davanagere (ದಾವಣಗೆರೆ)"),
            ("Taluk: Davanagere", "Hobli: Kasaba (ಕಸಬಾ)"),
            ("Village: Avaragere (ಆವರಗೆರೆ)", "Survey No: 104 | Surnoc: *"),
            ("Hissa No: 1", "Record Year: 2024-2025 (Current RTC)"),
            ("Titleholder: Basavarajappa H (ಬಸವರಾಜಪ್ಪ)", "Relative: Late Halappa"),
            ("Land Extent: 4 Acres 10 Guntas (4.25 Acres)", "Land Type: Dry Crop (Agricultural)"),
            ("Mutation No: MR-88/2024", "Govt Valuation: Rs. 35,00,000"),
            ("Boundaries:", "North: Sy No 103/1 | South: Grama Thana Road"),
            ("", "East: Sy No 105 | West: Nala / Canal"),
            ("Verification Status: Clear Title", "Dataset: Davanagere Revenue Baseline [DEMO DATA]")
        ]
        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(20, 25, 40))
            draw.text((420, y), col2, fill=(20, 25, 40))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(240, 240, 245), width=1)
        draw.ellipse([580, 850, 720, 990], outline=(225, 29, 72), width=3)
        draw.text((605, 900), "REVENUE\nOFFICER\nDAVANAGERE", fill=(225, 29, 72))

        img.save(self.samples_dir / "sample_davanagere_rtc.png")
        with open(self.samples_dir / "sample_davanagere_rtc.txt", "w", encoding="utf-8") as f:
            f.write(
                "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
                "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16\n"
                "District: Davanagere | Taluk: Davanagere | Hobli: Kasaba | Village: Avaragere\n"
                "Survey No: 104 | Surnoc: * | Hissa: 1 | Year: 2024-2025\n"
                "Owner Name: Basavarajappa H (ಬಸವರಾಜಪ್ಪ) | Father's Name: Late Halappa\n"
                "Land Extent: 4 Acres 10 Guntas (4.25 Acres) | Land Type: Dry Crop (Agricultural)\n"
                "Mutation No: MR-88/2024 | Valuation: Rs. 35,00,000\n"
                "Boundaries: North: Sy No 103/1, South: Grama Thana Road, East: Sy No 105, West: Nala / Canal"
            )

    def _generate_tumakuru_sample(self):
        """Generates authentic Tumakuru RTC matching ReferenceParcel 75."""
        img = Image.new("RGB", (800, 1100), color=(254, 250, 248))
        draw = ImageDraw.Draw(img)
        self._draw_header(
            draw,
            "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT",
            "TUMAKURU DISTRICT - RTC FORM NO. 16 (ಪಹಣಿ ಪತ್ರಿಕೆ)",
            emblem_text="ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಸತ್ಯಮೇವ ಜಯತೆ"
        )
        content = [
            ("State: Karnataka", "District: Tumakuru (ತುಮಕೂರು)"),
            ("Taluk: Tumakuru", "Hobli: Kasaba (ಕಸಬಾ)"),
            ("Village: Melekote (ಮೇಕೋಟೆ)", "Survey No: 75 | Surnoc: 1"),
            ("Hissa No: 2A", "Record Year: 2024-2025 (Current RTC)"),
            ("Titleholder: Gangaraju K M (ಗಂಗರಾಜು)", "Relative: Mylarappa"),
            ("Land Extent: 2 Acres 30 Guntas (2.75 Acres)", "Land Type: Garden / Coconut"),
            ("Mutation No: MR-14/2023", "Govt Valuation: Rs. 42,00,000"),
            ("Boundaries:", "North: Sy No 74 | South: Cart Track Road"),
            ("", "East: Sy No 76/1 | West: Village Stream"),
            ("Verification Status: Clear Title", "Dataset: Tumakuru Land Records [DEMO DATA]")
        ]
        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(20, 25, 40))
            draw.text((420, y), col2, fill=(20, 25, 40))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(240, 240, 245), width=1)
        draw.ellipse([580, 850, 720, 990], outline=(14, 165, 233), width=3)
        draw.text((605, 900), "REVENUE\nOFFICER\nTUMAKURU", fill=(14, 165, 233))

        img.save(self.samples_dir / "sample_tumakuru_rtc.png")
        with open(self.samples_dir / "sample_tumakuru_rtc.txt", "w", encoding="utf-8") as f:
            f.write(
                "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
                "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16\n"
                "District: Tumakuru | Taluk: Tumakuru | Hobli: Kasaba | Village: Melekote\n"
                "Survey No: 75 | Surnoc: 1 | Hissa: 2A | Year: 2024-2025\n"
                "Owner Name: Gangaraju K M (ಗಂಗರಾಜು) | Father's Name: Mylarappa\n"
                "Land Extent: 2 Acres 30 Guntas (2.75 Acres) | Land Type: Garden / Coconut\n"
                "Mutation No: MR-14/2023 | Valuation: Rs. 42,00,000\n"
                "Boundaries: North: Sy No 74, South: Cart Track Road, East: Sy No 76/1, West: Village Stream"
            )

    def _generate_tumakuru_mismatch_sample(self):
        """Generates Tumakuru deed with intentional Area Mismatch (3.80 Acres vs 2.75 Acres in RTC)."""
        img = Image.new("RGB", (800, 1100), color=(255, 248, 248))
        draw = ImageDraw.Draw(img)
        self._draw_header(
            draw,
            "DEPARTMENT OF STAMPS AND REGISTRATION - GOVT OF KARNATAKA",
            "SUB-REGISTRAR OFFICE TUMAKURU - REGISTERED SALE DEED",
            emblem_text="ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಸತ್ಯಮೇವ ಜಯತೆ"
        )
        content = [
            ("State: Karnataka", "District: Tumakuru"),
            ("Taluk: Tumakuru", "Sub-Registrar: Tumakuru Rural"),
            ("Village: Melekote", "Survey No: 75 | Hissa: 2A"),
            ("Executant / Seller: Gangaraju K M", "Claimant / Buyer: Mohan Kumar S"),
            ("Consideration: Rs. 48,00,000", "Deed Type: Absolute Sale Deed"),
            ("Schedule Extent: 3 Acres 32 Guntas (3.80 Acres)", "Registration No: TUM-09823/2024"),
            ("Boundaries:", "North: Sy No 74 | South: Cart Track"),
            ("", "East: Sy No 76/1 | West: Stream"),
            ("Notice: Discrepancy Flag", "Deed extent exceeds Bhoomi RTC baseline by 1.05 Acres")
        ]
        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(30, 20, 20))
            draw.text((420, y), col2, fill=(30, 20, 20))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(255, 228, 230), width=1)
        draw.ellipse([580, 850, 720, 990], outline=(225, 29, 72), width=3)
        draw.text((605, 900), "SUB-REGISTRAR\nTUMAKURU\nREGISTERED", fill=(225, 29, 72))

        img.save(self.samples_dir / "sample_tumakuru_mismatch.png")
        with open(self.samples_dir / "sample_tumakuru_mismatch.txt", "w", encoding="utf-8") as f:
            f.write(
                "DEPARTMENT OF STAMPS AND REGISTRATION - GOVT OF KARNATAKA\n"
                "SUB-REGISTRAR OFFICE TUMAKURU - REGISTERED SALE DEED\n"
                "State: Karnataka | District: Tumakuru | Taluk: Tumakuru\n"
                "Village: Melekote | Survey No: 75 | Hissa: 2A\n"
                "Seller: Gangaraju K M | Buyer: Mohan Kumar S\n"
                "Registered Extent: 3 Acres 32 Guntas (3.80 Acres) | Classification: Agricultural / Garden\n"
                "Deed Registration No: TUM-09823/2024 | Valuation: Rs. 48,00,000\n"
                "Boundaries: North: Sy No 74, South: Cart Track, East: Sy No 76/1, West: Stream"
            )

    def _generate_davanagere_mismatch_sample(self):
        """Generates Davanagere deed with intentional Area Mismatch (5.50 Acres vs 4.25 Acres)."""
        img = Image.new("RGB", (800, 1100), color=(255, 248, 248))
        draw = ImageDraw.Draw(img)
        self._draw_header(
            draw,
            "DEPARTMENT OF STAMPS AND REGISTRATION - KARNATAKA",
            "SUB-REGISTRAR OFFICE DAVANAGERE - REGISTERED SALE DEED"
        )
        content = [
            ("State: Karnataka", "District: Davanagere"),
            ("Taluk: Davanagere", "Sub-Registrar: Davanagere Urban"),
            ("Village: Avaragere", "Survey No: 104 | Hissa: 1"),
            ("Purchaser: Suresh Patel", "Vendor: Basavarajappa H"),
            ("Conveyed Extent: 5 Acres 20 Guntas (5.50 Acres)", "Schedule: Agricultural Land"),
            ("Stamp Duty Paid: Rs. 2,85,000", "Consideration: Rs. 55,00,000"),
            ("Deed No: DVG-SD-104/2024", "Registration Date: 22/09/2024"),
            ("Variance Flag: Over-conveyance", "RTC Baseline: 4.25 Acres")
        ]
        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(30, 20, 20))
            draw.text((420, y), col2, fill=(30, 20, 20))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(255, 228, 230), width=1)
        draw.ellipse([580, 850, 720, 990], outline=(225, 29, 72), width=3)
        draw.text((605, 900), "SUB-REGISTRAR\nDAVANAGERE", fill=(225, 29, 72))

        img.save(self.samples_dir / "sample_davanagere_mismatch.png")
        with open(self.samples_dir / "sample_davanagere_mismatch.txt", "w", encoding="utf-8") as f:
            f.write(
                "DEPARTMENT OF STAMPS AND REGISTRATION - GOVERNMENT OF KARNATAKA\n"
                "REGISTERED CONVEYANCE SALE DEED - SRO DAVANAGERE\n"
                "District: Davanagere | Taluk: Davanagere | Village: Avaragere\n"
                "Survey No: 104 | Hissa: 1 | Year: 2024-2025\n"
                "Purchaser: Suresh Patel | Vendor: Basavarajappa H\n"
                "Conveyed Extent: 5 Acres 20 Guntas (5.50 Acres)\n"
                "Deed No: DVG-SD-104/2024 | Date: 22/09/2024 | Consideration: Rs. 55,00,000"
            )

    def _generate_maravanji_sample(self):
        """Generates authentic Maravanji RTC matching ReferenceParcel Survey 42/1."""
        img = Image.new("RGB", (800, 1100), color=(253, 252, 248))
        draw = ImageDraw.Draw(img)
        self._draw_header(
            draw,
            "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT",
            "CHANNAGIRI TALUK - RTC FORM NO. 16 (ಪಹಣಿ ಪತ್ರಿಕೆ)",
            emblem_text="ಕರ್ನಾಟಕ ಸರ್ಕಾರ - ಸತ್ಯಮೇವ ಜಯತೆ"
        )
        content = [
            ("State: Karnataka", "District: Davanagere (ದಾವಣಗೆರೆ)"),
            ("Taluk: Channagiri (ಚನ್ನಗಿರಿ)", "Hobli: Kasaba (ಕಸಬಾ)"),
            ("Village: Maravanji (ಮರವಂಜಿ)", "Survey No: 42 | Surnoc: *"),
            ("Hissa No: 1", "Record Year: 2024-2025 (Current RTC)"),
            ("Titleholder: Basappa M (ಬಸಪ್ಪ)", "Relative: Late Mallappa"),
            ("Land Extent: 3 Acres 10 Guntas (3.25 Acres)", "Land Type: Dry Crop (Arecanut / ಅಡಿಕೆ)"),
            ("Mutation No: MR-42/2023", "Govt Valuation: Rs. 28,50,000"),
            ("Boundaries:", "North: Sy No 41 | South: Cart Track Road"),
            ("", "East: Sy No 42/2 | West: Stream / Nala"),
            ("Verification Status: Clear Title", "Dataset: Davanagere Revenue Baseline [DEMO DATA]")
        ]
        y = 140
        for col1, col2 in content:
            draw.text((50, y), col1, fill=(20, 25, 40))
            draw.text((420, y), col2, fill=(20, 25, 40))
            y += 35
            draw.line([45, y - 5, 755, y - 5], fill=(240, 240, 245), width=1)
        draw.ellipse([580, 850, 720, 990], outline=(5, 150, 105), width=3)
        draw.text((605, 900), "REVENUE\nOFFICER\nCHANNAGIRI", fill=(5, 150, 105))

        img.save(self.samples_dir / "sample_maravanji_rtc.png")
        with open(self.samples_dir / "sample_maravanji_rtc.txt", "w", encoding="utf-8") as f:
            f.write(
                "GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT\n"
                "RECORD OF RIGHTS, TENANCY AND CROPS (RTC) - FORM NO. 16\n"
                "District: Davanagere | Taluk: Channagiri | Hobli: Kasaba | Village: Maravanji\n"
                "Survey No: 42 | Surnoc: * | Hissa: 1 | Year: 2024-2025\n"
                "Owner Name: Basappa M (ಬಸಪ್ಪ) | Father's Name: Late Mallappa\n"
                "Land Extent: 3 Acres 10 Guntas (3.25 Acres) | Land Type: Dry Crop (Arecanut / ಅಡಿಕೆ)\n"
                "Mutation No: MR-42/2023 | Valuation: Rs. 28,50,000\n"
                "Boundaries: North: Sy No 41, South: Cart Track Road, East: Sy No 42/2, West: Stream / Nala"
            )

sample_generator = SampleGenerator()

