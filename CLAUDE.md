# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UNHN (US-Nepal Help Network) is a utility-first community platform designed for the Nepalese diaspora in the USA. The app shifts away from algorithm-based social media feeds to provide structured, location-based services for housing, jobs, emergencies, and travel coordination.

## Core Architecture Principles

### Metro-First Location Model
- Every piece of content is tagged with a US Census Metro Area ID
- Users are mapped to metro areas via ZIP code during onboarding
- Default view is always the local feed (content within the user's metro area)
- Hyper-local filtering allows radius-based searches (e.g., within 10 miles)

### Trust & Safety System
The platform uses a multi-tiered account system:
- **Level 0 (New)**: View-only or 1 post/day limit
- **Level 1 (Verified)**: Phone/social media verified, full posting rights
- **Level 2 (Contributor)**: High engagement/vouched, elevated visibility

### Smart Post Engine (Structured Content)
Posts are category-based with mandatory fields and auto-expiry:
- **Housing**: Rent, move-in date, room type (expires in 30 days)
- **Jobs**: Title, pay, employment type (expires in 30 days)
- **Emergency**: Type, location, contact info (expires in 7 days)
- **Travel**: Date, route, airline (expires 2 days after travel)

### Two-Step Red Alert System
Emergency broadcasts require moderator verification:
1. User submits emergency post
2. Local community leads receive verification notification
3. Upon moderator verification, push notification sent to entire metro area

### Peer vs. Business Content
- **Peer Posts**: Free individual listings (roommates, travel buddies)
- **Business Profiles**: Dedicated profiles with review/rating system for restaurants, consultancies, etc.

## Planned Tech Stack

- **Frontend**: Flutter (cross-platform for iOS, Android, Web)
- **Backend**: Firebase (real-time DB for chat and emergency alerts)
- **Location Services**: Google Maps / ZIP Code API for metro area mapping
- **Admin Dashboard**: Web-based interface for moderators to manage alerts and content

## Key Safety Features to Implement

- **PII Masking**: Sensitive emergency data hidden behind "Click to Reveal" for logged-in users only
- **AI Moderation**: Automated scanning for scam-related keywords (crypto, "fast cash")
- **FB-to-App Bridge**: Automated ingestion of UNHN Facebook posts for initial content population
- **Explicit Disclaimers**: Clear TOS stating the platform is a community notice board, not a professional emergency/legal/medical service

## Development Phases

### Phase 1: Utility Core & Trust Foundation
Focus on identity verification, structured posting forms, and Facebook content bridge.

### Phase 2: Community Safety & Growth
Implement the Red Alert system, peer vs. business distinction, and hyper-local filtering.

### Phase 3: Sustainability & Ecosystem
Build self-service ad portal, AI moderation, and resource wiki for immigration/tax/legal guides.
