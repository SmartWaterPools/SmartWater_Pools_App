import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12 mx-auto px-4">
        <div className="space-y-8">
          <div className="text-center mb-10">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground">SmartWater Pools Management System</p>
            <p className="text-sm text-muted-foreground mt-2">Effective Date: February 23, 2026</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Introduction</h2>
            <p>
              Welcome to SmartWater Pools Management System ("SmartWater Pools," "we," "our," or "us"), operated by 
              Smart Water Pools, LLC. We respect your privacy and are committed to protecting your personal data. This 
              privacy policy explains how we collect, use, disclose, and safeguard your information when you use our 
              pool service management platform, including our website, web application, and related services 
              (collectively, the "Service").
            </p>
            <p>
              By using the Service, you agree to the collection and use of information in accordance with this policy. 
              If you do not agree with the terms of this privacy policy, please do not access the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Information We Collect</h2>
            <p>We collect several types of information for various purposes to provide and improve our Service:</p>

            <h3 className="text-xl font-medium mt-4">2.1 Personal Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identity Data:</strong> First name, last name, username, job title, and role within your organization.</li>
              <li><strong>Contact Data:</strong> Email address, phone number, mailing address, and billing address.</li>
              <li><strong>Account Data:</strong> Username, password (stored securely using industry-standard hashing), and account preferences.</li>
              <li><strong>Client Data:</strong> Information about your clients' properties, pool equipment, service history, and maintenance records that you enter into the system.</li>
              <li><strong>Financial Data:</strong> Invoice and estimate information, payment records processed through Stripe, and billing history.</li>
            </ul>

            <h3 className="text-xl font-medium mt-4">2.2 Technical Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Internet protocol (IP) address</li>
              <li>Browser type and version</li>
              <li>Device type and operating system</li>
              <li>Time zone setting and location data</li>
              <li>Usage patterns and interaction data within the Service</li>
            </ul>

            <h3 className="text-xl font-medium mt-4">2.3 Third-Party Account Data</h3>
            <p>
              When you connect third-party services (such as Google), we may receive information from those services 
              as described in Section 4.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and manage your user account and organization.</li>
              <li>To provide pool service management features, including scheduling, route planning, work orders, and maintenance tracking.</li>
              <li>To process invoices, estimates, and payments through our integrated payment system.</li>
              <li>To facilitate communication between your team, technicians, and clients via email and SMS.</li>
              <li>To synchronize your calendar and email with connected third-party services.</li>
              <li>To generate business reports and analytics for your organization.</li>
              <li>To improve, maintain, and optimize the Service.</li>
              <li>To send you important updates about the Service, including security alerts and policy changes.</li>
              <li>To comply with legal obligations and enforce our terms of service.</li>
            </ul>
          </section>

          <section className="space-y-4 bg-muted/50 p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold">4. Google API Services — Limited Use Disclosure</h2>
            <p>
              SmartWater Pools integrates with Google services to enhance your experience. Our use and transfer of 
              information received from Google APIs adheres to the{" "}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>

            <h3 className="text-xl font-medium mt-4">4.1 Google Sign-In</h3>
            <p>
              When you choose to sign in with Google, we receive your name, email address, and profile picture from 
              your Google account. This information is used solely to create and manage your SmartWater Pools account 
              and to authenticate your identity.
            </p>

            <h3 className="text-xl font-medium mt-4">4.2 Google Gmail Integration</h3>
            <p>
              If you choose to connect your Gmail account, the Service may access your Gmail data to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send emails on your behalf to clients and team members related to pool service operations.</li>
              <li>Read and display email correspondence related to your pool service clients within the Service.</li>
              <li>Sync email communications for centralized client communication management.</li>
            </ul>
            <p className="font-medium mt-2">
              We do not use Gmail data for advertising purposes. Gmail data is only used to provide and improve the 
              email communication features within SmartWater Pools. We do not allow humans to read your email data 
              unless you provide explicit consent, it is necessary for security purposes (such as investigating abuse), 
              or it is required by law.
            </p>

            <h3 className="text-xl font-medium mt-4">4.3 Google Calendar Integration</h3>
            <p>
              If you choose to connect your Google Calendar, the Service may access your calendar data to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Synchronize pool service appointments, maintenance schedules, and work orders with your Google Calendar.</li>
              <li>Create and update calendar events for scheduled services and technician dispatches.</li>
              <li>Display your availability and scheduled service events within the Service.</li>
            </ul>
            <p className="font-medium mt-2">
              Calendar data is used solely for scheduling and coordination purposes within the SmartWater Pools platform.
            </p>

            <h3 className="text-xl font-medium mt-4">4.4 Limited Use Compliance</h3>
            <p>
              Our use of data received from Google APIs is limited to the practices disclosed in this privacy policy. 
              Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We only use Google user data to provide or improve user-facing features that are prominent in our application's user interface.</li>
              <li>We do not transfer Google user data to third parties unless necessary to provide or improve user-facing features, for security purposes, or to comply with applicable laws.</li>
              <li>We do not use Google user data for serving advertisements.</li>
              <li>We do not allow humans to read Google user data unless we have your affirmative agreement, it is necessary for security purposes, or it is required by law.</li>
            </ul>

            <h3 className="text-xl font-medium mt-4">4.5 Revoking Google Access</h3>
            <p>
              You can revoke SmartWater Pools' access to your Google data at any time by visiting your{" "}
              <a 
                href="https://myaccount.google.com/permissions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Account Permissions
              </a>{" "}
              page. You may also contact us to request removal of any Google data we have stored.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Payment Processing</h2>
            <p>
              We use Stripe as our payment processor. When you make or receive payments through the Service, your 
              payment information is collected and processed directly by Stripe in accordance with their{" "}
              <a 
                href="https://stripe.com/privacy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Privacy Policy
              </a>
              . We do not store your full credit card number, expiration date, or CVV on our servers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Data Sharing and Disclosure</h2>
            <p>We may share your information in the following situations:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Within Your Organization:</strong> Data you enter may be visible to other authorized users within your organization based on role permissions.</li>
              <li><strong>Service Providers:</strong> We share data with trusted third-party service providers who assist us in operating our platform (e.g., hosting, payment processing, email delivery).</li>
              <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid legal requests by public authorities.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, your personal data may be transferred as part of the transaction.</li>
            </ul>
            <p>
              We do not sell your personal information to third parties. We do not share your data with third parties 
              for their direct marketing purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal data, 
              including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit using TLS/SSL protocols.</li>
              <li>Secure password hashing using industry-standard algorithms.</li>
              <li>Role-based access controls to limit data access to authorized personnel.</li>
              <li>Regular security assessments and monitoring.</li>
            </ul>
            <p>
              While we strive to protect your personal information, no method of transmission over the Internet or 
              method of electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Data Retention</h2>
            <p>
              We retain your personal data only for as long as necessary to fulfill the purposes for which it was 
              collected, including to satisfy any legal, accounting, or reporting requirements. When your data is no 
              longer needed, we will securely delete or anonymize it.
            </p>
            <p>
              If you request deletion of your account, we will delete or anonymize your personal data within 30 days, 
              unless we are required to retain certain data for legal or compliance purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Your Rights</h2>
            <p>
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data.</li>
              <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> Object to certain types of processing of your personal data.</li>
              <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances.</li>
              <li><strong>Withdraw Consent:</strong> Withdraw your consent at any time where we rely on consent for processing.</li>
            </ul>
            <p>
              To exercise any of these rights, please contact us using the information provided below.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Children's Privacy</h2>
            <p>
              Our Service is not directed to individuals under the age of 18. We do not knowingly collect personal 
              information from children under 18. If we become aware that we have collected personal data from a child 
              under 18, we will take steps to delete that information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any material changes by 
              posting the new privacy policy on this page and updating the "Effective Date" at the top. We encourage 
              you to review this privacy policy periodically for any changes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, your personal data, or wish to exercise your 
              rights, please contact us at:
            </p>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold">Smart Water Pools, LLC</p>
              <p><strong>Email:</strong> travis@smartwaterpools.com</p>
              <p><strong>Website:</strong> smartwaterpools.com</p>
            </div>
          </section>

          <div className="pt-6 border-t flex items-center justify-between">
            <Link to="/" className="text-primary hover:underline flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to home page
            </Link>
            <Link to="/terms-of-service" className="text-primary hover:underline">
              Terms of Service &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
