# ⚔️ PROJECT DOOM: THE IMPERVIOUS PORTFOLIO ARCHITECTURE ⚔️
> *"None may enter Latveria uninvited. None may breach the Doom API without facing absolute ruin."*  
> — **Victor Von Doom**

```text
               ┌────────────────────────────────────────────────────────┐
               │         THE CITADEL OF DOOM : FORTRESS OVERVIEW        │
               └────────────────────────────────────────────────────────┘
                                           │
                                  [ CLOUDFLARE EDGE ]
                    (WAF Sentinel • DDoS Shield • Edge Rate Limiter)
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
             [ THE MONOLITH ]      [ THE INNER SANCTUM ]   [ ZERO-TRUST TUNNEL ]
              yourname.dev         admin.yourname.dev       api.yourname.dev
             (Public Realm)          (Imperial Gate)         (Origin Citadel)
                     │                     │                     │
               Next.js 14 Worker     Cloudflare Pages       Cloudflare Tunnel
             React Three Fiber 3D     + Zero Trust Access   (Zero Inbound Ports)
             (Mask & Strike Anim)      (One-Time Secret PIN)     │
                     │                     │                     ▼
                     │                     │             [ AWS EC2 BASTION ]
                     │                     │             Docker: cloudflared
                     │                     │             Docker: Express API
                     │                     │                     │
                     └─────────────────────┴───────────────┐     ▼
                                                           ▼  [ CITADEL VAULTS ]
                                                       MongoDB Atlas + Cloudinary
```

---

## 🏛️ ACT I: THE ARCHITECTURAL TRIUMVIRATE

Doom commands not one fragile monolith, but **Three Autonomous Bastions**:

### 1. The Public Realm (`client/`) — `yourname.dev`
- **Weaponry:** Next.js (App Router), React Three Fiber (R3F), Drei, GSAP, Zustand.
- **The Experience:** A dark emerald-and-titanium 3D experience. When mortal eyes hover over a project artifact, the **Iron Mask of Doom** descends (`0.5s`), the **Latverian War Hammer** strikes (`0.4s`) with screen shake and spark bursts, and the mask shatters open (`0.8s`) with glowing green optics to reveal the project details.
- **Imperial Isolation:** Rendered at the edge via Cloudflare Workers with 60-second revalidation cache. If the backend is struck, the public realm remains standing on cached battle records.

### 2. The Imperial Sanctum (`admin/`) — `admin.yourname.dev`
- **Weaponry:** React + Vite, React Query, React Hook Form, Zod.
- **Double-Lock Gate:** Before an intruder can even glimpse the login form, **Cloudflare Zero Trust Access** demands identity verification via an imperial email PIN. Only then does the application login gate open.
- **Autonomous Caching:** React Query eliminates stale state, invalidating queries the instant content is forged or modified.

### 3. The Central Engine (`server/`) — `api.yourname.dev`
- **Weaponry:** Node.js 20 LTS, Express, Mongoose, Zod.
- **Stateless Might:** The API stores no sessions in memory and zero files on local disk. If an EC2 container falls, another rises instantly from the Docker registry without data loss.

---

## 🛡️ ACT II: THE IMPENETRABLE DEFENSE (SECURITY LAYERS)

Doom does not rely on a single shield. Attackers must pierce **Four Rings of Steel**:

| Defense Ring | Mechanism | The Doom Doctrine |
| :--- | :--- | :--- |
| **Ring 1: Cloudflare Edge** | WAF, Managed Bot Rules, Edge Rate Limiter | Repels script kiddies and scrapers before a single packet approaches the server. |
| **Ring 2: Zero-Port Tunnel** | `cloudflared` outbound tunnel daemon | **Zero inbound ports (No 80, No 443, No 22 SSH).** Port scans against the server return void. Direct-to-IP assaults find absolute nothingness. |
| **Ring 3: Express Hardening** | Helmet, CORS Whitelist, Mongo Sanitize, Strict Rate Limits | Secures HTTP headers, prevents NoSQL operator injection, rejects cross-origin interlopers. |
| **Ring 4: Data Validation** | Strict Zod Contracts (`.strict()`) + Mongoose Constraints | Rejects malformed payloads and mass-assignment attacks before controllers execute. |

---

## ⚡ ACT III: THE ARSENAL (TECH STACK MATRIX)

```text
┌─────────────────┬──────────────────────────────────┬──────────────────────────────────────────┐
│ DOMAIN          │ TECHNOLOGY                       │ DOOM'S STRATEGIC JUSTIFICATION           │
├─────────────────┼──────────────────────────────────┼──────────────────────────────────────────┤
│ Public Frontend │ Next.js 14 + R3F + GSAP + Zustand│ SSR for search engine dominance; 3D GLTF │
│ Admin Console   │ React + Vite + TanStack Query    │ Near-instant HMR; automatic query refresh│
│ Engine / API    │ Express + Node 20 + Mongoose     │ Lightweight, high-throughput REST API    │
│ Secret Citadels │ MongoDB Atlas M0 + Cloudinary    │ Free, geo-redundant data & media storage │
│ Bastion Shell   │ Docker + Docker Compose          │ Immutable environment from lab to cloud  │
│ Cloud Bastion   │ AWS EC2 (ap-south-1) + SSM       │ Headless execution without exposed SSH   │
│ Imperial Edge   │ Cloudflare Workers, Pages, Tunnel│ Absolute origin concealment & edge proxy │
└─────────────────┴──────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 🗝️ ACT IV: THE FOUR SACRED REQUEST PROTOCOLS

1. **Protocol of the Visitor (Read Content):**
   Visitor Browser ➔ Cloudflare Edge ➔ Next.js Server Component ➔ Cached HTTP Fetch (`revalidate: 60`) ➔ Cloudflare Tunnel ➔ Express REST API ➔ MongoDB Atlas ➔ JSON response delivered to client.

2. **Protocol of the Sovereign (Admin Login):**
   Zero Trust PIN validated ➔ POST credentials to `/api/v1/auth/login` ➔ Express verifies `bcrypt` hash (Cost Factor 12) ➔ Issues two hardened `httpOnly`, `Secure`, `SameSite=Strict` cookies (15-min Access, 7-day Refresh).

3. **Protocol of Artifact Ingestion (Media Upload):**
   Admin submits image ➔ Multer memory stream (5MB maximum) ➔ Magic-byte signature verification (disguised `.exe` rejected with 400) ➔ Direct binary stream to Cloudinary ➔ Secure URL & `publicId` inscribed into MongoDB.

4. **Protocol of Token Rebirth (Silent Refresh):**
   Access Token expires ➔ API returns `401 Unauthorized` ➔ Axios interceptor catches 401 in flight ➔ Calls `/api/v1/auth/refresh` exactly once ➔ Server rotates and re-hashes refresh token ➔ New cookies issued ➔ Original request succeeds without UI flicker.

---

## 🎨 ACT V: THE LATVERIAN PALETTE (DESIGN TOKENS)

- **Titanium Armor (Background):** `#1c1f1e`
- **Doom Emerald (Primary):** `#2e5e3e`
- **Arcane Plasma (Glow Green):** `#39ff14`
- **Imperial Sovereign (Gold):** `#c9a227`
- **Monarch Typography:** Cinzel (Headings), Rajdhani / Orbitron (Technical Body).

---

> *"Let lesser developers build fragile monoliths. Doom builds systems that withstand eternity."*
