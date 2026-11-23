/**
 * HariCart Privacy Policy and Terms & Conditions.
 *
 * ►► OWNER: fill in the empty values in LEGAL_INFO before publishing on the Play Store. ◄◄
 * Lines whose value is empty are simply hidden on the page, so nothing like "[Your email]" is ever shown.
 *
 * The text describes what this app really does (phone OTP login, block/flat address, orders,
 * delivery partners, cash/UPI payments, home-service requests). If you add a new feature that
 * collects new information (for example GPS location or card payments), update this file too.
 */

export type LegalInfo = { appName: string; businessName: string; society: string; address: string; supportEmail: string; supportPhone: string; grievanceOfficer: string; website: string; effectiveDate: string };

export const LEGAL_INFO: LegalInfo = {
  appName: "HariCart",
  /** Your registered business name or your full name as the owner, e.g. "HariCart (Rameshwar …)". */
  businessName: "",
  /** Society the service is limited to. */
  society: "GreenGate Residences",
  address: "Lucknow, Uttar Pradesh, India",
  /** e.g. "support@yourdomain.com" */
  supportEmail: "",
  /** e.g. "+91 98765 43210" */
  supportPhone: "",
  /** Person who handles privacy complaints (Grievance Officer). Can be you. */
  grievanceOfficer: "",
  website: "https://haricart.onrender.com",
  effectiveDate: "23 November 2026",
};

/** Shown in this order: paragraphs, then bullets, then notes. */
export type LegalSection = { id: string; title: string; paragraphs?: string[]; bullets?: string[]; notes?: string[] };
export type LegalDocument = { kind: "privacy" | "terms"; title: string; intro: string; sections: LegalSection[] };

const app = LEGAL_INFO.appName;

export const PRIVACY_POLICY: LegalDocument = {
  kind: "privacy",
  title: "Privacy Policy",
  intro: `${app} is a private grocery and home-essentials delivery service for residents of ${LEGAL_INFO.society}. This Privacy Policy explains what information we collect, why we collect it, who we share it with, and the choices you have. You can read it without logging in.`,
  sections: [
    {
      id: "collect",
      title: "1. Information we collect",
      bullets: [
        "Account details: your mobile number, your name (if you give it), and your block, flat number and society.",
        "Login details: a one-time password (OTP) is sent to your mobile number to confirm it is yours. We do not store the OTP itself.",
        "Order details: the items you order, quantities, prices, order times, delivery status, cancellation reasons and return or exchange requests.",
        "Payment details: the payment method you choose (Cash on Delivery, UPI or pay after delivery) and whether the payment is pending, paid or refunded. We do not collect or store card numbers, UPI PINs or bank passwords.",
        "Home-service requests: if you ask for an electrician, plumber, tutor, fitness trainer or car/bike service, we collect the service type, your phone number, block and flat, and the problem you describe.",
        "Technical information: a login cookie that keeps you signed in, your device's IP address (used to stop misuse such as too many OTP requests, and recorded in security logs), and small settings saved in your browser, such as your basket and alarm preferences.",
      ],
      notes: [`${app} does not collect your GPS location, contacts, photos, messages or files from your phone.`],
    },
    {
      id: "use",
      title: "2. How we use your information",
      bullets: [
        "To create your account and confirm your mobile number with OTP.",
        "To check that you are a resident of the society we serve.",
        "To prepare, deliver and track your orders, and to send you order updates.",
        "To record payments and process refunds.",
        "To pass your home-service request to the right service person.",
        "To provide customer support and answer your requests.",
        "To keep the service safe: stopping fake orders, misuse and unauthorised access.",
        "To meet legal, tax and accounting requirements.",
      ],
      notes: ["We do not use your information for advertising, and we do not sell it to anyone."],
    },
    {
      id: "share",
      title: "3. Who we share information with",
      paragraphs: ["We share only what is needed for the purpose:"],
      bullets: [
        "Delivery partners: the delivery partner assigned to your order sees your name, block and flat, the items and the payment status. Your phone number is shown to them only while the order is with them, so they can call you if needed. It is hidden again after the order is delivered or cancelled.",
        "Shop partners: the shop preparing your order sees the order details and your flat number.",
        "OTP service: your mobile number is sent to our SMS/OTP provider (Google Firebase Authentication) to deliver the login code.",
        "Hosting and database providers: our servers and database are run by cloud companies (currently Render and TiDB Cloud). Your data may be stored on servers outside India, for example in Singapore, with security protections in place.",
        "Payment providers: if an online payment option is used, the payment company processes the payment under its own privacy terms.",
        "When required by law: if a court, the police or another government authority lawfully asks for it.",
      ],
    },
    {
      id: "security",
      title: "4. How we protect your information",
      bullets: [
        "Login is protected by OTP and a secure, signed login cookie.",
        "Every request is checked on our server, so each person can see only what their role allows. A customer sees only their own orders. A delivery partner sees only the orders given to them.",
        "Staff accounts (owner, shop and delivery partners) are created only by the owner and can be suspended at once.",
        "Logins and important staff actions are recorded in a security log.",
        "Data is sent over encrypted (HTTPS) connections.",
      ],
      notes: ["No online system is 100% secure, but we work to protect your information and will inform you and the authorities as required by law if a data breach affects you."],
    },
    {
      id: "retention",
      title: "5. How long we keep information",
      bullets: [
        "Account details: while your account is active, and until you ask us to delete it.",
        "Order and payment records: for as long as tax and accounting laws require, even after your account is deleted. Where possible, we keep these records without your name and phone number.",
        "Security logs: generally for at least one year, to protect the service and meet legal requirements.",
      ],
    },
    {
      id: "rights",
      title: "6. Your rights and choices",
      paragraphs: ["Under Indian law, including the Digital Personal Data Protection Act, 2023, you can ask us to:"],
      bullets: [
        "Tell you what personal information we hold about you.",
        "Correct or update wrong information. You can also change your block and flat yourself in the app.",
        "Delete your account and personal information (see “Delete your account” below).",
        "Withdraw your consent. If you withdraw consent, we may not be able to deliver orders to you.",
        "Nominate another person to use these rights for you if you die or become unable to use them.",
      ],
      notes: ["We may ask you to confirm your mobile number with OTP before acting on a request, so that nobody else can make requests about your account."],
    },
    {
      id: "children",
      title: "7. Children",
      paragraphs: [`${app} is meant for adults (18 years or older) who order for their household. Children should not create an account. If you believe a child has given us their information, please contact us and we will delete it.`],
    },
    {
      id: "cookies",
      title: "8. Cookies and browser storage",
      paragraphs: [`${app} uses only essential cookies and browser storage: a login cookie to keep you signed in, and small saved settings such as your basket and notification preferences. We do not use advertising or tracking cookies.`],
    },
    {
      id: "grievance",
      title: "9. Complaints (Grievance Officer)",
      paragraphs: [
        "If you have a question or complaint about your personal information, contact our Grievance Officer using the details below. We aim to reply within 7 days and to resolve every complaint within 30 days, and never later than 90 days.",
        "If you are not satisfied with our answer, you can complain to the Data Protection Board of India.",
      ],
    },
    {
      id: "changes",
      title: "10. Changes to this policy",
      paragraphs: ["We may update this policy when the app or the law changes. The new version will be shown on this page with a new effective date. If the changes are important, we will also tell you in the app."],
    },
  ],
};

export const TERMS_AND_CONDITIONS: LegalDocument = {
  kind: "terms",
  title: "Terms & Conditions",
  intro: `These Terms & Conditions are the rules for using ${app}. By creating an account or placing an order, you agree to them. Please read them together with our Privacy Policy.`,
  sections: [
    {
      id: "service",
      title: "1. About the service",
      paragraphs: [`${app} delivers groceries, fresh produce and household items to residents of ${LEGAL_INFO.society}. It can also pass your request for home services (such as an electrician or plumber) to a service person. Delivery is only available inside the society.`],
    },
    {
      id: "account",
      title: "2. Your account",
      bullets: [
        "You must be 18 or older and a resident of the society to create an account.",
        "One account per mobile number. You log in with an OTP sent to that number.",
        "Give us your correct block and flat number. Orders are delivered only to the flat saved in your account.",
        "Keep your phone and OTP private. Never share your OTP with anyone, including people who say they work for us.",
        "We may suspend or close an account that gives false details, places fake orders or misuses the service.",
      ],
    },
    {
      id: "orders",
      title: "3. Orders and prices",
      bullets: [
        "Prices, offers and availability are shown in the app and can change at any time. The price you pay is the price shown when you place the order.",
        "An order is accepted when the shop confirms it. The shop may refuse or cancel an order, for example if the market is closed or an item is not available.",
        "If an item turns out to be out of stock, the shop will remove it from your order and you will see the new total. If no items are left, the order is cancelled.",
        "Product photos are for reference. Fresh items like fruits and vegetables can vary a little in size, colour and weight.",
      ],
    },
    {
      id: "payment",
      title: "4. Payment",
      bullets: [
        "You can pay by Cash on Delivery, by UPI, or by paying after delivery, depending on what the app offers for your order.",
        "For Cash on Delivery, please pay the delivery partner the full amount when the order arrives.",
        "We will never ask for your UPI PIN, card PIN, OTP or bank password.",
      ],
    },
    {
      id: "delivery",
      title: "5. Delivery",
      bullets: [
        "Delivery times shown in the app are estimates, not guarantees. Traffic inside the society, stock and staff availability can cause delays.",
        "Please make sure someone is available at your flat to receive the order. If nobody is available, the delivery partner may try again or the order may be cancelled.",
        "Please treat delivery partners and staff with respect. Abusive behaviour can lead to your account being closed.",
      ],
    },
    {
      id: "cancel",
      title: "6. Cancellation and refunds",
      bullets: [
        "You can cancel an order from My Orders while it is Placed or Confirmed. Once it is packed or out for delivery, it can no longer be cancelled in the app. Please call the shop.",
        "If you have already paid for an order or item that is cancelled or removed, we will refund that amount, usually within 7 working days, to the original payment method or as agreed with you.",
      ],
    },
    {
      id: "returns",
      title: "7. Damaged, wrong or missing items",
      paragraphs: ["If an item is damaged, wrong or missing, please report it from My Orders (Exchange / Return) or contact us as soon as possible, preferably within 24 hours of delivery. After checking, we will replace the item or refund it. Items that were used or damaged after delivery may not be accepted."],
    },
    {
      id: "home-services",
      title: "8. Home services",
      paragraphs: [`For home services such as electrician, plumber, tuition, fitness, car or bike service, ${app} passes your request to a service person. The price, timing and quality of the work are agreed between you and the service person. We will help if there is a problem, but we are not responsible for work done by independent service people.`],
    },
    {
      id: "use",
      title: "9. Fair use",
      paragraphs: ["You agree not to:"],
      bullets: [
        "Place fake orders or orders you do not intend to pay for.",
        "Try to access other people's accounts or data, or parts of the app that your account is not allowed to use.",
        "Disturb, copy, overload or attack the app or its servers.",
        "Use the service for anything illegal.",
      ],
    },
    {
      id: "liability",
      title: "10. Limitation of liability",
      paragraphs: [`We work hard to keep ${app} running smoothly, but the service is provided “as is”. As far as the law allows, our total responsibility for any order is limited to the amount you paid for that order. We are not responsible for delays or failures caused by events outside our control, such as network outages, power cuts, extreme weather or government restrictions.`],
    },
    {
      id: "law",
      title: "11. Governing law",
      paragraphs: ["These terms are governed by the laws of India. Any dispute will be handled by the courts of Lucknow, Uttar Pradesh."],
    },
    {
      id: "changes",
      title: "12. Changes to these terms",
      paragraphs: ["We may update these terms from time to time. The latest version will always be on this page. If you keep using the app after a change, it means you accept the new terms."],
    },
  ],
};

/** Contact lines that have been filled in (empty values are not shown). */
export function legalContactLines(): Array<{ label: string; value: string; href?: string }> {
  const lines: Array<{ label: string; value: string; href?: string }> = [];
  if (LEGAL_INFO.businessName) lines.push({ label: "Business", value: LEGAL_INFO.businessName });
  if (LEGAL_INFO.grievanceOfficer) lines.push({ label: "Grievance Officer", value: LEGAL_INFO.grievanceOfficer });
  if (LEGAL_INFO.supportEmail) lines.push({ label: "Email", value: LEGAL_INFO.supportEmail, href: `mailto:${LEGAL_INFO.supportEmail}` });
  if (LEGAL_INFO.supportPhone) lines.push({ label: "Phone", value: LEGAL_INFO.supportPhone, href: `tel:${LEGAL_INFO.supportPhone.replace(/[^+\d]/g, "")}` });
  if (LEGAL_INFO.address) lines.push({ label: "Address", value: LEGAL_INFO.address });
  if (LEGAL_INFO.website) lines.push({ label: "Website", value: LEGAL_INFO.website, href: LEGAL_INFO.website });
  return lines;
}

/** Details the owner still needs to fill in before Play Store submission. */
export function missingLegalDetails(): string[] {
  const missing: string[] = [];
  if (!LEGAL_INFO.businessName) missing.push("businessName");
  if (!LEGAL_INFO.supportEmail) missing.push("supportEmail");
  if (!LEGAL_INFO.supportPhone) missing.push("supportPhone");
  if (!LEGAL_INFO.grievanceOfficer) missing.push("grievanceOfficer");
  return missing;
}