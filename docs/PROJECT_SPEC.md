# Siripun INS Lookup — Version 1 Specification

## Goal

แสดงผลที่หน้า WordPress `siripun.com/ins` ผ่าน shortcode `[siripun_ins]` โดยตัวแอพและฐานข้อมูลให้บริการจาก Cloudflare path `/ins-assets/*` และ source code/ข้อมูล master อยู่ใน GitHub.

## Search

- ช่องเดียวรองรับหลาย INS
- คั่นด้วย comma, semicolon, whitespace หรือขึ้นบรรทัดใหม่
- รองรับข้อความแบบ `INS 300`
- URL query `?q=300,406,491` เพื่อแชร์ผลค้นหา

## Published data rule

- Facts from official/primary sources only
- No AI-written additive explanation
- Every published record has source IDs and field-level provenance
- Missing source-backed data remains missing

## Update system

- WordPress Admin has buttons to trigger source check / prepare update
- WordPress never stores the GitHub token
- Cloudflare Worker stores GitHub token as secret and calls GitHub workflow_dispatch
- GitHub Actions checks official sources and creates a review report/PR
- Production data changes only after review and merge

## Monetization

The INS tool lives inside a normal WordPress page, so the existing page can contain WordPress-managed AdSense placements outside the app container.

## Donation footer

`สนับสนุนผู้จัดทำได้ด้วย bitcoin lightning ที่ donate@zapm.uk`

Donation is optional UI only; INS search/update must work normally when disabled. Buttons: open Lightning wallet via configured LNURL; copy Lightning Address fallback.
