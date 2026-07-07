# -*- coding: utf-8 -*-
import os
from PIL import Image, ImageDraw, ImageFont
from moviepy import ImageClip, AudioFileClip, concatenate_videoclips

print("Starting Video Production Kit...")

# 1. Ensure output directory exists
os.makedirs("docs", exist_ok=True)
os.makedirs("video_slides", exist_ok=True)

# 2. Setup Fonts
font_path = "/usr/local/lib/python3.13/site-packages/cv2/qt/fonts/DejaVuSans-Bold.ttf"
font_reg = "/usr/local/lib/python3.13/site-packages/cv2/qt/fonts/DejaVuSans.ttf"
if not os.path.exists(font_path):
    font_path = "/usr/lib/R/library/grDevices/fonts/Roboto/Roboto-Medium.ttf"
    font_reg = font_path

font_title = ImageFont.truetype(font_path, 32)
font_sub = ImageFont.truetype(font_path, 22)
font_body = ImageFont.truetype(font_reg, 18)
font_small = ImageFont.truetype(font_reg, 15)
font_logo = ImageFont.truetype(font_path, 54)

# 3. Slide Generator Function
def create_slide(bg_image_path, out_path, stage_num, stage_title, subtitle, bullets, is_intro=False):
    width, height = 1280, 720
    if os.path.exists(bg_image_path):
        bg = Image.open(bg_image_path).convert("RGB")
        bg = bg.resize((width, height), Image.Resampling.LANCZOS)
    else:
        bg = Image.new("RGB", (width, height), (10, 15, 29))

    # Dark overlay gradient / panels
    overlay = Image.new("RGBA", (width, height), (10, 15, 29, 210))
    draw_ov = ImageDraw.Draw(overlay)

    if is_intro:
        # Special Intro Screen
        draw_ov.rectangle([0, 0, width, height], fill=(10, 15, 29, 240))
        bg = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(bg)
        
        # Logo Box
        box_w, box_h = 160, 160
        box_x, box_y = (width - box_w) // 2, 140
        draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=24, fill=(13, 148, 136), outline=(45, 212, 191), width=4)
        draw.text((box_x + 36, box_y + 45), "MJ", font=font_logo, fill=(255, 255, 255))

        # Titles
        title_text = "MAJARRAH INDUSTRIAL REVOLUTION"
        draw.text(((width - draw.textlength(title_text, font=font_title)) // 2, 340), title_text, font=font_title, fill=(255, 255, 255))
        
        sub_text = "Version 2.6 Hybrid Governance Architecture — Our Galactic Laundry OS"
        draw.text(((width - draw.textlength(sub_text, font=font_sub)) // 2, 400), sub_text, font=font_sub, fill=(45, 212, 191))

        tag_text = "Real System Video Documentary & Fifth Settlement Sales Demo Order (#ORD-2026-995)"
        draw.text(((width - draw.textlength(tag_text, font=font_body)) // 2, 460), tag_text, font=font_body, fill=(245, 158, 11))

        foot_text = "Zero Emojis Enforced | Pronounced 'Majarrah' (Galaxy) | Vercel Live: mjrh.vercel.app"
        draw.text(((width - draw.textlength(foot_text, font=font_small)) // 2, 630), foot_text, font=font_small, fill=(148, 163, 184))
    else:
        # Top header bar overlay
        draw_ov.rectangle([0, 0, width, 100], fill=(15, 23, 42, 230))
        # Bottom subtitle bar overlay
        draw_ov.rectangle([0, 560, width, height], fill=(15, 23, 42, 235))
        # Center info card overlay
        draw_ov.rounded_rectangle([60, 130, 1220, 530], radius=16, fill=(13, 20, 36, 220), outline=(45, 212, 191, 150), width=2)
        
        bg = Image.alpha_composite(bg.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(bg)

        # Top Header Content
        draw.text((40, 25), f"STAGE {stage_num}: {stage_title}", font=font_title, fill=(45, 212, 191))
        draw.text((40, 68), f"Tenant: Dry Tech (c0ea27c7) | Order: #ORD-2026-995 | Customer: Dr. Sherif Al-Alfy (VIP - 5th Settlement)", font=font_small, fill=(245, 158, 11))
        draw.text((980, 40), "MAJARRAH v2.6 HYBRID", font=font_sub, fill=(255, 255, 255))

        # Center Card Bullets
        y_pos = 160
        draw.text((90, y_pos), "LIVE SYSTEM OPERATIONAL & FINANCIAL EXECUTION:", font=font_sub, fill=(245, 158, 11))
        y_pos += 45
        for b in bullets:
            draw.text((110, y_pos), f"•  {b}", font=font_body, fill=(248, 250, 252))
            y_pos += 38

        # Bottom Subtitle Bar
        sub_lines = [subtitle[i:i+95] for i in range(0, len(subtitle), 95)]
        sy = 580
        for sl in sub_lines[:2]:
            draw.text(((width - draw.textlength(sl, font=font_body)) // 2, sy), sl, font=font_body, fill=(226, 232, 240))
            sy += 28
        draw.text((40, 685), "Pronunciation: Majarrah (Galaxy) | Zero Emojis Enforced", font=font_small, fill=(148, 163, 184))

    bg.save(out_path, "PNG")
    return out_path

print("Generating 8 visual HD slides (1 Intro + 7 Stages)...")

s0 = create_slide("images/real_intake_sorting.jpg", "video_slides/s0.png", "00", "LOGO INTRO", "", [], is_intro=True)

s1 = create_slide("images/real_intake_sorting.jpg", "video_slides/s1.png", "01", "ORDER INTAKE & POS EDITOR", 
    "In industrial commercial laundry, precision begins at intake. Today we process a real order for Dr. Sherif Al-Alfy in 5th Settlement, New Cairo.",
    [
        "POS Touch 7 Categories: All | Men's | Women's | Kids | Household | Carpets | Delivery (No emojis)",
        "Customer: Dr. Sherif Al-Alfy (VIP Customer - Villa 42, Choueifat Zone, 5th Settlement, New Cairo)",
        "Items Added: Men's Suit (250 EGP) + Bridal Wedding Gown (600 EGP) + Chinese Silk Carpet (350 EGP)",
        "Intake Invoice Editor: Documented light oil stain on bridal gown with photograph attachments",
        "Expedite Delivery Priority: Set to 4-Hour Urgent Deadline (is_urgent = true | promised_delivery_at)",
        "Financial Engine: Automatically posts 1,200.00 EGP Receivable Accrual without immediate cash impact"
    ])

s2 = create_slide("images/real_intake_sorting.jpg", "video_slides/s2.png", "02", "1-CLICK FAST TRACK SORTING",
    "As Dr. Sherif's order arrives at sorting, touch hyper-automation operates without barcode dependency. The supervisor executes a single-click fast track sort.",
    [
        "Management Command Compliance: Touch Hyper-Automation Active (No Barcode Scanning Dependency)",
        "1-Click Action: Supervisor clicks 'fastTrackSortAll' button to route garments instantly",
        "Automated Routing: Suit -> Dry Clean Line | Carpet -> Floor Processing | Gown -> Stain Quarantine",
        "Operational Timestamp: Order #ORD-2026-995 status updated to 'in_progress' in real-time",
        "Accounting Engine: Calculates Estimated Direct Cost of Goods Sold (COGS Allocation Reserve)",
        "APDO Governance: Action logged to telemetry audit trail with actor attribution"
    ])

s3 = create_slide("images/real_cleaning_machines.jpg", "video_slides/s3.png", "03", "CLEANING & STAIN QUARANTINE",
    "At washing and chemical processing, operators approve normal bulk loads. When inspecting the bridal gown, the technician activates piece quarantine for solvent remediation.",
    [
        "Bulk Efficiency: Normal bulk laundry batches approved instantly via 'bulkMarkCleaned' command",
        "Exception Protocol: Bridal Gown oil stain triggers 'quarantinePiece' button without delaying order",
        "Quarantine Reason Logged: 'Specialized organic solvent treatment for oil stain on tail before pressing'",
        "Zero Bottleneck: Suit and Carpet proceed to finishing while gown undergoes chemical remediation",
        "Stain Resolved: One-click release restores bridal gown to active production line",
        "Double-Entry Ledger: Debits Operating Chemical Expenses (65 EGP) / Credits Raw Material Inventory"
    ])

s4 = create_slide("images/real_ironing_station.jpg", "video_slides/s4.png", "04", "FAIRNESS IRONING SHIFTS",
    "The ironing workstation is our operational core. Exclusive algorithm rebalance_ironing_assignments enforces five architectural rules including single-actor order ownership.",
    [
        "PL/pgSQL Engine: Exclusive 'rebalance_ironing_assignments' algorithm executing in Supabase",
        "Rule 1 (Single-Actor Ownership): Entire order assigned to Ahmed Mahmoud to guarantee uniform pressing",
        "Rule 2 (Shift Equity): Allocation dynamically balanced by actual staff check-in timestamps",
        "Rule 3 & 4 (Fatigue & Saturation): Jumbo order saturation lock protects Saad Eddin (>40 pcs locked)",
        "Rule 5 (EGP Load Balancing): Active financial value equity-balanced among simultaneous workers",
        "Payroll Accrual: Logs 110.00 EGP piece-rate productivity and posts Payroll Liability Payable due"
    ])

s5 = create_slide("images/real_delivery_packing.jpg", "video_slides/s5.png", "05", "QC & WHATSAPP READY ALERT",
    "At quality assurance and packing, the supervisor verifies all label codes. With one touch on fast track pack and ready, order transitions to ready and WhatsApp alert is sent.",
    [
        "Final Quality Audit: Supervisor inspects pressed suit, remediated bridal gown, and silk carpet",
        "1-Click Action: Executes 'fastTrackPackAndReady' button -> Order status transitions to 'ready'",
        "Automated WhatsApp Alert: System sends itemized billing statement (1,200 EGP) to 01000000995",
        "Zero API Fees: Internal notification queue engine eliminates third-party messaging subscription costs",
        "Packaging Expense Logged: Consumes hangers, individual covers, and presentation boxes (35 EGP)",
        "COGS Finalized: Fixes actual direct cost of goods sold at 210.00 EGP total for #ORD-2026-995"
    ])

s6 = create_slide("images/real_delivery_packing.jpg", "video_slides/s6.png", "06", "5TH SETTLEMENT GPS MAP & TIP",
    "Our live dispatch map routes courier Mahmoud Said through South 90th Street to Dr. Sherif's villa in Choueifat. At delivery, InstaPay receipt is uploaded and tip is separated.",
    [
        "Geographical Routing: Live map plots route from Branch HQ (South 90th St) to Choueifat Zone (Villa 42)",
        "Algorithmic Dispatch: Auto-assigns nearest active GPS courier (Mahmoud Said) to shipment",
        "Handover Confirmation: Courier confirms delivery on mobile driver portal ('delivery_confirmed')",
        "InstaPay Verification: Electronic bank transfer receipt uploaded showing 1,250.00 EGP transferred",
        "Smart Tip Separation: System detects 50 EGP excess over invoice (1,200 EGP receivable due)",
        "Automated Accounting: Settle 1,200 EGP Revenue + Separates 50 EGP to Driver Tip Liability Account"
    ])

s7 = create_slide("images/real_delivery_packing.jpg", "video_slides/s7.png", "07", "C-SUITE DOUBLE-ENTRY LEDGER",
    "This completes our operational journey inside Majarrah. Automated double-entry bookkeeping has reconciled receivables, chemical usage, payroll, and InstaPay with zero variance.",
    [
        "Version 2.6 Hybrid Governance: Decentralized branch execution synced with C-Suite financial control",
        "Zero Variance Reconciliation: [DR] Bank 1,250 EGP == [CR] Revenue 1,200 EGP + [CR] Driver Tips 50 EGP",
        "Courier Custody Settlement: Driver cash/electronic collections transferred via 'cash_transfer'",
        "Unit Economics Realized: Total Revenue 1,200 EGP - Direct COGS 210 EGP = 990 EGP Gross Profit",
        "Gross Margin Validated: Achieved 82.5% Gross Margin (Target 88% Standard across all branches)",
        "Valuation Justified: Demonstrates robust operational intelligence justifying 4.46M EGP Software Asset"
    ])

print("Building MoviePy Video Clips...")

aud_files = [
    "audio/majarrah_intro.mp3",
    "audio/majarrah_scene1_intake.mp3",
    "audio/majarrah_scene2_sorting.mp3",
    "audio/majarrah_scene3_cleaning.mp3",
    "audio/majarrah_scene4_ironing.mp3",
    "audio/majarrah_scene5_qc.mp3",
    "audio/majarrah_scene6_dispatch.mp3",
    "audio/majarrah_scene7_finance.mp3"
]

slide_files = [
    "video_slides/s0.png",
    "video_slides/s1.png",
    "video_slides/s2.png",
    "video_slides/s3.png",
    "video_slides/s4.png",
    "video_slides/s5.png",
    "video_slides/s6.png",
    "video_slides/s7.png"
]

clips = []
for i in range(8):
    aud = AudioFileClip(aud_files[i])
    dur = aud.duration + 0.3  # Add 0.3s padding
    img_c = ImageClip(slide_files[i]).with_duration(dur).with_audio(aud)
    clips.append(img_c)

print("Concatenating clips...")
final_video = concatenate_videoclips(clips, method="compose")

out_mp4 = "docs/MJRH_REAL_WORLD_DEMO_VIDEO.mp4"
print(f"Writing final video file to {out_mp4} at 15 FPS...")
final_video.write_videofile(out_mp4, fps=15, codec="libx264", audio_codec="aac", logger=None)

print(f"SUCCESS! Video written: {os.path.getsize(out_mp4)/(1024*1024):.2f} MB")
