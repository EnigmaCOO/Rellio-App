# Rellio GDPR Compliance Documentation

## Overview

This document outlines Rellio's compliance with the General Data Protection Regulation (GDPR) and other privacy regulations. Rellio is committed to protecting user privacy and giving users control over their personal data.

## Scope

Rellio processes personal data for users accessing our multi-faith spiritual sanctuary platform. This includes:

- User account information
- Reading activity and preferences
- AI chat conversations
- Voice interaction data
- Progress tracking metrics

## Legal Basis for Processing

### Categories of Processing

1. **Contractual Necessity**
   - Account creation and management
   - Service delivery (scripture access, AI chat)
   - Authentication and authorization

2. **Legitimate Interest**
   - Service improvement
   - Security and fraud prevention
   - Analytics and metrics

3. **Consent**
   - Marketing communications
   - Optional feature usage
   - Data sharing with third parties

## Data Collection

### Personal Information

**Account Data**:
- Email address
- Phone number (optional)
- Username
- First and last name (optional)
- Profile image URL (optional)
- Password (hashed, never stored in plain text)

**Activity Data**:
- Scripture reading history
- AI chat messages and context
- Reading sessions and progress
- Voice interaction logs
- Bookmarks and favorites

**Technical Data**:
- IP address (for rate limiting)
- Session tokens
- Browser and device information
- Request logs

### Special Categories

**Religious Beliefs**:
- Reading history may reveal religious preferences
- Chat content may contain spiritual discussions
- **Legal Basis**: Explicit consent + user manifestly made public

## User Rights

### 1. Right to Access (Article 15)

Users can request a copy of their personal data.

**Implementation**:
```
GET /api/gdpr/export
```

Response includes:
- Account information
- Reading history
- Chat messages
- Progress data
- Consent records

**Timeline**: Within 30 days of request

### 2. Right to Rectification (Article 16)

Users can update incorrect personal data.

**Implementation**:
- Profile update endpoints
- Self-service correction
- Support email for assistance

### 3. Right to Erasure (Article 17)

Users can request deletion of their data.

**Implementation**:
```
DELETE /api/gdpr/delete
```

**Process**:
1. User submits deletion request
2. Verification of identity
3. 7-day grace period (revocable)
4. Complete data deletion
5. Confirmation email

**Exceptions**:
- Legal obligation to retain
- Establishment of legal claims
- Public interest in data retention

**Timeline**: Within 30 days of request

### 4. Right to Restriction (Article 18)

Users can restrict processing of their data.

**Implementation**:
- Account suspension (vs deletion)
- Processing limitation flags
- Data export without deletion

### 5. Right to Data Portability (Article 20)

Users can receive their data in machine-readable format.

**Implementation**:
```
GET /api/gdpr/export?format=json
```

**Formats Available**:
- JSON (default)
- CSV (for tabular data)
- PDF (for human-readable report)

### 6. Right to Object (Article 21)

Users can object to certain processing.

**Implementation**:
- Opt-out of analytics
- Disable non-essential features
- Unsubscribe from communications

## Consent Management

### Consent Collection

**Consent Banner**:
- Displayed on first visit
- Clear explanation of data use
- Granular consent options
- Easy to accept or decline

**Database Schema**:
```typescript
table: gdprConsents
- userId: User ID
- region: 'EU' | 'US' | 'other'
- accepted: boolean
- version: Consent version
- consentText: What user agreed to
- createdAt: Timestamp
- updatedAt: Timestamp
```

### Consent Withdrawal

Users can withdraw consent at any time:

```
DELETE /api/gdpr/consent
```

**Effect**:
- Stop non-essential processing
- Remove from analytics
- Disable optional features
- Maintain essential services

## Data Minimization

### Collection Principles

1. **Purpose Limitation**: Only collect data necessary for stated purposes
2. **Storage Limitation**: Don't keep data longer than needed
3. **Accuracy**: Keep data up-to-date

### Optional vs Required

**Required** (service cannot function without):
- Email or phone number
- Username
- Password

**Optional** (user can decline):
- Profile image
- First and last name
- Analytics tracking
- Voice interaction data

## Data Retention

### Retention Periods

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Account data | Active + 12 months | User access |
| Chat messages | 12 months | Service quality |
| Reading sessions | Indefinite (anonymized after 12mo) | Progress tracking |
| Metrics events | 12 months | Analytics |
| Voice sessions | 6 months | Quality improvement |
| Flagged content | 24 months | Moderation |
| GDPR consents | 7 years | Legal obligation |

### Deletion Schedule

Automated deletion runs:
- **Weekly**: Expired sessions
- **Monthly**: Old chat messages (>12 months)
- **Quarterly**: Inactive accounts (>12 months)

## Security Measures

### Technical Safeguards

1. **Encryption**
   - HTTPS/TLS for data in transit
   - Database encryption at rest
   - Hashed passwords (bcrypt)

2. **Access Control**
   - Role-based access
   - Session management
   - Rate limiting

3. **Monitoring**
   - Audit logs
   - Intrusion detection
   - Regular security reviews

See: `SECURITY_P0.md` for details

### Organizational Measures

1. **Staff Training**: GDPR awareness
2. **Policies**: Data handling procedures
3. **Contracts**: DPA with processors
4. **Audits**: Annual compliance review

## Data Processing Agreements (DPA)

### Third-Party Processors

| Provider | Purpose | Data Shared | Location | DPA |
|----------|---------|-------------|----------|-----|
| Neon | Database hosting | All user data | US | ✓ |
| OpenAI | AI chat | Chat messages | US | ✓ |
| XAI | AI chat | Chat messages | US | ✓ |
| ElevenLabs | Text-to-speech | Chat responses | US | ✓ |
| Replit | Infrastructure | All data | US | ✓ |

### Data Transfers

**EU to US Transfers**:
- Standard Contractual Clauses (SCCs)
- Adequacy decisions where available
- Supplementary measures

## Privacy by Design

### Default Settings

- Minimal data collection
- Privacy-friendly defaults
- Opt-in for non-essential features
- Clear privacy controls

### Development Practices

1. **Privacy Impact Assessment (PIA)** before new features
2. **Data Protection Impact Assessment (DPIA)** for high-risk processing
3. **Security testing** for all code changes
4. **Privacy review** in code reviews

## Breach Notification

### Internal Process

1. **Detection**: <1 hour
2. **Assessment**: <24 hours
3. **Containment**: <24 hours
4. **Notification**: <72 hours (if required)

### User Notification

When breach affects user rights:
- Email notification
- In-app notification
- Public disclosure (if required)

**Content**:
- Nature of breach
- Data affected
- Likely consequences
- Measures taken
- Contact point

## Data Protection Officer (DPO)

**Appointed**: Not required (not public authority, not large-scale processing)

**Contact**:
- Email: privacy@rellio.example.com
- Address: [Company Address]

## Supervisory Authority

**Lead Authority**: 
- If EU operations: Relevant EU data protection authority
- If US operations: State-level authorities (varies)

## Cookie Policy

### Cookies Used

**Essential** (no consent required):
- Session cookies (authentication)
- Security tokens
- CSRF protection

**Analytics** (consent required):
- Usage tracking
- Feature engagement
- Error monitoring

**Functionality** (consent required):
- User preferences
- Theme selection
- Language settings

### Cookie Banner

Users can:
- Accept all
- Reject non-essential
- Customize preferences
- Withdraw consent

## Children's Privacy

**Age Requirement**: 13+ years

**Parental Consent**: Required for <16 in EU

**Verification**: Self-declaration (honor system)

**Special Protections**:
- Enhanced privacy defaults
- Limited data collection
- No profiling

## International Compliance

### CCPA (California)

Additional rights:
- Right to know (categories collected)
- Right to delete
- Right to opt-out of sale
- Non-discrimination

**Do Not Sell**: Rellio does not sell personal information

### Other Jurisdictions

- **UK GDPR**: Equivalent to EU GDPR
- **Brazilian LGPD**: Similar requirements
- **Canadian PIPEDA**: Consent and access rights

## Compliance Monitoring

### Regular Reviews

- **Monthly**: Privacy settings audit
- **Quarterly**: DPA compliance check
- **Annually**: Full GDPR audit

### Metrics Tracked

- Consent acceptance rate
- Data access requests
- Deletion requests
- Breach incidents
- Processing complaints

## User Controls

### Privacy Dashboard (Planned)

Located at: `/privacy/dashboard`

**Features**:
- View data collected
- Download data export
- Delete account
- Manage consent
- View processing history
- Update preferences

## Transparency

### Privacy Policy

Available at: `/privacy`

**Includes**:
- Data collected
- Purpose of processing
- Legal basis
- Retention periods
- User rights
- Contact information

**Updates**:
- Version control
- Change notifications
- Acceptance required

## Accountability

### Documentation

- Data processing register
- Privacy impact assessments
- Security incident log
- Consent records
- User requests log

### Audits

- Internal: Quarterly
- External: Annually (planned)
- Penetration testing: Annually (planned)

## Contact & Complaints

### Privacy Questions

Email: privacy@rellio.example.com
Response time: 3 business days

### Complaints

1. Internal: privacy@rellio.example.com
2. Supervisory Authority: Contact details in Privacy Policy

### Data Subject Requests

Submit via:
- Web form: `/privacy/request`
- Email: privacy@rellio.example.com

**Required Information**:
- Identity verification
- Type of request
- Specific data (if applicable)

**Timeline**: 30 days (extendable to 60 if complex)

---

**Last Updated**: October 2025
**Next Review**: January 2026
**Policy Version**: 1.0
