import time
from typing import List, Dict
from api.models import Email, Account

# Mock accounts list
MOCK_ACCOUNTS: List[Account] = [
    Account(id="gmail", name="Alex Rivers (Gmail)", type="gmail", email="alex.dev@gmail.com"),
    Account(id="office365", name="Alex Rivers (Work)", type="office365", email="alex.rivers@microsoft.com"),
    Account(id="imap", name="Alex Rivers (Personal Yahoo)", type="imap", email="alex.personal@yahoo.com")
]

# Generate ISO relative dates to keep mock data current
def get_iso_date(offset_hours: float) -> str:
    # returns ISO 8601 string for current time minus offset_hours
    t = time.time() - (offset_hours * 3600)
    # format as YYYY-MM-DDTHH:MM:SSZ
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t))

MOCK_EMAILS: List[Email] = [
    # GMAIL - High Priority
    Email(
        id="gm-1",
        accountId="gmail",
        fromEmail="investors@ventures.com",
        fromName="Sarah Jenkins (Ventures VC)",
        toEmail="alex.dev@gmail.com",
        subject="URGENT: Term Sheet & Funding Review for AuraMail",
        body="Hi Alex,\n\nI hope you are doing well. Our investment committee completed the review of AuraMail's seed round. We are extremely excited and have finalized the term sheet.\n\nPlease review the attached document and let us know if we can hop on a call today at 3:00 PM EST to sign. This term sheet will expire in 24 hours.\n\nBest,\nSarah Jenkins\nManaging Partner, Ventures VC",
        date=get_iso_date(0.5),
        folder="inbox",
        labels=["Work", "Investments"],
        read=False,
        priority="high",
        priorityReason="Contains an urgent request for term sheet signature with a 24-hour expiration deadline.",
        summary="Sarah Jenkins from Ventures VC sent the finalized term sheet for AuraMail's seed round. She requests a review and a call today at 3:00 PM EST, noting that the document expires in 24 hours."
    ),
    Email(
        id="gm-2",
        accountId="gmail",
        fromEmail="monitoring@aws.amazon.com",
        fromName="AWS Alert System",
        toEmail="alex.dev@gmail.com",
        subject="CRITICAL ALERT: Production Database CPU Usage > 95%",
        body="Dear AWS Customer,\n\nYou are receiving this notification because the CloudWatch Alarm 'Prod-DB-CPU-Utilization' in region us-east-1 has crossed the threshold of 95% CPU utilization for 3 consecutive evaluation periods.\n\nDatabase Instance ID: db-auramail-prod-01\nCurrent Utilization: 98.4%\nTrigger Time: today\n\nPlease investigate immediately to prevent service disruption.\n\nAWS CloudWatch Team",
        date=get_iso_date(1.2),
        folder="inbox",
        labels=["System", "Ops"],
        read=False,
        priority="high",
        priorityReason="Production outage warning: Database CPU usage has spiked to 98.4%, threatening system stability.",
        summary="An automated AWS system alert reports that the production database CPU usage has exceeded 95% (currently at 98.4%) for us-east-1, requesting immediate intervention to avoid service downtime."
    ),
    
    # GMAIL - Medium Priority
    Email(
        id="gm-3",
        accountId="gmail",
        fromEmail="notifications@github.com",
        fromName="GitHub (AuraMail Repo)",
        toEmail="alex.dev@gmail.com",
        subject="[GitHub] Pull Request #14 Opened: Feature / PWA Caching Layer",
        body="Hey alex-dev,\n\n@dev-lin has opened a new Pull Request: #14 'Feature / PWA Caching Layer'.\n\nDescription:\n- Added custom Service Worker with standard asset caching.\n- Added offline fallback page.\n- Handled basic fetch intercepts.\n\nPlease review the code changes and approve the merge.\n\n---\nReply to this email directly or view it on GitHub.",
        date=get_iso_date(4.0),
        folder="inbox",
        labels=["Updates", "GitHub"],
        read=True,
        priority="medium",
        priorityReason="Standard GitHub Pull Request review request from a collaborator, not blocking an active outage.",
        summary="Lin opened PR #14 for the PWA Caching Layer in the AuraMail repo. The PR adds custom service worker caching and offline fallbacks, requesting Alex's review."
    ),
    Email(
        id="gm-4",
        accountId="gmail",
        fromEmail="hello@indiehackers.com",
        fromName="Indie Hackers Newsletter",
        toEmail="alex.dev@gmail.com",
        subject="How this solo founder hit $20k MRR in 6 months using AI agents",
        body="Hey Indie Hackers,\n\nToday we have an interview with Marcus, a solo developer who built 'AgenticFlow' and scaled it to $20,000 MRR in just half a year. He shares:\n- How he leveraged LLM agents to write 80% of his boilerplate code.\n- His strategy for finding his first 100 customers on Reddit.\n- The exact stack he used (hint: FastAPI, Next.js, and Vercel).\n\nCheck out the full post on the site!\n\nCourtland Allen",
        date=get_iso_date(24.0),
        folder="inbox",
        labels=["Newsletter"],
        read=True,
        priority="low",
        priorityReason="Promotional newsletter content containing general tech stories rather than personalized communication.",
        summary="A newsletter from Indie Hackers featuring a case study of a solo developer who scaled an AI agent tool to $20k MRR in 6 months using Next.js and FastAPI."
    ),

    # OFFICE 365 (Work) - High Priority
    Email(
        id="of-1",
        accountId="office365",
        fromEmail="david.harris@microsoft.com",
        fromName="David Harris (VP of Engineering)",
        toEmail="alex.rivers@microsoft.com",
        subject="URGENT: Executive Review Deck for Q3 Strategy",
        body="Hi Alex,\n\nI need your team's slides for the Q3 Strategy Review deck by 9:00 AM tomorrow. \n\nWe need to present our roadmap for incorporating agentic workflows into our email services. If we don't have this ready, we risk losing our budget allocation for the next fiscal year.\n\nPlease drop the link in the shared SharePoint folder as soon as you can.\n\nThanks,\nDavid",
        date=get_iso_date(0.8),
        folder="inbox",
        labels=["Work", "Strategy"],
        read=False,
        priority="high",
        priorityReason="VP requests Q3 slide deck input by tomorrow morning, stating budget allocation is at risk.",
        summary="VP David Harris requests Alex's roadmap slides for the Q3 Strategy Review deck by 9:00 AM tomorrow, warning that delay may threaten the team's budget allocation."
    ),
    Email(
        id="of-2",
        accountId="office365",
        fromEmail="hr-benefits@microsoft.com",
        fromName="Microsoft HR Benefits",
        toEmail="alex.rivers@microsoft.com",
        subject="ACTION REQUIRED: Open Enrollment Deadline is this Friday!",
        body="Dear Alex,\n\nThis is a reminder that the annual benefits open enrollment period ends this Friday, July 3rd, at 5:00 PM PST.\n\nIf you do not submit your choices by this time, your current healthcare, dental, and vision coverages will default to the standard plan, and your flexible spending accounts (FSA) will be deactivated.\n\nPlease log on to the internal portal and complete your enrollment today.\n\nMicrosoft HR Team",
        date=get_iso_date(18.0),
        folder="inbox",
        labels=["HR", "Important"],
        read=False,
        priority="high",
        priorityReason="Time-sensitive HR warning: Health benefits enrollment expires this Friday.",
        summary="HR warns that the annual benefits open enrollment closes this Friday. Failure to submit choices will reset coverages to default plans and deactivate FSAs."
    ),

    # OFFICE 365 (Work) - Medium & Low Priority
    Email(
        id="of-3",
        accountId="office365",
        fromEmail="jira@microsoft.atlassian.net",
        fromName="Jira Cloud Service",
        toEmail="alex.rivers@microsoft.com",
        subject="[Jira] (AURA-410) Task assigned to you: Implement OAuth client credential flow",
        body="David Harris assigned you task AURA-410:\n\n'Implement OAuth client credential flow for external API integrations.'\n\nStatus: To Do\nPriority: Medium\nDue Date: Next Friday\n\nComments:\n'Alex, please look into this so we can unblock the front-end team.'",
        date=get_iso_date(6.5),
        folder="inbox",
        labels=["Jira", "Task"],
        read=False,
        priority="medium",
        priorityReason="Standard Jira ticket assignment with a deadline of next Friday.",
        summary="David Harris assigned Jira task AURA-410 (OAuth client credential flow implementation) to Alex, scheduled for completion by next Friday."
    ),
    Email(
        id="of-4",
        accountId="office365",
        fromEmail="facilities-wa@microsoft.com",
        fromName="Redmond Campus Facilities",
        toEmail="alex.rivers@microsoft.com",
        subject="Campus Advisory: Building 34 elevator maintenance schedules",
        body="Hello Redmond Campus Residents,\n\nPlease be advised that Elevator B in Building 34 will be closed for routine safety inspections and cable maintenance from Wednesday morning through Thursday evening.\n\nElevator A will remain fully operational. Please plan your routes accordingly.\n\nThank you,\nRedmond Campus Facilities",
        date=get_iso_date(36.0),
        folder="inbox",
        labels=["Campus"],
        read=True,
        priority="low",
        priorityReason="General facility notification about elevator maintenance on campus, does not require action.",
        summary="Facilities informs campus residents that Elevator B in Building 34 will be closed for maintenance from Wednesday morning to Thursday evening."
    ),

    # IMAP (Yahoo Personal)
    Email(
        id="im-1",
        accountId="imap",
        fromEmail="mom@yahoo.com",
        fromName="Mom",
        toEmail="alex.personal@yahoo.com",
        subject="Re: Sunday dinner plans?",
        body="Hi sweetie,\n\nJust checking in to see if you are still coming over for dinner this Sunday. I'm planning to make your favorite lasagna.\n\nLet me know if you can bring some garlic bread from that bakery you like. Also, let me know if you are bringing any friends!\n\nLove,\nMom",
        date=get_iso_date(3.0),
        folder="inbox",
        labels=["Personal", "Family"],
        read=False,
        priority="high",
        priorityReason="Personal family email asking for dinner RSVP plans this Sunday.",
        summary="Mom is checking if Alex is coming for Sunday dinner, planning to make lasagna, and asks him to bring garlic bread and confirm any guests."
    ),
    Email(
        id="im-2",
        accountId="imap",
        fromEmail="support@netflix.com",
        fromName="Netflix",
        toEmail="alex.personal@yahoo.com",
        subject="Your membership plan has been updated successfully",
        body="Dear Alex,\n\nThis email confirms that your subscription has been successfully updated to the Premium Ultra HD plan ($22.99/month), starting today.\n\nYour next billing date is July 28th. If you did not make this change, please reset your password and contact support immediately.\n\nHappy Streaming!\nThe Netflix Team",
        date=get_iso_date(8.0),
        folder="inbox",
        labels=["Receipts", "Personal"],
        read=True,
        priority="medium",
        priorityReason="Account receipt confirmation. Important to review for security, but requires no action if expected.",
        summary="Netflix confirms Alex's plan upgrade to Premium Ultra HD for $22.99/month, noting the next billing cycle begins July 28th."
    ),
    Email(
        id="im-3",
        accountId="imap",
        fromEmail="noreply@uber.com",
        fromName="Uber Receipts",
        toEmail="alex.personal@yahoo.com",
        subject="Your ride receipt with Uber from yesterday",
        body="Thanks for riding, Alex!\n\nHere is your receipt for your ride from Seattle Downtown to Redmond on June 27th.\n\nFare: $34.50\nTip: $5.00\nTotal Charged: $39.50\nPayment Method: Visa ending in 4321\n\nWe hope you had a 5-star experience!",
        date=get_iso_date(16.0),
        folder="inbox",
        labels=["Receipts"],
        read=True,
        priority="low",
        priorityReason="Standard transactional ride receipt from yesterday.",
        summary="Uber receipt for Alex's ride from downtown Seattle to Redmond yesterday, totaling $39.50 (including a $5.00 tip) charged to Visa."
    ),
    Email(
        id="im-4",
        accountId="imap",
        fromEmail="offers@costco.com",
        fromName="Costco Wholesale",
        toEmail="alex.personal@yahoo.com",
        subject="July Member-Only Savings: Deals on electronics, home & garden!",
        body="Costco Member,\n\nExplore our hot summer warehouse savings active from July 1st through July 26th!\n- Save $150 on Apple MacBook Air 13\"\n- Save $80 on Dyson V8 Cordless Vacuum\n- Buy 2 packages of Kirkland Signature beef patties, get 1 free!\n\nVisit your local warehouse or shop online today!",
        date=get_iso_date(48.0),
        folder="inbox",
        labels=["Deals"],
        read=True,
        priority="low",
        priorityReason="Bulk commercial advertisement containing promotional flyers.",
        summary="Costco advertisement for member-only warehouse savings on select electronics, vacuums, and groceries active throughout July."
    ),
    
    # Mock Archived & Sent Emails
    Email(
        id="gm-sent-1",
        accountId="gmail",
        fromEmail="alex.dev@gmail.com",
        fromName="Alex Rivers",
        toEmail="investors@ventures.com",
        subject="Re: Term Sheet & Funding Review for AuraMail",
        body="Hi Sarah,\n\nThanks for sending over the terms! I will review them with my co-founder and legal counsel. The 3:00 PM call works perfectly for me. Talk soon!\n\nBest,\nAlex",
        date=get_iso_date(0.4),
        folder="sent",
        labels=["Work"],
        read=True,
        priority="medium",
        summary="Alex replied to Sarah Jenkins, accepting the 3:00 PM call and stating he will review the funding terms with counsel."
    ),
    Email(
        id="gm-arch-1",
        accountId="gmail",
        fromEmail="support@github.com",
        fromName="GitHub Support",
        toEmail="alex.dev@gmail.com",
        subject="Ticket #99420: MFA setup verification success",
        body="Hello alex-dev,\n\nThis is to confirm that your Multi-Factor Authentication has been successfully updated on your GitHub account. This ticket is now resolved.\n\nGitHub Support Team",
        date=get_iso_date(72.0),
        folder="archived",
        labels=["System"],
        read=True,
        priority="low",
        summary="GitHub support confirms that Alex's Multi-Factor Authentication was successfully set up and resolves ticket #99420."
    )
]

# Simple state simulator in python (in-memory db)
class MockDatabase:
    def __init__(self):
        self.emails = {e.id: e for e in MOCK_EMAILS}
        self.accounts = MOCK_ACCOUNTS

    def get_accounts(self) -> List[Account]:
        return self.accounts

    def get_emails(self, account_id: Optional[str] = None, folder: Optional[str] = None, q: Optional[str] = None) -> List[Email]:
        filtered = list(self.emails.values())
        
        # Filter by account (if not "all")
        if account_id and account_id != "all":
            filtered = [e for e in filtered if e.accountId == account_id]
            
        # Filter by folder
        if folder:
            filtered = [e for e in filtered if e.folder == folder]
            
        # Filter by search query
        if q:
            q_lower = q.lower()
            filtered = [
                e for e in filtered
                if q_lower in e.subject.lower()
                or q_lower in e.body.lower()
                or q_lower in e.fromEmail.lower()
                or q_lower in e.fromName.lower()
            ]
            
        # Sort by date descending
        filtered.sort(key=lambda x: x.date, reverse=True)
        return filtered

    def get_email_by_id(self, email_id: str) -> Optional[Email]:
        return self.emails.get(email_id)

    def add_email(self, email: Email):
        self.emails[email.id] = email

    def update_email_folder(self, email_ids: List[str], folder: str) -> bool:
        for eid in email_ids:
            if eid in self.emails:
                self.emails[eid].folder = folder
        return True

    def mark_emails_read_status(self, email_ids: List[str], read: bool) -> bool:
        for eid in email_ids:
            if eid in self.emails:
                self.emails[eid].read = read
        return True

    def update_email_labels(self, email_ids: List[str], label: str, action: str) -> bool:
        for eid in email_ids:
            if eid in self.emails:
                email = self.emails[eid]
                if action == "add":
                    if label not in email.labels:
                        email.labels.append(label)
                elif action == "remove":
                    if label in email.labels:
                        email.labels.remove(label)
        return True

db = MockDatabase()
