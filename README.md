# Paharadar — Website Security Auditing & Intelligence Platform

<p align="center">
  <strong>Believe in a Safer Web.</strong>
</p>

<p align="center">
  A web-based cybersecurity platform designed to help website owners and developers understand security weaknesses, evaluate their security posture, and explore practical defensive configurations.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Project-Cybersecurity-16a34a?style=for-the-badge" alt="Cybersecurity Project" />
  <img src="https://img.shields.io/badge/Framework-Next.js-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Language-TypeScript-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Status-Prototype-orange?style=for-the-badge" alt="Prototype" />
</p>

---

## Overview

Website security is often difficult to understand for developers, small businesses, and website owners who do not have access to dedicated cybersecurity teams.

Security configurations, HTTP headers, TLS settings, DNS records, and phishing threats can be challenging to evaluate without specialized knowledge.

**Paharadar** aims to make website security assessment more accessible by bringing security auditing, security insights, configuration assistance, and cybersecurity awareness into one platform.

Rather than simply presenting technical information, the platform focuses on organizing security findings into understandable insights that can help users identify potential weaknesses and explore ways to improve their security posture.

## Core Features

### 1. Website Security Scanner

The primary feature of Paharadar is its website security assessment interface.

Users can provide a target website and initiate an assessment to explore different aspects of its security configuration.

Key assessment categories include:

- **TLS & Transport Security:** Evaluation of transport security and certificate-related configurations.
- **HTTP Security Headers:** Inspection of defensive headers and browser security policies.
- **Attack Surface Exposure:** Identification of potentially exposed website resources and configuration details.
- **Email Security:** Examination of DNS-based email protection mechanisms, including SPF and DMARC.
- **Content Security Policy:** Assessment of Content Security Policy configurations.

The results are organized into security scores, passed checks, warnings, and critical findings to make the assessment easier to understand.

### 2. Security Assessment Dashboard

The dashboard provides a centralized view of assessment results.

It helps users understand:

- Overall security assessment scores.
- Critical findings and warnings.
- Successfully passed security checks.
- Different security assessment categories.
- Areas that may require further attention.

### 3. Website Security Comparison

The comparison feature is designed to help users examine differences between website security assessments.

It can help developers understand changes in security posture when comparing different assessment results or configurations.

### 4. Security Configuration & Hardening Tools

Identifying a security weakness is only part of the process. Developers also need practical ways to improve their configurations.

Paharadar includes interactive configuration tools designed to assist with defensive security practices.

These include:

- HTTP security header configuration generation.
- Security policy configuration assistance.
- SPF record generation.
- DMARC record generation.

Users can explore configuration options and generate corresponding configuration outputs.

Generated configurations should always be reviewed and tested before deployment.

### 5. Threat Radar — Phishing Awareness

Threat Radar introduces an interactive cybersecurity awareness component.

It provides phishing-related challenges that encourage users to recognize suspicious messages, URLs, and potential social engineering attempts.

The goal is to make cybersecurity awareness more engaging through practical interaction.

### 6. API Console

The platform also includes an API exploration interface for examining available application functionality and API specifications.

This provides a developer-oriented entry point for understanding how application functionality can be accessed programmatically.

---

## Technology Stack

The project uses the following technologies:

| Technology | Purpose |
|---|---|
| Next.js | Web application framework |
| React | Component-based user interface |
| TypeScript | Type-safe application development |
| CSS / Project styling system | Interface styling and responsive presentation |
| Node.js | JavaScript runtime |

Additional libraries and services are documented in `package.json`.

---

## Project Structure

```text
Paharadar-Project/
│
├── public/                 # Static assets and public resources
│
├── scratch/                # Project development resources
│
├── src/                    # Main application source code
│
├── test/                   # Test-related files
│
├── .gitignore              # Git exclusion rules
├── AGENTS.md               # Project development instructions
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies and scripts
├── package-lock.json       # Dependency lockfile
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

---

## Getting Started

Follow these instructions to run Paharadar locally.

### Prerequisites

Make sure you have installed:

- Node.js (preferably a supported LTS version).
- npm.
- Git.

### 1. Clone the repository

```bash
git clone https://github.com/ZinniOggy/Paharadar-Project-.git
```

### 2. Navigate to the project directory

```bash
cd Paharadar-Project-
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

If the application requires environment variables, create a local `.env.local` file using the variable names documented by the project.

Never commit API keys, database credentials, or other secrets to GitHub.

### 5. Start the development server

```bash
npm run dev
```

### 6. Open the application

Visit:

```text
http://localhost:3000
```

The application should now be accessible through your local browser.

---

## Security & Responsible Use

Paharadar is intended to support defensive security assessment and cybersecurity awareness.

Users should only assess websites and infrastructure that they own or have explicit authorization to test.

Important considerations:

- Security assessment results should be treated as indicators, not guarantees of security.
- A security score does not replace a professional security audit or penetration test.
- Generated configurations should be reviewed before being applied to production systems.
- Assessment results may vary depending on network conditions, target configuration, and available information.

---

## Current Development Scope

Paharadar is being developed as a focused prototype demonstrating how multiple website security and awareness capabilities can be presented through a unified interface.

The current project emphasizes:

- Accessible security assessment workflows.
- Understandable security findings.
- Interactive security configuration assistance.
- Comparative security insights.
- Cybersecurity awareness through practical challenges.

The prototype is not intended to replace enterprise-grade security monitoring platforms or comprehensive penetration-testing tools.

---

## Future Improvements

Potential areas for future development include:

- Expanded security assessment coverage.
- More detailed remediation recommendations.
- Historical assessment tracking.
- Improved comparison and reporting capabilities.
- Additional security configuration templates.
- More comprehensive API documentation.
- Enhanced accessibility and responsive design.
- Integration with additional defensive security tools.

---

## Project Demonstration

A walkthrough demonstration is provided as part of the Credosis Internship Program — Phase 02 submission.

**Repository:**  
https://github.com/ZinniOggy/Paharadar-Project-

**Live Demo:**  
Add your deployed application URL here when available.

**Walkthrough Video:**  
Add your Google Drive or YouTube walkthrough URL here.

---

## Acknowledgements

Developed as part of the Credosis Internship Program — Phase 02: From Idea to Demo.

**Developer:** Moomtahina Ahsan

---

<p align="center">
  <strong>Paharadar — Making Website Security More Understandable.</strong>
</p>
