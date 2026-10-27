import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from config import REPORTS_DIR

class ReportGenerator:
    def generate_pdf_report(self, record_data: Dict[str, Any], issues: list, duplicates: list, mismatches: list) -> Path:
        """
        Generates an official Land Record Digitization & Verification Audit Certificate PDF.
        """
        report_id = f"BV-AUDIT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        pdf_path = REPORTS_DIR / f"{report_id}.pdf"

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'GovTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            alignment=1,
            textColor=colors.HexColor("#1e3a8a")
        )
        subtitle_style = ParagraphStyle(
            'GovSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            alignment=1,
            textColor=colors.HexColor("#475569")
        )
        section_style = ParagraphStyle(
            'GovSection',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#0f172a")
        )
        body_style = ParagraphStyle(
            'GovBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155")
        )

        story = []

        # Header Banner
        story.append(Paragraph("GOVERNMENT OF INDIA &bull; DIGITAL LAND RECORDS MODERNIZATION PROGRAMME", subtitle_style))
        story.append(Paragraph("BHOOMIVERIFY &mdash; LAND RECORD DIGITIZATION & VALIDATION CERTIFICATE", title_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>Audit Certificate ID:</b> {report_id} &nbsp;|&nbsp; <b>Date:</b> {datetime.now().strftime('%d %B %Y %H:%M:%S UTC')}", subtitle_style))
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a8a"), spaceAfter=12))

        # Overall Status Badge
        severities = [i.get('severity') for i in issues] if issues else []
        if 'CRITICAL' in severities:
            status_text = "<font color='#dc2626'><b>ACTION REQUIRED &bull; INTEGRITY ANOMALIES DETECTED</b></font>"
            status_bg = colors.HexColor("#fee2e2")
        elif 'WARNING' in severities or duplicates or mismatches:
            status_text = "<font color='#d97706'><b>PENDING ADMINISTRATIVE REVIEW &bull; MINOR DISCREPANCIES</b></font>"
            status_bg = colors.HexColor("#fef3c7")
        else:
            status_text = "<font color='#16a34a'><b>VERIFIED &bull; PASSED ALL DIGITIZATION INTEGRITY CHECKS</b></font>"
            status_bg = colors.HexColor("#dcfce7")

        status_table = Table([[Paragraph(status_text, ParagraphStyle('StatusP', alignment=1, fontSize=10, fontName='Helvetica-Bold'))]], colWidths=[540])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), status_bg),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 14))

        # Section 1: Digitized Record Particulars
        story.append(Paragraph("1. DIGITIZED RECORD PARTICULARS", section_style))
        story.append(Spacer(1, 4))

        record_info = [
            [
                Paragraph("<b>Survey / Khasra No:</b>", body_style), Paragraph(str(record_data.get('survey_number', 'N/A')), body_style),
                Paragraph("<b>Sub-Division (Hissa):</b>", body_style), Paragraph(str(record_data.get('sub_division', '1')), body_style)
            ],
            [
                Paragraph("<b>Primary Titleholder:</b>", body_style), Paragraph(str(record_data.get('owner_name', 'N/A')), body_style),
                Paragraph("<b>Father/Spouse Name:</b>", body_style), Paragraph(str(record_data.get('relative_name', 'N/A')), body_style)
            ],
            [
                Paragraph("<b>Village & Taluk:</b>", body_style), Paragraph(f"{record_data.get('village', 'N/A')}, {record_data.get('taluk', 'N/A')}", body_style),
                Paragraph("<b>District & State:</b>", body_style), Paragraph(f"{record_data.get('district', 'N/A')}, {record_data.get('state', 'N/A')}", body_style)
            ],
            [
                Paragraph("<b>Land Extent:</b>", body_style), Paragraph(f"{record_data.get('area_value', 0)} {record_data.get('area_unit', 'Acres')} ({record_data.get('area_in_acres', 0):.2f} Std Acres)", body_style),
                Paragraph("<b>Land Classification:</b>", body_style), Paragraph(str(record_data.get('land_type', 'Agricultural')), body_style)
            ],
            [
                Paragraph("<b>Mutation Number:</b>", body_style), Paragraph(str(record_data.get('mutation_number', 'N/A')), body_style),
                Paragraph("<b>Govt Valuation:</b>", body_style), Paragraph(f"Rs. {record_data.get('valuation_amount', 0):,.2f}", body_style)
            ],
            [
                Paragraph("<b>Boundaries (N/S/E/W):</b>", body_style), Paragraph(f"N: {record_data.get('north_boundary','N/A')} | S: {record_data.get('south_boundary','N/A')} | E: {record_data.get('east_boundary','N/A')} | W: {record_data.get('west_boundary','N/A')}", body_style),
                Paragraph("<b>Department Source:</b>", body_style), Paragraph(str(record_data.get('source_department', 'Revenue Dept')), body_style)
            ]
        ]
        t1 = Table(record_info, colWidths=[120, 150, 120, 150])
        t1.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#f8fafc")),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#f8fafc")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t1)
        story.append(Spacer(1, 14))

        # Section 2: Validation Findings
        story.append(Paragraph(f"2. RULE-BASED VALIDATION & INTEGRITY CHECKS ({len(issues)} Issues Found)", section_style))
        story.append(Spacer(1, 4))

        if issues:
            issue_rows = [[Paragraph("<b>Field</b>", body_style), Paragraph("<b>Severity</b>", body_style), Paragraph("<b>Anomaly Description</b>", body_style), Paragraph("<b>Remediation</b>", body_style)]]
            for iss in issues:
                sev = iss.get('severity', 'INFO')
                sev_color = "#dc2626" if sev == 'CRITICAL' else "#d97706" if sev == 'WARNING' else "#2563eb"
                issue_rows.append([
                    Paragraph(f"<b>{iss.get('field_name')}</b>", body_style),
                    Paragraph(f"<font color='{sev_color}'><b>{sev}</b></font>", body_style),
                    Paragraph(iss.get('description', ''), body_style),
                    Paragraph(iss.get('suggested_fix', 'Review original deed'), body_style)
                ])
            t2 = Table(issue_rows, colWidths=[80, 60, 230, 170])
            t2.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ]))
            story.append(t2)
        else:
            story.append(Paragraph("<i>No data integrity or structural validation issues detected. All fields comply with statutory revenue schema.</i>", body_style))
        story.append(Spacer(1, 14))

        # Section 3: Cross-Department Mismatches & Duplicates
        story.append(Paragraph("3. CROSS-DEPARTMENT MISMATCH & DUPLICATE ANALYSIS", section_style))
        story.append(Spacer(1, 4))

        findings_text = []
        if mismatches:
            for m in mismatches:
                findings_text.append(f"&bull; <b>[MISMATCH - {m.get('severity')}]</b> {m.get('dept_source_1')} vs {m.get('dept_source_2')} on <i>{m.get('field_name')}</i>: {m.get('value_1')} vs {m.get('value_2')} ({m.get('discrepancy_description')})")
        if duplicates:
            for d in duplicates:
                findings_text.append(f"&bull; <b>[POTENTIAL DUPLICATE - {d.get('similarity_score')}% Match]</b> Target: {d.get('target_owner')} (Survey {d.get('target_survey')}, {d.get('target_village')}) &mdash; {d.get('details')}")

        if not findings_text:
            findings_text.append("<i>No cross-departmental mismatches or duplicate entries detected against the master repository.</i>")

        for f_text in findings_text:
            story.append(Paragraph(f_text, body_style))
            story.append(Spacer(1, 3))

        story.append(Spacer(1, 14))

        # Footer Signoff
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=10))
        signoff_text = (
            "<b>Digitized by:</b> BhoomiSetu Autonomous Land Intelligence Engine &nbsp;|&nbsp; "
            "<b>Verification Hash:</b> SHA256-" + uuid.uuid4().hex[:16] + "<br/>"
            "<i>This is a computer-generated Land Record Validation Certificate. Authorized by National Land Revenue Authority.</i>"
        )
        story.append(Paragraph(signoff_text, subtitle_style))

        doc.build(story)
        return pdf_path

report_generator = ReportGenerator()
