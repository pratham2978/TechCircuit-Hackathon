"""
Brand Tone & Voice Training Dataset
Labels:
  - Professional: Objective, clear, measured, business-appropriate
  - Informal: Slang, excessively casual, street vernacular
  - Exaggerated: Absolute superlatives, unverified hyperbole, miracle promises
  - Urgent: High-pressure urgency, scarcity, impulse triggers
  - Empowering: Uplifting, mission-driven, customer-empowering
"""

TRAINING_DATA = [
  # Professional
  ("BrandGuard delivers verified governance across digital creative channels.", "Professional"),
  ("Our quarterly audit demonstrates reliable defect detection across enterprise campaigns.", "Professional"),
  ("The software provides automated rule checking based on approved corporate guidelines.", "Professional"),
  ("Performance metrics are substantiated through audited lab experiments and clinical documentation.", "Professional"),
  ("Organizations can configure workspace policies according to regulatory and legal requirements.", "Professional"),
  ("This release notes document details architectural updates and API response modifications.", "Professional"),
  ("Customer support teams are available during standard operational hours.", "Professional"),
  ("All claim records require verifiable documentation before promotional deployment.", "Professional"),
  ("The system cross-references marketing copy against approved product specifications.", "Professional"),
  ("Compliance review workflows enforce multi-tier approval permissions.", "Professional"),
  ("Audited benchmark reports indicate consistent precision in automated evaluations.", "Professional"),
  ("Users may configure multi-channel publishing standards within their organizational settings.", "Professional"),

  # Informal
  ("Yo check this out, this app is super hyped and straight fire bruh!", "Informal"),
  ("Gonna tell all my homies about this lit new software rn.", "Informal"),
  ("Ain't nobody got time for reading big manuals, this tool is vibing.", "Informal"),
  ("Omg bro this design is totally wild and crazy cool.", "Informal"),
  ("Wanna see how we do it? Hit us up on chat real quick.", "Informal"),
  ("Just chilling with our brand deck, pretty dope aesthetic honestly.", "Informal"),
  ("Bruh, you gotta try this, it's gonna blow your mind no cap.", "Informal"),
  ("Super stoked to share our weekend marketing experiments with y'all.", "Informal"),
  ("Kinda crazy how easy it is to throw together a quick campaign.", "Informal"),
  ("Yo fam, we just dropped our latest product drop, check it out.", "Informal"),

  # Exaggerated
  ("Our revolutionary miracle system guarantees 100% flawless perfection every single time!", "Exaggerated"),
  ("The greatest, most unbeatable and supreme platform ever created in human history.", "Exaggerated"),
  ("Eliminates all errors with zero effort and absolute magical transformation.", "Exaggerated"),
  ("Completely destroy your rivals with the ultimate unstoppable marketing weapon.", "Exaggerated"),
  ("100% guaranteed success or your entire investment refunded with zero risk.", "Exaggerated"),
  ("The world's undisputed #1 miracle tool that makes all competition look pathetic.", "Exaggerated"),
  ("Unparalleled perfection that can never fail under any circumstance whatsoever.", "Exaggerated"),
  ("Infinitely better than any alternative ever conceived by mankind.", "Exaggerated"),
  ("Flawless security and total invulnerability across all known dimensions.", "Exaggerated"),
  ("Instantly achieve astronomical ROI within seconds without lifting a single finger.", "Exaggerated"),

  # Urgent
  ("Hurry! Only 2 hours remaining before this exclusive lifetime offer disappears forever!", "Urgent"),
  ("Act immediately or lose your spot — seats are filling up rapidly right now!", "Urgent"),
  ("Don't miss out! Last chance to claim your exclusive discount before prices double tonight!", "Urgent"),
  ("Urgent warning: Your account access expires within 24 hours unless you act now!", "Urgent"),
  ("Final call for registrations! Doors close in 15 minutes sharp!", "Urgent"),
  ("Limited stock alert: Only 3 licenses left at this introductory price!", "Urgent"),
  ("Flash sale ending now! Click immediately to secure your purchase before it's gone!", "Urgent"),
  ("Time is running out fast! Register right now before your competitors take your place!", "Urgent"),

  # Empowering
  ("Empower your team to craft authentic, beautiful brand stories with confidence.", "Empowering"),
  ("Unlock your creative potential and build lasting connections with your community.", "Empowering"),
  ("Together, we champion craft, integrity, and exceptional design excellence.", "Empowering"),
  ("Designed to support creators in delivering their most inspiring work yet.", "Empowering"),
  ("Elevate every voice in your organization with transparent, collaborative tools.", "Empowering"),
  ("We believe every creator deserves the freedom to innovate without fear.", "Empowering"),
  ("Celebrate authentic craftsmanship and elevate your brand's true voice.", "Empowering"),
  ("Strengthen your audience trust by standing firmly behind what is real.", "Empowering")
]

TEST_DATA = [
  ("The quarterly compliance report was reviewed and signed by the compliance committee.", "Professional"),
  ("Standard operating procedures require documented substantiation for all claims.", "Professional"),
  ("Yo bro, this is totally lit, you gotta peep this right now!", "Informal"),
  ("Kinda feeling this new vibe, hit the like button fam.", "Informal"),
  ("100% guaranteed miraculous results that will completely crush all rival tools!", "Exaggerated"),
  ("The greatest and most flawless product in the history of the universe.", "Exaggerated"),
  ("Flash discount expires in 5 minutes! Act now before it is gone forever!", "Urgent"),
  ("Limited slots left, register immediately to secure your spot today!", "Urgent"),
  ("Empowering your creative journey with confidence, trust, and shared values.", "Empowering"),
  ("Together we build sustainable trust through honest, inspiring storytelling.", "Empowering")
]
