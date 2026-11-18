# Roamday

Shared guidance is in the [workspace](../../../AGENTS.md) and [personal projects](../../AGENTS.md) instructions.

## Scope

Help visitors find nearby outings that fit their local time, spending range, radius, interests and weather. Menu and booking actions take visitors to venue-operated channels.

## Architecture

A static-exportable Next.js application uses React, TypeScript and Leaflet. Shared search filters drive the map, shortlist and conversational input. The optional Java 21 Spring gateway bounds provider queries. Preferences are device-local.

## Commands

At the project root use npm ci, npm run dev, npm run typecheck and npm run build. The static output is out/. Use the backend README for its environment and Maven commands.

## Project restrictions

Keep illustrative Makati material labeled and separate from sourced results. Unverified spend, hours or route information cannot qualify a place as a confirmed strict fit. Never add paid quota fallback or send chat to a cloud model.

## Documentation

Use [the plan](PLAN.md), [design](DESIGN.md), [startup record](PROJECT-START.md) and [README](README.md) for scope, visual decisions, delivery history and usage.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
